import { castDraft, produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_CUSTOM_THEME_ID,
	CLASSICY_CUSTOM_THEME_NAME,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	CLASSICY_THEME_COLOR_TARGETS,
	getThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import {
	CLASSICY_THEME_METRIC_TARGETS,
	getThemeMetric,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { isUntrustedActionAllowed } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// A deep, unaliased copy of the real default state (all built-in themes).
const makeStore = (): ClassicyStore =>
	mergeClassicyState(DefaultAppManagerState, {});

const appearance = (ds: ClassicyStore) => ds.System.Manager.Appearance;

const run = (ds: ClassicyStore, action: ActionMessage) =>
	classicyDesktopEventHandler(ds, action);

const builtIn = (ds: ClassicyStore, id: string) => {
	const t = appearance(ds).availableThemes?.find((x) => x.id === id);
	if (!t) throw new Error(`no built-in ${id}`);
	return t;
};

describe("ClassicyDesktopChangeColor — every colour target", () => {
	it.each(
		CLASSICY_THEME_COLOR_TARGETS.map((info) => [info.cssVar, info] as const),
	)("sets %s", (cssVar, info) => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			...info.target,
			color: 0x123456,
		});
		const active = appearance(ds).activeTheme;
		expect(getThemeColor(active, info.target)).toBe(0x123456);
		expect((getThemeVars(active) as Record<string, string>)[cssVar]).toBe(
			"#123456",
		);
	});

	it("covers exactly the 28 colour variables getThemeVars emits", () => {
		const vars = Object.keys(getThemeVars(getTheme("default")));
		const colorVars = vars.filter(
			(v) => v.startsWith("--color-") || v === "--desktop-background-color",
		);
		expect(colorVars).toHaveLength(28);
		expect(CLASSICY_THEME_COLOR_TARGETS.map((t) => t.cssVar).sort()).toEqual(
			colorVars.sort(),
		);
	});

	it("addresses palette tuple indices individually", () => {
		const ds = makeStore();
		const before = [...appearance(ds).activeTheme.color.system];
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "system",
			index: 6,
			color: 0xabcdef,
		});
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "theme",
			index: 0,
			color: 0x010203,
		});
		const { system, theme } = appearance(ds).activeTheme.color;
		expect(system).toEqual([...before.slice(0, 6), 0xabcdef]);
		expect(theme[0]).toBe(0x010203);
		expect(getThemeVars(appearance(ds).activeTheme)["--color-system-07"]).toBe(
			"#abcdef",
		);
	});
});

describe("ClassicyDesktopChangeColor — payload validation", () => {
	const invalid: [string, Record<string, unknown>][] = [
		["non-integer colour", { colorKey: "black", color: 1.5 }],
		["negative colour", { colorKey: "black", color: -1 }],
		["colour above 0xFFFFFF", { colorKey: "black", color: 0x1000000 }],
		["NaN colour", { colorKey: "black", color: Number.NaN }],
		["string colour", { colorKey: "black", color: "#ffffff" }],
		["missing colour", { colorKey: "black" }],
		["unknown key", { colorKey: "purple", color: 0 }],
		["missing key", { color: 0 }],
		["palette without index", { colorKey: "system", color: 0 }],
		["palette index 7", { colorKey: "system", index: 7, color: 0 }],
		["palette index -1", { colorKey: "theme", index: -1, color: 0 }],
		["fractional index", { colorKey: "theme", index: 1.5, color: 0 }],
		["string index", { colorKey: "theme", index: "1", color: 0 }],
		["scalar with index", { colorKey: "black", index: 0, color: 0 }],
		["window object key", { colorKey: "window", color: 0 }],
	];

	it.each(invalid)("ignores %s", (_label, payload) => {
		const ds = makeStore();
		const before = JSON.stringify(appearance(ds));
		run(ds, { type: "ClassicyDesktopChangeColor", ...payload });
		expect(JSON.stringify(appearance(ds))).toBe(before);
	});

	it("accepts the boundary colours 0 and 0xFFFFFF", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "white",
			color: 0,
		});
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0xffffff,
		});
		expect(appearance(ds).activeTheme.color.white).toBe(0);
		expect(appearance(ds).activeTheme.color.black).toBe(0xffffff);
	});
});

describe("Custom theme fork-on-first-edit", () => {
	it("forks the active built-in into Custom and leaves the built-in untouched", () => {
		const ds = makeStore();
		const stock = JSON.stringify(builtIn(ds, "default"));
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "select",
			color: 0xff00ff,
		});
		const a = appearance(ds);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.name).toBe(CLASSICY_CUSTOM_THEME_NAME);
		expect(a.activeTheme.color.select).toBe(0xff00ff);
		expect(a.customThemes).toHaveLength(1);
		expect(a.customThemes?.[0]).toEqual(a.activeTheme);
		// Distinct objects: the active theme never aliases the stored entry.
		expect(a.customThemes?.[0]).not.toBe(a.activeTheme);
		expect(JSON.stringify(builtIn(ds, "default"))).toBe(stock);
		// Everything but the edit, id and name is copied from the built-in.
		const { id, name, ...rest } = a.activeTheme;
		const stockTheme = JSON.parse(stock);
		stockTheme.color.select = 0xff00ff;
		const { id: _i, name: _n, ...stockRest } = stockTheme;
		expect(rest).toEqual(stockRest);
	});

	it("does not mutate the module-level built-in themes", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x00ff00,
		});
		expect(getTheme("default").color.black).toBe(0);
		expect(
			DefaultAppManagerState.System.Manager.Appearance.customThemes,
		).toEqual([]);
	});

	it("applies subsequent edits to Custom only, without re-forking", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "alert",
			color: 0x111111,
		});
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "error",
			color: 0x222222,
		});
		const a = appearance(ds);
		expect(a.customThemes).toHaveLength(1);
		expect(a.activeTheme.color.alert).toBe(0x111111);
		expect(a.activeTheme.color.error).toBe(0x222222);
		expect(a.customThemes?.[0].color.error).toBe(0x222222);
		expect(builtIn(ds, "default").color.error).toBe(0xff0000);
	});

	it("is a no-op (no fork) when the edit changes nothing", () => {
		const ds = makeStore();
		const current = appearance(ds).activeTheme.color.black;
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: current,
		});
		run(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "ui",
			font: appearance(ds).activeTheme.typography.ui,
		});
		run(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "not-a-font-slot",
			font: "Geneva",
		});
		expect(appearance(ds).activeTheme.id).toBe("default");
		expect(appearance(ds).customThemes).toEqual([]);
	});

	it("switches to a built-in and back to Custom with edits intact", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "highlight",
			color: 0x0000ff,
		});
		run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		expect(appearance(ds).activeTheme.id).toBe("azul");
		expect(appearance(ds).customThemes).toHaveLength(1);

		run(ds, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: CLASSICY_CUSTOM_THEME_ID,
		});
		const a = appearance(ds);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.color.highlight).toBe(0x0000ff);
		// Activated as a copy, so later edits can't alias the stored entry.
		expect(a.activeTheme).not.toBe(a.customThemes?.[0]);
	});

	it("re-forking from another built-in overwrites the single Custom slot", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x010101,
		});
		run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		const azulStock = JSON.stringify(builtIn(ds, "azul"));
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "white",
			color: 0xfefefe,
		});
		const a = appearance(ds);
		expect(a.customThemes).toHaveLength(1);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.color.white).toBe(0xfefefe);
		expect(a.activeTheme.color.theme).toEqual(builtIn(ds, "azul").color.theme);
		expect(JSON.stringify(builtIn(ds, "azul"))).toBe(azulStock);
	});

	it("ChangeTheme to an unknown id leaves Custom active", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x010101,
		});
		run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: "nope" });
		expect(appearance(ds).activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
	});

	it("ChangeTheme to custom is a no-op when no Custom theme exists", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: CLASSICY_CUSTOM_THEME_ID,
		});
		expect(appearance(ds).activeTheme.id).toBe("default");
	});

	it("ClassicyDesktopLoadThemes replaces the built-ins but keeps Custom", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x010101,
		});
		run(ds, {
			type: "ClassicyDesktopLoadThemes",
			availableThemes: [getTheme("azul")],
		});
		expect(appearance(ds).customThemes).toHaveLength(1);
		run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		run(ds, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: CLASSICY_CUSTOM_THEME_ID,
		});
		expect(appearance(ds).activeTheme.color.black).toBe(0x010101);
	});
});

describe("Font and desktop edits fork too", () => {
	const edits: [
		string,
		ActionMessage,
		(ds: ClassicyStore) => unknown,
		unknown,
	][] = [
		[
			"ChangeFont",
			{ type: "ClassicyDesktopChangeFont", fontType: "header", font: "Monaco" },
			(ds) => appearance(ds).activeTheme.typography.header,
			"Monaco",
		],
		[
			"ChangeFontSize",
			{
				type: "ClassicyDesktopChangeFontSize",
				fontType: "bodySize",
				fontSize: 18,
			},
			(ds) => appearance(ds).activeTheme.typography.bodySize,
			18,
		],
		[
			"ChangeBackground",
			{
				type: "ClassicyDesktopChangeBackground",
				backgroundImage: "https://example.com/bg.png",
			},
			(ds) => appearance(ds).activeTheme.desktop.backgroundImage,
			"https://example.com/bg.png",
		],
		[
			"ChangeBackgroundPosition",
			{
				type: "ClassicyDesktopChangeBackgroundPosition",
				backgroundPosition: "top left",
			},
			(ds) => appearance(ds).activeTheme.desktop.backgroundPosition,
			"top left",
		],
		[
			"ChangeBackgroundRepeat",
			{
				type: "ClassicyDesktopChangeBackgroundRepeat",
				backgroundRepeat: "no-repeat",
			},
			(ds) => appearance(ds).activeTheme.desktop.backgroundRepeat,
			"no-repeat",
		],
		[
			"ChangeBackgroundSize",
			{
				type: "ClassicyDesktopChangeBackgroundSize",
				backgroundSize: "cover",
			},
			(ds) => appearance(ds).activeTheme.desktop.backgroundSize,
			"cover",
		],
	];

	it.each(
		edits,
	)("%s forks the built-in into Custom", (_n, action, read, value) => {
		const ds = makeStore();
		const stock = JSON.stringify(builtIn(ds, "default"));
		run(ds, action);
		expect(read(ds)).toBe(value);
		expect(appearance(ds).activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(appearance(ds).customThemes?.[0]).toEqual(
			appearance(ds).activeTheme,
		);
		expect(JSON.stringify(builtIn(ds, "default"))).toBe(stock);
	});

	it("a font edit after a colour edit lands in the same Custom theme", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x010101,
		});
		run(ds, {
			type: "ClassicyDesktopChangeFont",
			fontType: "mono",
			font: "Geneva",
		});
		const custom = appearance(ds).customThemes?.[0];
		expect(appearance(ds).customThemes).toHaveLength(1);
		expect(custom?.color.black).toBe(0x010101);
		expect(custom?.typography.mono).toBe("Geneva");
	});
});

describe("through the Immer-backed kernel", () => {
	it("forks, edits and switches back on a frozen store", () => {
		let state = makeStore();
		const dispatch = (action: ActionMessage) => {
			state = produce(state, (draft) => {
				classicyDesktopStateEventReducer(
					castDraft(draft) as ClassicyStore,
					action,
				);
			});
		};
		const stock = state.System.Manager.Appearance.availableThemes?.[0];
		dispatch({
			type: "ClassicyDesktopChangeColor",
			colorKey: "theme",
			index: 3,
			color: 0x445566,
		});
		dispatch({
			type: "ClassicyDesktopChangeColor",
			colorKey: "windowTitle",
			color: 0x778899,
		});
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "default" });
		expect(state.System.Manager.Appearance.activeTheme.color.theme[3]).toBe(
			stock?.color.theme[3],
		);
		dispatch({
			type: "ClassicyDesktopChangeTheme",
			activeTheme: CLASSICY_CUSTOM_THEME_ID,
		});
		const a = state.System.Manager.Appearance;
		expect(a.activeTheme.color.theme[3]).toBe(0x445566);
		expect(a.activeTheme.color.window.title).toBe(0x778899);
		// The built-in entry is the very same (untouched) object.
		expect(a.availableThemes?.[0]).toBe(stock);
	});
});

describe("ClassicyDesktopChangeMetric", () => {
	it("forks a built-in into Custom and applies the value", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "buttonGap",
			value: 20,
		});
		const a = appearance(ds);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.name).toBe(CLASSICY_CUSTOM_THEME_NAME);
		expect(a.activeTheme.measurements.button.gap).toBe(20);
		expect(builtIn(ds, "default").measurements.button.gap).toBe(12);
		expect(
			(getThemeVars(a.activeTheme) as Record<string, string>)["--button-gap"],
		).toBe("20px");
	});

	it("sets every metric target", () => {
		for (const info of CLASSICY_THEME_METRIC_TARGETS) {
			const ds = makeStore();
			run(ds, {
				type: "ClassicyDesktopChangeMetric",
				...info.target,
				value: 33,
			});
			const active = appearance(ds).activeTheme;
			expect(getThemeMetric(active, info.target), info.cssVar).toBe(33);
			expect(
				(getThemeVars(active) as Record<string, string>)[info.cssVar],
				info.cssVar,
			).toBe("33px");
		}
	});

	it("ignores an out-of-range value", () => {
		const ds = makeStore();
		const before = JSON.stringify(appearance(ds));
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowControlSize",
			value: 0,
		});
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "buttonGap",
			value: 513,
		});
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			metricKey: "__proto__",
			value: 12,
		});
		expect(JSON.stringify(appearance(ds))).toBe(before);
		expect(appearance(ds).activeTheme.id).toBe("default");
	});
});

const LOG_SINK_ID = "custom-theme-test";

/** Collects the warnings classicyLog emits (and keeps the console quiet). */
const captureWarnings = (): ClassicyLogEntry[] => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const entries: ClassicyLogEntry[] = [];
	registerClassicyLogSink({
		id: LOG_SINK_ID,
		onLog: (entry) => {
			if (entry.level === "warn") entries.push(entry);
		},
	});
	return entries;
};

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	unregisterClassicyLogSink(LOG_SINK_ID);
	vi.restoreAllMocks();
});

describe("ClassicyDesktopChangeAppearanceOption", () => {
	it("ClassicyDesktopChangeAppearanceOption forks a built-in and applies the value", () => {
		const ds = makeStore();
		// Platinum's stock icon size is already 48 (the plan's value), so the
		// write uses 40: an unchanged value is a no-op and never forks.
		expect(builtIn(ds, "default").desktop.iconSize).toBe(48);
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconSize",
			value: 40,
		});
		const a = appearance(ds);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.desktop.iconSize).toBe(40);
		expect(builtIn(ds, "default").desktop.iconSize).toBe(48);
		expect(
			a.customThemes?.find((t) => t.id === "custom")?.desktop.iconSize,
		).toBe(40);
	});

	it("rejects a bad path without forking", () => {
		const warnings = captureWarnings();
		const ds = makeStore();
		const customsBefore = JSON.stringify(appearance(ds).customThemes);
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "measurements.window.borderSize",
			value: 3,
		});
		expect(appearance(ds).activeTheme.id).toBe("default");
		expect(JSON.stringify(appearance(ds).customThemes)).toBe(customsBefore);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].subsystem).toBe("ClassicyDesktopManager");
	});

	it("rejects a prototype path and a schema-refused value without forking", () => {
		const warnings = captureWarnings();
		const ds = makeStore();
		const before = JSON.stringify(appearance(ds));
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "__proto__.x",
			value: 1,
		});
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "sound.pack",
			value: "no-such-pack",
		});
		expect(JSON.stringify(appearance(ds))).toBe(before);
		expect(({} as Record<string, unknown>).x).toBeUndefined();
		expect(warnings).toHaveLength(2);
	});

	it("ignores a payload without a path or a value", () => {
		const ds = makeStore();
		const before = JSON.stringify(appearance(ds));
		run(ds, { type: "ClassicyDesktopChangeAppearanceOption", value: 40 });
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconSize",
		});
		expect(JSON.stringify(appearance(ds))).toBe(before);
	});

	it("writes sound.pack", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "sound.pack",
			value: "platinum",
		});
		// Same value: no change, so no fork.
		expect(appearance(ds).activeTheme.id).toBe("default");
	});

	it("is unreachable to untrusted dispatches", () => {
		expect(
			isUntrustedActionAllowed("ClassicyDesktopChangeAppearanceOption"),
		).toBe(false);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const before = makeStore();
		const after = produce(before, (draft) => {
			classicyDesktopStateEventReducer(
				castDraft(draft) as ClassicyStore,
				{
					type: "ClassicyDesktopChangeAppearanceOption",
					path: "desktop.iconSize",
					value: 40,
				},
				"untrusted",
			);
		});
		expect(after).toBe(before);
	});
});

describe("ClassicyDesktopChangeMetric family form", () => {
	const knobPackage: ClassicyAppearancePackage = {
		id: "knob-test",
		name: "Knob Test",
		css: "",
		defaults: { ...structuredClone(getTheme("default")), package: "knob-test" },
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
		knobs: {
			controlStrip: {
				cellHeight: { label: "Cell height", min: 10, max: 40, default: 22 },
			},
		},
	};

	const makeKnobStore = (): ClassicyStore => {
		registerClassicyAppearancePackage(knobPackage);
		const ds = makeStore();
		appearance(ds).packageId = knobPackage.id;
		return ds;
	};

	it("ClassicyDesktopChangeMetric family form forks and applies", () => {
		const ds = makeKnobStore();
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			family: "controlStrip",
			key: "cellHeight",
			value: 30,
		});
		const a = appearance(ds);
		expect(a.activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		expect(a.activeTheme.measurements.controlStrip.cellHeight).toBe(30);
		expect(builtIn(ds, "default").measurements.controlStrip).toBeUndefined();
		expect(
			(getThemeVars(a.activeTheme) as Record<string, string>)[
				"--control-strip-cell-height"
			],
		).toBe("30px");
	});

	it("refuses an undeclared knob, an out-of-range value and a core family without forking", () => {
		const warnings = captureWarnings();
		const ds = makeKnobStore();
		const before = JSON.stringify(appearance(ds));
		for (const payload of [
			{ family: "controlStrip", key: "nope", value: 30 },
			{ family: "menuFrame", key: "cellHeight", value: 30 },
			{ family: "controlStrip", key: "cellHeight", value: 41 },
			{ family: "window", key: "borderSize", value: 3 },
			{ family: "__proto__", key: "x", value: 3 },
			{ family: "constructor", key: "x", value: 3 },
		]) {
			run(ds, { type: "ClassicyDesktopChangeMetric", ...payload });
		}
		expect(JSON.stringify(appearance(ds))).toBe(before);
		expect(appearance(ds).activeTheme.id).toBe("default");
		// The three well-formed knob writes are reported; malformed targets are
		// ignored, like an invalid metricKey.
		expect(warnings).toHaveLength(3);
	});

	it("refuses every knob when the active package is not registered", () => {
		const warnings = captureWarnings();
		const ds = makeStore();
		appearance(ds).packageId = "beos";
		const before = JSON.stringify(appearance(ds));
		run(ds, {
			type: "ClassicyDesktopChangeMetric",
			family: "controlStrip",
			key: "cellHeight",
			value: 30,
		});
		expect(JSON.stringify(appearance(ds))).toBe(before);
		expect(warnings).toHaveLength(1);
	});
});

describe("ClassicyDesktopLoadThemes normalizes metrics", () => {
	it("a theme loaded without metric groups is complete when it becomes active", () => {
		const ds = makeStore();
		const stripped = JSON.parse(
			JSON.stringify(builtIn(ds, "azul")),
		) as unknown as Record<string, unknown>;
		stripped.measurements = {
			window: {
				borderSize: 1,
				controlSize: 12,
				paddingSize: 6,
				scrollbarSize: 17,
			},
		};
		run(ds, { type: "ClassicyDesktopLoadThemes", availableThemes: [stripped] });
		run(ds, { type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		const active = appearance(ds).activeTheme;
		expect(active.id).toBe("azul");
		expect(active.measurements.layout.itemGap).toBe(4);
		expect(
			(getThemeVars(active) as Record<string, string>)["--layout-item-gap"],
		).toBe("4px");
	});
});
