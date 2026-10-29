import { readFileSync } from "node:fs";
import path from "node:path";
import { act, renderHook } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	type ClassicyAppearanceLayout,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	classicyLayoutVars,
	getClassicyAppearanceLayout,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const MIRROR: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-left" },
	menuBar: { placement: "window" },
	desktop: { iconGridOrigin: "top-left" },
};

const registerMirror = () =>
	registerClassicyAppearancePackage({
		id: "mirror",
		name: "Mirror",
		css: "",
		defaults: { ...getTheme("default"), package: "mirror" },
		layout: MIRROR,
	});

const setPackageId = (packageId: string) =>
	useAppManager.setState((state) =>
		produce(state, (draft) => {
			draft.System.Manager.Appearance.packageId = packageId;
		}),
	);

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("CLASSICY_DEFAULT_APPEARANCE_LAYOUT", () => {
	it("is Platinum's arrangement, frozen, and the fallback package's layout", () => {
		expect(CLASSICY_DEFAULT_APPEARANCE_LAYOUT).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		});
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(true);
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT.window)).toBe(
			true,
		);
		expect(CLASSICY_FALLBACK_APPEARANCE_PACKAGE.layout).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		);
	});
});

describe("getClassicyAppearanceLayout", () => {
	it("returns a registered package's layout by id", () => {
		registerMirror();
		expect(getClassicyAppearanceLayout("mirror")).toEqual(MIRROR);
	});

	it("falls back to the default layout for an unregistered id", () =>
		expect(getClassicyAppearanceLayout("irix")).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		));

	it("reads the active package from the store when no id is given", () => {
		registerMirror();
		expect(getClassicyAppearanceLayout()).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		);
		setPackageId("mirror");
		expect(getClassicyAppearanceLayout()).toEqual(MIRROR);
	});
});

describe("the active package (R18)", () => {
	it("comes from Appearance.packageId, never activeTheme.package", () => {
		registerMirror();
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.activeTheme.package = "mirror";
			}),
		);
		expect(getClassicyAppearanceLayout()).toBe(
			CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		);
		const { result } = renderHook(() => useClassicyAppearanceLayout());
		expect(result.current).toBe(CLASSICY_DEFAULT_APPEARANCE_LAYOUT);
	});
});

describe("useClassicyAppearanceLayout", () => {
	it("re-renders when the active package id or its registration changes", () => {
		const { result } = renderHook(() => useClassicyAppearanceLayout());
		expect(result.current).toBe(CLASSICY_DEFAULT_APPEARANCE_LAYOUT);
		act(() => registerMirror());
		expect(result.current).toBe(CLASSICY_DEFAULT_APPEARANCE_LAYOUT);
		act(() => setPackageId("mirror"));
		expect(result.current).toEqual(MIRROR);
		const flipped: ClassicyAppearanceLayout = {
			...MIRROR,
			menuBar: { placement: "screen" },
		};
		act(() =>
			registerClassicyAppearancePackage({
				id: "mirror",
				name: "Mirror",
				css: "",
				defaults: { ...getTheme("default"), package: "mirror" },
				layout: flipped,
			}),
		);
		expect(result.current).toBe(flipped);
		act(() => setPackageId("platinum"));
		expect(result.current).toBe(CLASSICY_DEFAULT_APPEARANCE_LAYOUT);
	});

	it("the hook follows the active package", () => {
		registerMirror();
		const { result } = renderHook(() => useClassicyAppearanceLayout());
		expect(result.current.menuBar.placement).toBe("screen");
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "mirror",
			}),
		);
		expect(result.current.menuBar.placement).toBe("window");
	});
});

describe("the layout module", () => {
	// getClassicyAppearanceLayout is for reducers: its module must never
	// reach the store, directly or through the package module (which reads
	// the store), or a reducer the app manager imports would recreate the
	// store-before-default-state load-order failure.
	it("imports neither the store nor the package module at runtime", () => {
		const source = readFileSync(
			path.resolve(
				process.cwd(),
				"src/Appearance/useClassicyAppearanceLayout.ts",
			),
			"utf8",
		);
		const runtimeImports = (
			source.match(/^\s*(?:import|export)\b[^;]*\bfrom\s+["'][^"']+["']/gm) ??
			[]
		).filter((line) => !/^\s*(?:import|export) type\b/.test(line));
		expect(runtimeImports.length).toBeGreaterThan(0);
		for (const line of runtimeImports) {
			expect(line).not.toMatch(
				/ClassicyAppManager|ClassicyAppearancePackage["']/,
			);
		}
	});
});

describe("classicyLayoutVars", () => {
	it("emits the three layout declarations as bare keywords", () =>
		expect(classicyLayoutVars(MIRROR)).toEqual({
			"--classicy-layout-grow-box-corner": "bottom-left",
			"--classicy-layout-menu-bar-placement": "window",
			"--classicy-layout-icon-grid-origin": "top-left",
		}));
});
