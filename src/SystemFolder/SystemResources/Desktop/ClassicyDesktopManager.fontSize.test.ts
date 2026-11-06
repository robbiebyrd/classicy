import { castDraft, produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// Story 0099-rlc: a dispatched font size is held to the theme schema's
// font-size bounds (8–72 px, CLASSICY_THEME_FONT_SIZE_MIN/MAX). Literal values
// here, so the test pins the bounds rather than restating the constants.

const SINK_ID = "font-size-test";

const makeStore = (): ClassicyStore =>
	mergeClassicyState(DefaultAppManagerState, {});

const run = (state: ClassicyStore, action: ActionMessage) =>
	produce(state, (draft) => {
		classicyDesktopStateEventReducer(castDraft(draft) as ClassicyStore, action);
	});

const changeFontSize = (fontType: unknown, fontSize: unknown) => ({
	type: "ClassicyDesktopChangeFontSize",
	fontType,
	fontSize,
});

const changeOption = (path: string, value: unknown) => ({
	type: "ClassicyDesktopChangeAppearanceOption",
	path,
	value,
});

const FONT_SIZE_KEYS = [
	"uiSize",
	"bodySize",
	"headerSize",
	"monoSize",
	"digitalSize",
] as const;

const OUT_OF_RANGE: [string, unknown][] = [
	["-1", -1],
	["0", 0],
	["NaN", Number.NaN],
	["Infinity", Number.POSITIVE_INFINITY],
	["-Infinity", Number.NEGATIVE_INFINITY],
	["1e6", 1e6],
	["513 (the old schema cap was 512)", 513],
	["7 (just below the minimum)", 7],
	["73 (just above the maximum)", 73],
	["a numeric string", "14"],
];

let entries: ClassicyLogEntry[];

beforeEach(() => {
	entries = [];
	registerClassicyLogSink({
		id: SINK_ID,
		onLog: (entry) => entries.push(entry),
	});
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	unregisterClassicyLogSink(SINK_ID);
	vi.restoreAllMocks();
});

const warnings = () => entries.filter((e) => e.level === "warn");

describe("ClassicyDesktopChangeFontSize — bounds", () => {
	describe.each(FONT_SIZE_KEYS)("%s", (fontType) => {
		it.each(
			OUT_OF_RANGE,
		)("refuses %s, changing nothing and logging a warning", (_label, fontSize) => {
			const before = makeStore();
			const after = run(before, changeFontSize(fontType, fontSize));
			// Same reference: nothing written, no Custom fork, nothing to persist.
			expect(after).toBe(before);
			expect(warnings()).toHaveLength(1);
			expect(warnings()[0].subsystem).toBe("ClassicyDesktopManager");
			expect(warnings()[0].message).toContain(
				"ClassicyDesktopChangeFontSize rejected",
			);
		});

		it.each([8, 13.5, 72])("accepts %s", (fontSize) => {
			const after = run(makeStore(), changeFontSize(fontType, fontSize));
			expect(
				after.System.Manager.Appearance.activeTheme.typography[fontType],
			).toBe(fontSize);
			expect(warnings()).toEqual([]);
		});
	});

	it("refuses an unknown font type without forking the theme", () => {
		const before = makeStore();
		const after = run(before, changeFontSize("header", 14));
		expect(after).toBe(before);
		expect(warnings()).toHaveLength(1);
	});
});

describe("ClassicyDesktopChangeAppearanceOption — font sizes", () => {
	const paths = [
		...FONT_SIZE_KEYS.map((key) => `typography.${key}`),
		"desktop.iconFontSize",
	];

	describe.each(paths)("%s", (path) => {
		it.each(OUT_OF_RANGE)("refuses %s", (_label, value) => {
			const before = makeStore();
			const after = run(before, changeOption(path, value));
			expect(after).toBe(before);
			expect(warnings()).toHaveLength(1);
		});

		it.each([8, 72])("accepts %s", (value) => {
			const after = run(makeStore(), changeOption(path, value));
			const [group, key] = path.split(".");
			const theme = after.System.Manager.Appearance
				.activeTheme as unknown as Record<string, Record<string, unknown>>;
			expect(theme[group][key]).toBe(value);
			expect(warnings()).toEqual([]);
		});
	});
});

describe("refused font sizes never reach persisted state", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		localStorage.clear();
	});

	afterEach(async () => {
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		mod.stopAppManagerPersistence();
		vi.useRealTimers();
		localStorage.clear();
	});

	it("persists the last accepted size, not a refused one", async () => {
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		utils.startAppManagerPersistence();
		utils.dispatch(changeFontSize("uiSize", 16));
		utils.dispatch(changeFontSize("uiSize", -1));
		utils.dispatch(changeFontSize("uiSize", Number.POSITIVE_INFINITY));
		utils.dispatch(changeOption("typography.uiSize", 1e6));
		vi.advanceTimersByTime(1000);
		const persisted = JSON.parse(
			localStorage.getItem("classicyDesktopState") ?? "null",
		) as ClassicyStore;
		expect(
			persisted.System.Manager.Appearance.activeTheme.typography.uiSize,
		).toBe(16);
		expect(
			persisted.System.Manager.Appearance.customThemes?.map(
				(t) => t.typography.uiSize,
			),
		).toEqual([16]);
	});
});
