import { describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	isActionTrustGuarded,
	isActionTrustPermitted,
	registerClassicyUntrustedActionAllowlist,
} from "./ClassicyActionTrust";

/** Minimal but structurally complete store, mirroring the fixture used by
 * ClassicyAppManager.test.ts, so the reducer's real handlers can run. */
function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					// Fixed (not `new Date().toISOString()`) so two independently
					// constructed stores compare deep-equal regardless of timing —
					// needed by the byte-identical-on-rejection assertion below.
					dateTime: "2024-01-01T00:00:00.000Z",
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					dateTimeLocked: false,
					syncTimeOnly: false,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					focusedAppId: "Finder.app",
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: [
								{
									id: "w1",
									closed: false,
									size: [400, 300],
									position: [0, 0],
									minimumSize: [100, 100],
									focused: false,
								},
							],
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
							handlesFileTypes: Object.values(ClassicyFileSystemEntryFileType),
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map((type) => [
							type,
							"Finder.app",
						]),
					) as Record<ClassicyFileSystemEntryFileType, string>,
				},
				Appearance: {
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	} as unknown as ClassicyStore;
}

describe("isActionTrustGuarded / isActionTrustPermitted", () => {
	it("guards ClassicyDesktop* and ClassicyWindow* by prefix", () => {
		expect(isActionTrustGuarded("ClassicyDesktopSetBalloonHelp")).toBe(true);
		expect(isActionTrustGuarded("ClassicyDesktopIconFocus")).toBe(true);
		expect(isActionTrustGuarded("ClassicyWindowFocus")).toBe(true);
	});

	it("guards the exact ClassicyAppFinderEmptyTrash and ClassicyAppHCEditSetScript types", () => {
		expect(isActionTrustGuarded("ClassicyAppFinderEmptyTrash")).toBe(true);
		expect(isActionTrustGuarded("ClassicyAppHCEditSetScript")).toBe(true);
	});

	it("does not guard ordinary ClassicyApp* actions", () => {
		expect(isActionTrustGuarded("ClassicyAppOpen")).toBe(false);
		expect(isActionTrustGuarded("ClassicyAppFinderOpenFile")).toBe(false);
	});

	it("trusted is always permitted; untrusted must clear both the floor and the allowlist", () => {
		expect(isActionTrustPermitted("trusted", "ClassicyWindowFocus")).toBe(true);
		// Guarded route: rejected for untrusted no matter what.
		expect(isActionTrustPermitted("untrusted", "ClassicyWindowFocus")).toBe(
			false,
		);
		// Unguarded AND allowlisted by default: permitted.
		expect(isActionTrustPermitted("untrusted", "ClassicyAppOpen")).toBe(true);
		// Unguarded but NOT allowlisted: still rejected. Clearing the guarded-route
		// floor is necessary but not sufficient — this is what makes the allowlist
		// kernel-enforced rather than merely advisory to call sites.
		expect(
			isActionTrustPermitted("untrusted", "ClassicyAppFinderOpenFile"),
		).toBe(false);
	});
});

describe("classicyDesktopStateEventReducer — trust guard", () => {
	it("dispatch with no trust argument defaults to trusted (existing behavior unchanged)", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopSetBalloonHelp",
			disableBalloonHelp: true,
		});
		expect(ds.System.Manager.Desktop.disableBalloonHelp).toBe(true);
	});

	it("rejects an untrusted ClassicyDesktop* action before classicyDesktopEventHandler runs", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{ type: "ClassicyDesktopSetBalloonHelp", disableBalloonHelp: true },
			"untrusted",
		);
		expect(ds.System.Manager.Desktop.disableBalloonHelp).toBe(false);
	});

	it("rejects an untrusted ClassicyWindow* action before classicyWindowEventHandler runs", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: { id: "w1" },
			},
			"untrusted",
		);
		expect(
			ds.System.Manager.Applications.apps["Finder.app"].windows[0].focused,
		).toBe(false);
	});

	it("a rejected untrusted action leaves state byte-identical (no partial mutation)", () => {
		const before = makeStore();
		const after = makeStore();
		classicyDesktopStateEventReducer(
			after,
			{
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: { id: "w1" },
			},
			"untrusted",
		);
		expect(after).toEqual(before);
	});

	it("warns in non-production and does not throw when rejecting an untrusted action", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: { id: "w1" },
			},
			"untrusted",
		);
		expect(warnSpy).toHaveBeenCalledWith(
			"[ClassicyDesktopStateEventReducer] Rejected untrusted action",
			{ type: "ClassicyWindowFocus" },
		);
		warnSpy.mockRestore();
	});

	it("is silent in production when rejecting an untrusted action", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const ds = makeStore();
			classicyDesktopStateEventReducer(
				ds,
				{
					type: "ClassicyWindowFocus",
					app: { id: "Finder.app" },
					window: { id: "w1" },
				},
				"untrusted",
			);
		} finally {
			process.env.NODE_ENV = original;
		}
		expect(warnSpy).not.toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe("classicyDesktopStateEventReducer — plugin handlers subject to the same guard", () => {
	it("rejects an untrusted ClassicyAppFinderEmptyTrash routed through a plugin handler", () => {
		const handler = vi.fn((ds: ClassicyStore) => ds);
		// Mirrors production wiring: FinderContext self-registers under the
		// "ClassicyAppFinder" prefix via registerAppEventHandler, and
		// ClassicyAppFinderEmptyTrash is routed there — never given its own
		// branch in the reducer. Idempotent no-op if something else in this
		// module already registered the prefix.
		registerAppEventHandler("ClassicyAppFinder", handler);

		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{ type: "ClassicyAppFinderEmptyTrash" },
			"untrusted",
		);

		expect(handler).not.toHaveBeenCalled();
	});

	it("rejects an untrusted ClassicyAppHCEditSetScript routed through a plugin handler", () => {
		const handler = vi.fn((ds: ClassicyStore) => ds);
		registerAppEventHandler("ClassicyAppHCEdit", handler);

		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{ type: "ClassicyAppHCEditSetScript" },
			"untrusted",
		);

		expect(handler).not.toHaveBeenCalled();
	});

	it("still allows a trusted action through the same plugin handler", () => {
		const handler = vi.fn((ds: ClassicyStore) => ds);
		const prefix = `ClassicyAppPluginTrustTest_${Date.now()}`;
		registerAppEventHandler(prefix, handler);

		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{ type: `${prefix}Action` },
			"trusted",
		);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("an untrusted action through an unguarded but NON-allowlisted plugin prefix is rejected", () => {
		const handler = vi.fn((ds: ClassicyStore) => ds);
		const prefix = `ClassicyAppUnguardedTrustTest_${Date.now()}`;
		registerAppEventHandler(prefix, handler);

		const ds = makeStore();
		classicyDesktopStateEventReducer(
			ds,
			{ type: `${prefix}Action` },
			"untrusted",
		);

		// Clearing the guarded-route floor is not enough: the allowlist is
		// enforced in the kernel, so a call site that never consulted it still
		// cannot route untrusted content to a plugin handler.
		expect(handler).not.toHaveBeenCalled();
	});

	it("an untrusted action through an allowlisted plugin prefix does reach the handler", () => {
		const handler = vi.fn((ds: ClassicyStore) => ds);
		const prefix = `ClassicyAppAllowlistedTrustTest_${Date.now()}`;
		const actionType = `${prefix}Action`;
		registerAppEventHandler(prefix, handler);
		registerClassicyUntrustedActionAllowlist(actionType);

		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, { type: actionType }, "untrusted");

		expect(handler).toHaveBeenCalledTimes(1);
	});
});

describe("dispatch — trust defaults through the public API", () => {
	it("dispatch(action) with no trust argument reaches ClassicyWindow* like before (trusted default)", () => {
		dispatch({
			type: "ClassicyWindowOpen",
			app: { id: "Finder.app" },
			window: {
				id: "trust-default-w1",
				position: [0, 0],
				minimumSize: [100, 100],
				size: [200, 200],
			},
		});
		const state = useAppManager.getState();
		const win = state.System.Manager.Applications.apps[
			"Finder.app"
		]?.windows.find((w) => w.id === "trust-default-w1");
		expect(win).toBeDefined();
	});

	it("dispatch(action, 'untrusted') rejects a ClassicyWindow* action end-to-end", () => {
		dispatch(
			{
				type: "ClassicyWindowOpen",
				app: { id: "Finder.app" },
				window: {
					id: "trust-untrusted-w1",
					position: [0, 0],
					minimumSize: [100, 100],
					size: [200, 200],
				},
			},
			"untrusted",
		);
		const state = useAppManager.getState();
		const win = state.System.Manager.Applications.apps[
			"Finder.app"
		]?.windows.find((w) => w.id === "trust-untrusted-w1");
		expect(win).toBeUndefined();
	});
});
