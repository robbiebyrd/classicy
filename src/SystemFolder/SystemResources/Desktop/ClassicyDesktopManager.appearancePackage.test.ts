import { castDraft, produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_DEFAULT_THEME_METRICS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { resolveWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
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

	// A JS-authored package is stored as passed, so its defaults may lack
	// what the theme schema would fill in. The switch normalizes the copy it
	// activates, as built-in and loaded themes are.
	it("activates a package's defaults with missing metric groups filled and the wallpaper resolved", () => {
		const { control: _control, ...measurements } = structuredClone(
			getTheme("azul").measurements,
		);
		const sparseDefaults = {
			...structuredClone(getTheme("azul")),
			id: "sparse-default",
			package: "sparse",
			measurements,
			desktop: {
				...structuredClone(getTheme("azul").desktop),
				backgroundImage: "azul_dark.png",
			},
		} as unknown as ClassicyTheme;
		const sparse: ClassicyAppearancePackage = {
			id: "sparse",
			name: "Sparse",
			css: "",
			defaults: sparseDefaults,
			layout: LAYOUT,
		};
		registerClassicyAppearancePackage(sparse);
		// The registry keeps the package object as passed.
		expect(getClassicyAppearancePackage("sparse")).toBe(sparse);
		expect(sparse.defaults.measurements.control).toBeUndefined();

		const active = appearance(
			run(makeStore(), changePackage("sparse")),
		).activeTheme;
		expect(active.id).toBe("sparse-default");
		expect(active.package).toBe("sparse");
		expect(active.measurements.control).toEqual(
			CLASSICY_DEFAULT_THEME_METRICS.control,
		);
		expect(() => getThemeVars(active)).not.toThrow();
		expect(resolveWallpaper("azul_dark.png")).not.toBe("azul_dark.png");
		expect(active.desktop.backgroundImage).toBe(
			resolveWallpaper("azul_dark.png"),
		);
		expect(sparse.defaults.desktop.backgroundImage).toBe("azul_dark.png");
	});

	it("sets package on the activated theme when the package's defaults omit it", () => {
		const { package: _package, ...bare } = structuredClone(getTheme("default"));
		registerClassicyAppearancePackage({
			...platinum,
			defaults: bare as ClassicyTheme,
		});
		const before = run(makeStore(), changePackage("irix"));
		const active = appearance(
			run(before, changePackage("platinum")),
		).activeTheme;
		expect(active.id).toBe("default");
		expect(active.package).toBe("platinum");
	});

	// R16: the default package is always installable; with nothing registered
	// its built-in structure (CLASSICY_FALLBACK_APPEARANCE_PACKAGE) applies.
	it("accepts the default package id with nothing registered, activating the fallback package's defaults", () => {
		const before = run(makeStore(), changePackage("irix"));
		resetClassicyAppearancePackagesForTests();
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => entries.push(entry),
		});
		const state = run(
			before,
			changePackage(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID),
		);
		expect(appearance(state).packageId).toBe(
			CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		);
		expect(appearance(state).activeTheme).toEqual(
			CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults,
		);
		expect(appearance(state).activeTheme).not.toBe(
			CLASSICY_FALLBACK_APPEARANCE_PACKAGE.defaults,
		);
		expect(entries.filter((e) => e.level === "warn")).toEqual([]);
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
