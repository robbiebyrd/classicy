import { castDraft, produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { isUntrustedActionAllowed } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const makeStore = (): ClassicyStore =>
	mergeClassicyState(DefaultAppManagerState, {});

const appearance = (ds: ClassicyStore) => ds.System.Manager.Appearance;

/** Runs actions through the real Immer-backed kernel, as the store does. */
const run = (
	state: ClassicyStore,
	action: ActionMessage,
	trust: "trusted" | "untrusted" = "trusted",
) =>
	produce(state, (draft) => {
		classicyDesktopStateEventReducer(
			castDraft(draft) as ClassicyStore,
			action,
			trust,
		);
	});

const LAYOUT: ClassicyAppearancePackage["layout"] = {
	window: { growBoxCorner: "bottom-right" },
	menuBar: { placement: "screen" },
	desktop: { iconGridOrigin: "top-right" },
};

const irixDefaults: ClassicyTheme = {
	...structuredClone(getTheme("azul")),
	id: "irix-default",
	package: "irix",
};

const irix: ClassicyAppearancePackage = {
	id: "irix",
	name: "IRIX",
	css: "",
	defaults: irixDefaults,
	layout: LAYOUT,
};

const platinum: ClassicyAppearancePackage = {
	id: "platinum",
	name: "Platinum",
	css: "",
	defaults: getTheme("default"),
	layout: LAYOUT,
};

const changePackage = (packageId: unknown): ActionMessage => ({
	type: "ClassicyDesktopChangeAppearancePackage",
	packageId,
});

const SINK_ID = "appearance-package-test";

beforeEach(() => {
	registerClassicyAppearancePackage(platinum);
	registerClassicyAppearancePackage(irix);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	unregisterClassicyLogSink(SINK_ID);
	vi.restoreAllMocks();
});

describe("ClassicyDesktopChangeAppearancePackage", () => {
	it("default state carries packageId platinum", () => {
		expect(DefaultAppManagerState.System.Manager.Appearance.packageId).toBe(
			"platinum",
		);
	});

	it("switches to a registered package and activates its defaults", () => {
		const state = run(makeStore(), changePackage("irix"));
		expect(appearance(state).packageId).toBe("irix");
		expect(appearance(state).activeTheme.id).toBe("irix-default");
		expect(appearance(state).activeTheme).not.toBe(irix.defaults);
	});

	it("keeps the active theme when it already belongs to the package", () => {
		const before = produce(makeStore(), (draft) => {
			draft.System.Manager.Appearance.activeTheme.package = "irix";
		});
		const state = run(before, changePackage("irix"));
		expect(appearance(state).packageId).toBe("irix");
		expect(appearance(state).activeTheme).toBe(appearance(before).activeTheme);
	});

	it("ignores an unregistered id with a warning", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => entries.push(entry),
		});
		const before = makeStore();
		const state = run(before, changePackage("beos"));
		expect(state).toBe(before);
		expect(appearance(state).packageId).toBe("platinum");
		expect(
			entries.some(
				(e) => e.level === "warn" && e.subsystem === "ClassicyAppearance",
			),
		).toBe(true);
	});

	it("ignores a payload without packageId", () => {
		const before = makeStore();
		const state = run(before, {
			type: "ClassicyDesktopChangeAppearancePackage",
		});
		expect(state).toBe(before);
		expect(run(before, changePackage(42))).toBe(before);
	});

	it("is unreachable to untrusted dispatches", () => {
		expect(
			isUntrustedActionAllowed("ClassicyDesktopChangeAppearancePackage"),
		).toBe(false);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const before = makeStore();
		expect(run(before, changePackage("irix"), "untrusted")).toBe(before);
	});
});

describe("ClassicyDesktopLoadThemes", () => {
	it("defaults a missing theme.package to platinum", () => {
		const { package: _package, ...hostTheme } = structuredClone(
			getTheme("bondi"),
		);
		const state = run(makeStore(), {
			type: "ClassicyDesktopLoadThemes",
			availableThemes: [hostTheme, { ...getTheme("azul"), package: "irix" }],
		});
		const themes = appearance(state).availableThemes ?? [];
		expect(themes.map((t) => t.package)).toEqual(["platinum", "irix"]);
	});
});
