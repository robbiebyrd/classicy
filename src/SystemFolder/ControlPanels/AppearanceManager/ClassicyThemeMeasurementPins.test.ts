// The explicit-edit record (story 0235-xgi, fix round 1, review C1 and I3):
// a knob the user sets, while another package draws the theme, to the value
// the theme's own package defaults to draws, persists and reloads as set.
// Five editable knobs differ between the shipped packages: the four core
// metrics below and Platinum's `menuFrame.shadowStart` (an Options knob).
import "@/__tests__/withPlatinum";
import "@classicy/appearance-system7";
import { afterEach, describe, expect, it } from "vitest";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
	readClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { withValidClassicyMeasurementPins } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementPins";
import type { ClassicyThemeMetricKey } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	adoptPersistedClassicyState,
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";

const system7Theme = (id: string) => {
	const pkg = getClassicyAppearancePackage("system7");
	return [pkg?.defaults, ...(pkg?.presets ?? [])].find(
		(theme) => theme?.id === id,
	) as ClassicyTheme;
};

const appearance = () => useAppManager.getState().System.Manager.Appearance;
const drawn = (name: string) =>
	(
		getThemeVars(appearance().activeTheme, appearance().packageId) as Record<
			string,
			string
		>
	)[name];

const seed = (
	packageId: string,
	theme: ClassicyTheme,
	customs: ClassicyTheme[] = [],
) => {
	const state = structuredClone(DefaultAppManagerState);
	state.System.Manager.Appearance.packageId = packageId;
	state.System.Manager.Appearance.activeTheme = structuredClone(theme);
	state.System.Manager.Appearance.customThemes = structuredClone(customs);
	useAppManager.setState(state, true);
};

// A reload: the persisted state, through the load path (migration, merge,
// refresh of a built-in reference).
const reload = () => {
	const saved = JSON.parse(
		JSON.stringify(sanitizeStateForPersistence(useAppManager.getState())),
	);
	expect(adoptPersistedClassicyState(saved)).toBe(true);
	return saved.System.Manager.Appearance;
};

const core = (metricKey: ClassicyThemeMetricKey, value: number) =>
	dispatch({ type: "ClassicyDesktopChangeMetric", metricKey, value });

afterEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
});

// metric target, its family and key, its variable, Platinum's default, System 7's.
const CORE_KNOBS = [
	[
		"windowControlSize",
		"window",
		"controlSize",
		"--window-control-size",
		12,
		11,
	],
	[
		"windowScrollbarSize",
		"window",
		"scrollbarSize",
		"--window-scrollbar-size",
		17,
		16,
	],
	[
		"windowUtilityTitleBarHeight",
		"window",
		"utilityTitleBarHeight",
		"--window-utility-title-bar-height",
		10,
		13,
	],
	["buttonMinWidth", "button", "minWidth", "--button-min-width", 58, 60],
] as const;

describe("the shipped packages' differing editable knobs", () => {
	it("are the five the record exists for", () => {
		const platinum = getTheme("default").measurements;
		const s7 = system7Theme("system7").measurements;
		for (const [, family, key, , p, s] of CORE_KNOBS) {
			expect(platinum[family][key as never], key).toBe(p);
			expect(s7[family][key as never], key).toBe(s);
		}
		expect(platinum.menuFrame.shadowStart).toBe(1);
		expect(s7.menuFrame.shadowStart).toBe(2);
	});
});

describe.each(
	CORE_KNOBS,
)("%s set to the theme's own package default while another package draws", (metricKey, family, key, cssVar, platinumDefault, system7Default) => {
	it("a Platinum built-in under System 7: forks, draws, persists and reloads as set", () => {
		seed("system7", getTheme("azul"));
		expect(drawn(cssVar)).toBe(`${system7Default}px`);
		core(metricKey, platinumDefault);
		const theme = appearance().activeTheme;
		expect(theme.id).toBe("custom");
		expect(theme.measurementPins?.[family]).toContain(key);
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
		const saved = reload();
		expect(saved.activeTheme.measurements[family][key]).toBe(platinumDefault);
		expect(saved.activeTheme.measurementPins[family]).toContain(key);
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
		// Off the default, the record is cleared; back on it, written again.
		core(metricKey, platinumDefault + 3);
		expect(
			appearance().activeTheme.measurementPins?.[family] ?? [],
		).not.toContain(key);
		expect(drawn(cssVar)).toBe(`${platinumDefault + 3}px`);
		core(metricKey, platinumDefault);
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
	});

	it("a Platinum Custom under System 7: edited in place", () => {
		const custom = {
			...structuredClone(getTheme("default")),
			id: "custom",
			name: "Custom",
		};
		seed("system7", custom, [custom]);
		core(metricKey, platinumDefault);
		expect(appearance().activeTheme.id).toBe("custom");
		expect(appearance().customThemes).toHaveLength(1);
		expect(appearance().customThemes?.[0].measurementPins?.[family]).toContain(
			key,
		);
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
		reload();
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
	});

	it("System 7's color preset under Platinum: forks, draws, persists and reloads as set", () => {
		seed("platinum", system7Theme("system7-color"));
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
		core(metricKey, system7Default);
		expect(appearance().activeTheme.id).toBe("custom-system7");
		expect(drawn(cssVar)).toBe(`${system7Default}px`);
		const saved = reload();
		expect(saved.activeTheme.measurementPins[family]).toContain(key);
		expect(drawn(cssVar)).toBe(`${system7Default}px`);
	});

	it("under the theme's own package: no record", () => {
		seed("platinum", getTheme("azul"));
		core(metricKey, platinumDefault + 1);
		core(metricKey, platinumDefault);
		expect(appearance().activeTheme.measurementPins).toBeUndefined();
		expect(drawn(cssVar)).toBe(`${platinumDefault}px`);
	});
});

describe("menuFrame.shadowStart (the Options tab's knob)", () => {
	const shadowStart = (value: number) =>
		dispatch({
			type: "ClassicyDesktopChangeMetric",
			family: "menuFrame",
			key: "shadowStart",
			value,
		});

	it("System 7's color preset under Platinum: set to System 7's 2, draws, persists and reloads 2", () => {
		seed("platinum", system7Theme("system7-color"));
		expect(drawn("--menu-frame-shadow-start")).toBe("1px");
		shadowStart(2);
		expect(appearance().activeTheme.id).toBe("custom-system7");
		expect(drawn("--menu-frame-shadow-start")).toBe("2px");
		const saved = reload();
		// Kept although it equals System 7's default.
		expect(saved.activeTheme.measurements.menuFrame).toEqual({
			shadowStart: 2,
		});
		expect(saved.activeTheme.measurementPins).toEqual({
			menuFrame: ["shadowStart"],
		});
		expect(drawn("--menu-frame-shadow-start")).toBe("2px");
		shadowStart(3);
		shadowStart(2);
		expect(drawn("--menu-frame-shadow-start")).toBe("2px");
	});

	it("System 7 has no Options knobs, so it cannot be edited under System 7", () => {
		seed("system7", getTheme("azul"));
		shadowStart(1);
		expect(appearance().activeTheme.id).toBe("azul");
		expect(appearance().activeTheme.measurementPins).toBeUndefined();
	});
});

describe("ClassicyDesktopChangeAppearanceOption", () => {
	it("can write neither a measurement nor the record, under another package", () => {
		const custom = {
			...structuredClone(getTheme("default")),
			id: "custom",
			name: "Custom",
		};
		seed("system7", custom, [custom]);
		const before = JSON.stringify(appearance());
		for (const [path, value] of [
			["measurements.window.controlSize", 12],
			["measurementPins.window", ["controlSize"]],
		] as const) {
			dispatch({ type: "ClassicyDesktopChangeAppearanceOption", path, value });
		}
		expect(JSON.stringify(appearance())).toBe(before);
	});

	it("keeps the record through an option edit, a fork included", () => {
		seed("system7", getTheme("azul"));
		core("windowControlSize", 12);
		dispatch({
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconSize",
			value: 40,
		});
		expect(appearance().activeTheme.desktop.iconSize).toBe(40);
		expect(appearance().activeTheme.measurementPins).toEqual({
			window: ["controlSize"],
		});
		expect(drawn("--window-control-size")).toBe("12px");
	});
});

describe("theme files and the schema", () => {
	const pinnedCustom = (): ClassicyTheme => {
		seed("system7", getTheme("azul"));
		core("windowControlSize", 12);
		return appearance().activeTheme;
	};

	it("export and import keep the record, and the import draws as set", () => {
		const text = exportClassicyTheme(pinnedCustom());
		expect(JSON.parse(text).theme.measurementPins).toEqual({
			window: ["controlSize"],
		});
		const read = parseClassicyThemeFile(text);
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		expect(read.theme.measurementPins).toEqual({ window: ["controlSize"] });
		seed("system7", system7Theme("system7"));
		dispatch({ type: "ClassicyDesktopImportTheme", theme: read.theme });
		expect(appearance().activeTheme.measurementPins).toEqual({
			window: ["controlSize"],
		});
		expect(drawn("--window-control-size")).toBe("12px");
	});

	it("refuses a malformed record", () => {
		const theme = structuredClone(getTheme("default"));
		for (const measurementPins of [
			{ window: ["Control-Size"] },
			{ "Bad-Family": ["controlSize"] },
			{ window: ["controlSize", "controlSize"] },
			{ window: [] },
			{ window: "controlSize" },
		])
			expect(
				ClassicyThemeSchema.safeParse({ ...theme, measurementPins }).success,
				JSON.stringify(measurementPins),
			).toBe(false);
		expect(
			readClassicyTheme({
				...theme,
				measurementPins: { window: ["controlSize"] },
			}).ok,
		).toBe(true);
	});
});

describe("the state migration", () => {
	it("keeps a valid record, normalizes a malformed one and is idempotent", () => {
		const theme = structuredClone(getTheme("default"));
		expect(
			withValidClassicyMeasurementPins({
				...theme,
				measurementPins: { window: ["controlSize"] },
			}).measurementPins,
		).toEqual({ window: ["controlSize"] });
		const malformed = {
			...theme,
			measurementPins: {
				window: ["controlSize", "controlSize", 3, "Bad-Key"],
				button: "minWidth",
				"Bad-Family": ["x"],
			},
		} as unknown as ClassicyTheme;
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Appearance.activeTheme = malformed;
		state.System.Manager.Appearance.customThemes = [
			{ ...malformed, id: "custom" },
			{ ...theme, id: "custom-2", measurementPins: {} },
		];
		const once = migrateClassicyState(state);
		const a = once.System.Manager.Appearance;
		expect(a.activeTheme.measurementPins).toEqual({ window: ["controlSize"] });
		expect(a.customThemes?.[0].measurementPins).toEqual({
			window: ["controlSize"],
		});
		expect(a.customThemes?.[1]).not.toHaveProperty("measurementPins");
		expect(migrateClassicyState(once)).toBe(once);
	});
});
