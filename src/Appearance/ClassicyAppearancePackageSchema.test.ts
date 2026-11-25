import { readFileSync } from "node:fs";
import path from "node:path";
import { platinumSoundPack } from "@classicy/appearance-platinum";
import { describe, expect, it } from "vitest";
import {
	getClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	ClassicyAppearanceLayoutSchema,
	ClassicyAppearancePackageSchema,
	classicyKnobsToSchema,
} from "@/Appearance/ClassicyAppearancePackageSchema";
// getAllThemes() serves the registered packages' themes: Platinum's here.
import "@classicy/appearance-platinum";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// A Platinum-shaped package: every built-in theme as a preset.
const platinumShaped = (): Record<string, unknown> => ({
	id: "platinum",
	name: "Platinum",
	defaults: getTheme("default"),
	presets: getAllThemes(),
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

describe("ClassicyAppearancePackageSchema", () => {
	it("accepts a package with all 21 presets", () => {
		const input = platinumShaped();
		expect(input.presets).toHaveLength(21);
		expect(ClassicyAppearancePackageSchema.safeParse(input).success).toBe(true);
	});

	it("rejects a missing layout group", () => {
		const input = platinumShaped();
		delete (input.layout as Record<string, unknown>).menuBar;
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.path)).toContainEqual([
			"layout",
			"menuBar",
		]);
	});

	it("rejects an unknown growBoxCorner", () => {
		const input = platinumShaped();
		(input.layout as Record<string, unknown>).window = {
			growBoxCorner: "middle",
		};
		expect(ClassicyAppearancePackageSchema.safeParse(input).success).toBe(
			false,
		);
	});

	it("takes an optional scrollBar group whose keys are optional", () => {
		for (const scrollBar of [
			undefined,
			{},
			{ thumbDrag: "live" },
			{ fitsBars: "hidden" },
		]) {
			const input = platinumShaped();
			(input.layout as Record<string, unknown>).scrollBar = scrollBar;
			expect(
				ClassicyAppearancePackageSchema.safeParse(input).success,
				JSON.stringify(scrollBar),
			).toBe(true);
		}
		const input = platinumShaped();
		(input.layout as Record<string, unknown>).scrollBar = {
			thumbDrag: "onRelease",
			fitsBars: "shown",
		};
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.scrollBar).toEqual({
			thumbDrag: "onRelease",
			fitsBars: "shown",
		});
	});

	it("rejects an unknown fitsBars", () => {
		const input = platinumShaped();
		(input.layout as Record<string, unknown>).scrollBar = {
			fitsBars: "always",
		};
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.path)).toContainEqual([
			"layout",
			"scrollBar",
			"fitsBars",
		]);
	});

	it("rejects an unknown thumbDrag", () => {
		const input = platinumShaped();
		(input.layout as Record<string, unknown>).scrollBar = {
			thumbDrag: "sometimes",
		};
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.path)).toContainEqual([
			"layout",
			"scrollBar",
			"thumbDrag",
		]);
	});

	it("rejects defaults that belong to another package", () => {
		const result = ClassicyAppearancePackageSchema.safeParse({
			...platinumShaped(),
			id: "irix",
		});
		expect(result.success).toBe(false);
		const issue = result.error?.issues.find(
			(i) => i.path.join(".") === "defaults.package",
		);
		expect(issue?.message).toBe(
			'must be the package id "irix", not "platinum"',
		);
	});

	it("accepts defaults that name the package", () => {
		const input = {
			...platinumShaped(),
			id: "irix",
			defaults: { ...getTheme("default"), package: "irix" },
		};
		expect(ClassicyAppearancePackageSchema.safeParse(input).success).toBe(true);
	});

	it("rejects defaults carrying a font-size knob outside 8–72", () => {
		const defaults = structuredClone(getTheme("default"));
		Object.assign(defaults.measurements, { hyperCard: { fontSize: 400 } });
		const result = ClassicyAppearancePackageSchema.safeParse({
			...platinumShaped(),
			defaults,
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues).toContainEqual(
			expect.objectContaining({
				path: ["defaults", "measurements", "hyperCard", "fontSize"],
				message: "must be at most 72",
			}),
		);
	});

	it("rejects an id that is not kebab-case", () => {
		for (const id of ["Not Kebab", "a--b", "-a", "a-", ""])
			expect(
				ClassicyAppearancePackageSchema.safeParse({ ...platinumShaped(), id })
					.success,
			).toBe(false);
	});

	it("strips css, options and hooks", () => {
		const result = ClassicyAppearancePackageSchema.safeParse({
			...platinumShaped(),
			css: "x",
			options: {},
			hooks: {},
		});
		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty("css");
		expect(result.data).not.toHaveProperty("options");
		expect(result.data).not.toHaveProperty("hooks");
	});

	it("accepts a nested asset tree", () =>
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				assets: { icons: { system: { alias: "/a.png" } } },
			}).success,
		).toBe(true));

	it("rejects an empty-string asset", () =>
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				assets: { icons: { a: "" } },
			}).success,
		).toBe(false));

	it("rejects an asset kind the registries do not know", () =>
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				assets: { sprites: { a: "/a.png" } },
			}).success,
		).toBe(false));

	it("validates sounds as sound packs", () => {
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				sounds: [platinumSoundPack],
			}).success,
		).toBe(true);
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				sounds: [{ id: "x", name: "X" }],
			}).success,
		).toBe(false);
	});

	it("validates knobs", () => {
		const knob = { label: "Shadow", min: 0, max: 4, default: 1 };
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				knobs: { menuFrame: { shadow: knob } },
			}).success,
		).toBe(true);
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				knobs: { menuFrame: { shadow: { ...knob, label: "" } } },
			}).success,
		).toBe(false);
	});

	it("requires min <= default <= max for every knob", () => {
		const knob = { label: "Shadow", min: 0, max: 4, default: 1 };
		const parse = (k: Record<string, unknown>) =>
			ClassicyAppearancePackageSchema.safeParse({
				...platinumShaped(),
				knobs: { menuFrame: { shadow: k } },
			});
		for (const k of [
			{ ...knob, default: 0 },
			{ ...knob, default: 4 },
			{ ...knob, min: 2, max: 2, default: 2 },
		])
			expect(parse(k).success).toBe(true);
		for (const k of [
			{ ...knob, default: 9 },
			{ ...knob, default: -1 },
			{ ...knob, min: 5, max: 4, default: 4 },
		]) {
			const result = parse(k);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual([
				"knobs",
				"menuFrame",
				"shadow",
			]);
		}
	});
});

describe("classicyKnobsToSchema", () => {
	it("classicyKnobsToSchema builds a bounded number per knob", () => {
		const schema = classicyKnobsToSchema({
			menuFrame: { shadow: { label: "Shadow", min: 0, max: 4, default: 1 } },
		});
		expect(schema.parse({})).toEqual({ menuFrame: { shadow: 1 } });
		expect(schema.safeParse({ menuFrame: { shadow: 9 } }).success).toBe(false);
		expect(schema.parse({ extra: { a: 1 } })).toEqual({
			menuFrame: { shadow: 1 },
			extra: { a: 1 },
		});
	});
});

describe("ClassicyAppearancePackageSchema icon", () => {
	const valid = platinumShaped();
	const parse = (icon: unknown) =>
		ClassicyAppearancePackageSchema.safeParse({ ...valid, icon });

	it("is optional", () => {
		expect(ClassicyAppearancePackageSchema.safeParse(valid).success).toBe(true);
	});

	it("accepts an asset source and keeps it in the parsed output", () => {
		for (const icon of [
			"/assets/platinum.png",
			"https://example.com/irix.png",
			"data:image/png;base64,AA==",
		]) {
			const result = parse(icon);
			expect(result.success, icon).toBe(true);
			expect(result.data?.icon).toBe(icon);
		}
	});

	it("refuses anything that is not an asset source", () => {
		for (const icon of ["", "javascript:alert(1)", 'a".png', 42, {}]) {
			const result = parse(icon);
			expect(result.success, String(icon)).toBe(false);
			expect(result.error?.issues.map((i) => i.path)).toContainEqual(["icon"]);
		}
	});

	it("describes the field", () => {
		expect(ClassicyAppearancePackageSchema.shape.icon.description).toMatch(
			/icon/,
		);
	});
});

describe("ClassicyAppearancePackageSchema apps", () => {
	const valid = platinumShaped();

	it("accepts per-app overrides", () => {
		expect(
			ClassicyAppearancePackageSchema.safeParse({
				...valid,
				apps: {
					"MoviePlayer.app": {
						name: "Media Player",
						icon: "data:image/png;base64,AA==",
					},
				},
			}).success,
		).toBe(true);
	});

	it("refuses a script icon, unknown keys and forbidden ids", () => {
		for (const apps of [
			{ "A.app": { icon: "javascript:alert(1)" } },
			{ "A.app": { label: "x" } },
			JSON.parse('{"__proto__": {"name": "X"}}'),
		]) {
			expect(
				ClassicyAppearancePackageSchema.safeParse({ ...valid, apps }).success,
			).toBe(false);
		}
	});

	it("describes the field", () => {
		expect(ClassicyAppearancePackageSchema.shape.apps.description).toMatch(
			/app id/,
		);
	});

	// K 1.1 review, Minor 1: pin what the guard and the record refuse.
	const appsIssues = (apps: unknown) => {
		const result = ClassicyAppearancePackageSchema.safeParse({
			...valid,
			apps,
		});
		return result.success ? [] : result.error.issues;
	};

	const nullPrototype = (entries: Record<string, unknown>) =>
		Object.assign(Object.create(null), entries);

	it.each([
		["__proto__", JSON.parse('{"__proto__": {"name": "X"}}')],
		["constructor", { constructor: { name: "X" } }],
		["prototype", { prototype: { name: "X" } }],
		[
			"__proto__ (null-prototype map)",
			JSON.parse('{"__proto__": {"name": "X"}}', (_key, value) =>
				typeof value === "object" && value !== null
					? Object.assign(Object.create(null), value)
					: value,
			),
		],
		["constructor (null-prototype map)", nullPrototype({ constructor: {} })],
	])("refuses the app id %s at the apps path", (_id, apps) => {
		const issues = appsIssues(apps);
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toEqual(["apps"]);
		expect(issues[0].message).toMatch(/__proto__, constructor or prototype/);
	});

	it("accepts a null-prototype map of valid overrides", () => {
		expect(
			appsIssues(nullPrototype({ "A.app": { name: "A" }, "B.app": {} })),
		).toEqual([]);
	});

	it.each([
		["__proto__", JSON.parse('{"A.app": {"__proto__": {"name": "X"}}}')],
		["constructor", { "A.app": { constructor: "X" } }],
		["prototype", { "A.app": { prototype: "X" } }],
	])("refuses the entry key %s", (_key, apps) => {
		const issues = appsIssues(apps);
		expect(issues.length).toBeGreaterThan(0);
		expect(issues[0].path).toEqual(["apps", "A.app"]);
	});

	it.each([
		["_x"],
		["A:B"],
		[" Pad"],
		[""],
		["x".repeat(65)],
		["Pad "],
		["Pad\t"],
		["A\nB"],
		["A\u0000B"],
		["A\u001fB"],
		["A\u007fB"],
		["A\u0080B"],
		["A\u009fB"],
		["A\u2028B"],
		["A\u2029B"],
		["A\u202aB"],
		["A\u202eB"],
		["A\u2066B"],
		["A\u2069B"],
		["A\u200bB"],
		["A\u200eB"],
		["A\u200fB"],
		["A\u061cB"],
		["A\u2060B"],
		["A\u00adB"],
		["A\ufeffB"],
		// K-R13: checked by code point, so astral characters are seen too.
		// Tag characters (invisible "ASCII smuggling").
		["A\u{E0000}B"],
		["SimpleText\u{E0020}"],
		["A\u{E007F}B"],
		// The invisible math operators.
		["A\u2061B"],
		["A\u2064B"],
		// The Hangul fillers, which draw as blanks.
		["A\u115fB"],
		["A\u1160B"],
		["A\u3164B"],
		["A\uffa0B"],
		// Variation selectors, but VS16 right after an emoji.
		["A\ufe00B"],
		["A\ufe0eB"],
		["A\ufe0fB"],
		["\ufe0fA"],
		["\u2764\ufe0e"],
		["\u2764\ufe0f\ufe0f"],
		["\u2764\u200d\ufe0f"],
		["A\u{E0100}B"],
		["A\u{E01EF}B"],
		["\u2764\u{E0100}"],
		["prototype"],
	])("refuses the name %j", (name) => {
		expect(appsIssues({ "A.app": { name } })[0]?.path).toEqual([
			"apps",
			"A.app",
			"name",
		]);
	});

	it.each([
		["a_x"],
		["x".repeat(64)],
		["Media Player"],
		["Caf\u00e9"],
		// Just outside each refused code point or range.
		["A\u00acB"],
		["A\u00aeB"],
		["A\u061bB"],
		["A\u061dB"],
		["A\u200cB"],
		["A\u200dB"],
		["A\u2010B"],
		["A\u202fB"],
		["A\u205fB"],
		["A\u2065B"],
		["A\u206aB"],
		["A\u115eB"],
		["A\u1161B"],
		["A\u3163B"],
		["A\u3165B"],
		["A\uff9fB"],
		["A\uffa1B"],
		["A\ufdfcB"],
		["A\ufe10B"],
		["A\u{DFFFF}B"],
		["A\u{E0080}B"],
		["A\u{E00FF}B"],
		["A\u{E01F0}B"],
		// Emoji: a ZWJ sequence, VS16 after an emoji (alone, inside a ZWJ
		// sequence, and twice in one), and a keycap.
		["\u{1F468}\u200d\u{1F469}\u200d\u{1F467}"],
		["\u2764\ufe0f"],
		["\u{1F3F3}\ufe0f\u200d\u{1F308}"],
		["\u{1F441}\ufe0f\u200d\u{1F5E8}\ufe0f"],
		["1\ufe0f\u20e3"],
		["Media Player \u2764\ufe0f"],
	])("accepts the name %j", (name) => {
		expect(appsIssues({ "A.app": { name } })).toEqual([]);
	});

	it.each([
		["", />=1 characters/],
		["x".repeat(65), /<=64 characters/],
	])("reports the length of the name %j, not the file-name rules", (name, bound) => {
		const issues = appsIssues({ "A.app": { name } });
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toEqual(["apps", "A.app", "name"]);
		expect(issues[0].message).toMatch(bound);
		expect(issues[0].message).not.toMatch(/leading _/);
	});

	it.each([
		[""],
		[" Plays."],
		["Plays. "],
		["x".repeat(513)],
	])("refuses the description %j", (description) => {
		expect(appsIssues({ "A.app": { description } })[0]?.path).toEqual([
			"apps",
			"A.app",
			"description",
		]);
	});

	it.each([
		["x"],
		["x".repeat(512)],
		["Plays movies and sound."],
	])("accepts the description %j", (description) => {
		expect(appsIssues({ "A.app": { description } })).toEqual([]);
	});
});

// The Windows shell's layout keys (plan 0020-w98 §1). Every one is optional,
// and absent means today's behavior.
describe("ClassicyAppearanceLayoutSchema shell keys", () => {
	// A window-placement layout with a taskbar, so every shell key is allowed.
	const shell = (extra: Record<string, unknown> = {}) => ({
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "window" },
		desktop: { iconGridOrigin: "top-left" },
		taskbar: {},
		...extra,
	});
	const issues = (layout: unknown) => {
		const result = ClassicyAppearanceLayoutSchema.safeParse(layout);
		return result.success
			? []
			: result.error.issues.map(({ path, message }) => ({ path, message }));
	};
	const TEXT_RULE = /one line of text with no space at either end/;

	it.each([
		["collapse", ["shade", "minimize"], ["roll", "Minimize", "", true]],
		["zoom", ["standard", "maximize"], ["full", "Maximize", 1]],
		["titleDoubleClick", ["collapse", "zoom"], ["close", "maximize", null]],
		["frameEdges", ["move", "resize"], ["size", "Resize", false]],
		["systemMenu", [false, true], ["true", 1, null]],
		["captionTooltips", [false, true], ["yes", 0, "false"]],
	])("window.%s takes %j and refuses %j", (key, good, bad) => {
		const window = (value: unknown) => ({
			growBoxCorner: "bottom-right",
			[key]: value,
		});
		for (const value of good) {
			const result = ClassicyAppearanceLayoutSchema.safeParse(
				shell({ window: window(value) }),
			);
			expect(result.success, JSON.stringify(value)).toBe(true);
			expect(result.data?.window).toEqual(window(value));
		}
		for (const value of bad) {
			expect(
				issues(shell({ window: window(value) })),
				JSON.stringify(value),
			).toEqual([{ path: ["window", key], message: expect.any(String) }]);
		}
	});

	it("leaves every window key optional", () => {
		expect(issues(shell())).toEqual([]);
		expect(ClassicyAppearanceLayoutSchema.parse(shell()).window).toStrictEqual({
			growBoxCorner: "bottom-right",
		});
	});

	it.each([["plain"], ["titled"]])("dialog.caption takes %j", (caption) => {
		expect(
			ClassicyAppearanceLayoutSchema.parse(shell({ dialog: { caption } }))
				.dialog,
		).toEqual({ caption });
	});

	it("takes a dialog group whose caption is optional", () => {
		expect(issues(shell({ dialog: {} }))).toEqual([]);
		expect(issues(shell({ dialog: undefined }))).toEqual([]);
	});

	it.each([
		["none"],
		["Titled"],
		[""],
		[true],
	])("dialog.caption refuses %j", (caption) => {
		expect(issues(shell({ dialog: { caption } }))).toEqual([
			{ path: ["dialog", "caption"], message: expect.any(String) },
		]);
	});

	it("refuses a dialog group that is not an object", () => {
		expect(issues(shell({ dialog: "titled" }))).toEqual([
			{ path: ["dialog"], message: expect.any(String) },
		]);
	});

	it.each([
		[{}],
		[{ startLabel: "Start" }],
		[{ startBanner: { title: "Windows" } }],
		[{ startBanner: { title: "Windows", edition: "98" } }],
		[
			{
				startLabel: "Start",
				startBanner: { title: "Windows", edition: "95" },
			},
		],
	])("takes the taskbar %j", (taskbar) => {
		const result = ClassicyAppearanceLayoutSchema.safeParse(shell({ taskbar }));
		expect(result.success).toBe(true);
		expect(result.data?.taskbar).toEqual(taskbar);
	});

	it.each([
		[true, ["taskbar"]],
		["Start", ["taskbar"]],
		[{ startLabel: 7 }, ["taskbar", "startLabel"]],
		[{ startBanner: "Windows 98" }, ["taskbar", "startBanner"]],
		[{ startBanner: {} }, ["taskbar", "startBanner", "title"]],
		[{ startBanner: { edition: "98" } }, ["taskbar", "startBanner", "title"]],
		[
			{ startBanner: { title: "Windows", edition: 98 } },
			["taskbar", "startBanner", "edition"],
		],
	])("refuses the taskbar %j", (taskbar, at) => {
		expect(issues(shell({ taskbar }))).toEqual([
			{ path: at, message: expect.any(String) },
		]);
	});

	it("has no taskbar edge: an unknown taskbar key is dropped", () => {
		expect(
			ClassicyAppearanceLayoutSchema.parse(
				shell({ taskbar: { startLabel: "Start", edge: "top" } }),
			).taskbar,
		).toStrictEqual({ startLabel: "Start" });
	});

	// Each text the layout carries: the Start button's label and both parts of
	// the Start menu's banner.
	const TEXTS: [string, (text: unknown) => unknown, (string | number)[]][] = [
		["startLabel", (startLabel) => ({ startLabel }), ["taskbar", "startLabel"]],
		[
			"startBanner.title",
			(title) => ({ startBanner: { title } }),
			["taskbar", "startBanner", "title"],
		],
		[
			"startBanner.edition",
			(edition) => ({ startBanner: { title: "Windows", edition } }),
			["taskbar", "startBanner", "edition"],
		],
	];

	describe.each(TEXTS)("taskbar.%s", (_name, taskbar, at) => {
		it.each([
			["x"],
			["x".repeat(24)],
			["Start"],
			["D\u00e9marrer"],
			["Start Menu"],
			["\u30b9\u30bf\u30fc\u30c8"],
			["\u05d4\u05ea\u05d7\u05dc"],
		])("takes %j", (text) => {
			expect(issues(shell({ taskbar: taskbar(text) }))).toEqual([]);
		});

		it.each([
			["", />=1 characters/],
			["x".repeat(25), /<=24 characters/],
		])("refuses %j by its length", (text, bound) => {
			expect(issues(shell({ taskbar: taskbar(text) }))).toEqual([
				{ path: at, message: expect.stringMatching(bound) },
			]);
		});

		it.each([
			[" Start"],
			["Start "],
			["\tStart"],
			["Start\n"],
			["\u00a0Start"],
			["St\nart"],
			["St\rart"],
			["St\u0000art"],
			["St\u001fart"],
			["St\u007fart"],
			["St\u0085art"],
			["St\u009fart"],
			["St\u2028art"],
			["St\u2029art"],
		])("refuses %j as no single line of text", (text) => {
			expect(issues(shell({ taskbar: taskbar(text) }))).toEqual([
				{ path: at, message: expect.stringMatching(TEXT_RULE) },
			]);
		});
	});

	describe("refinement 1: a taskbar requires window placement", () => {
		it("refuses a taskbar beside a screen menu bar, naming the rule", () => {
			expect(issues(shell({ menuBar: { placement: "screen" } }))).toEqual([
				{
					path: ["taskbar"],
					message: expect.stringMatching(
						/^requires menuBar\.placement "window": a screen menu bar beside a taskbar would repeat its Apple, Help and App Switcher menus$/,
					),
				},
			]);
		});

		it("takes a taskbar under window placement, and window placement without one", () => {
			expect(issues(shell())).toEqual([]);
			expect(issues(shell({ taskbar: undefined }))).toEqual([]);
		});

		it("reports the rule at the package's layout path", () => {
			const input = platinumShaped();
			(input.layout as Record<string, unknown>).taskbar = {};
			const result = ClassicyAppearancePackageSchema.safeParse(input);
			expect(result.error?.issues.map((i) => i.path)).toEqual([
				["layout", "taskbar"],
			]);
		});
	});

	describe("refinement 2: minimize requires a taskbar", () => {
		const minimize = (extra: Record<string, unknown>) =>
			shell({
				window: { growBoxCorner: "bottom-right", collapse: "minimize" },
				...extra,
			});

		it("refuses minimize without a taskbar, naming the rule", () => {
			expect(issues(minimize({ taskbar: undefined }))).toEqual([
				{
					path: ["window", "collapse"],
					message: expect.stringMatching(
						/^"minimize" requires a taskbar: a minimized window comes back only through its taskbar button$/,
					),
				},
			]);
		});

		it("takes minimize with a taskbar, and shade without one", () => {
			expect(issues(minimize({}))).toEqual([]);
			expect(
				issues(
					shell({
						window: { growBoxCorner: "bottom-right", collapse: "shade" },
						taskbar: undefined,
					}),
				),
			).toEqual([]);
		});

		it("reports only the rule that fails: a screen bar with a taskbar and minimize", () => {
			expect(
				issues(minimize({ menuBar: { placement: "screen" } })).map(
					(issue) => issue.path,
				),
			).toEqual([["taskbar"]]);
			expect(
				issues(
					minimize({ menuBar: { placement: "screen" }, taskbar: undefined }),
				).map((issue) => issue.path),
			).toEqual([["window", "collapse"]]);
		});

		it("reports the rule at the package's layout path", () => {
			const input = platinumShaped();
			(
				input.layout as Record<string, Record<string, unknown>>
			).window.collapse = "minimize";
			const result = ClassicyAppearancePackageSchema.safeParse(input);
			expect(result.error?.issues.map((i) => i.path)).toEqual([
				["layout", "window", "collapse"],
			]);
		});
	});

	it("takes the whole Windows shell and parses it to itself", () => {
		const windows = {
			window: {
				growBoxCorner: "bottom-right",
				centering: "wholePixel",
				collapse: "minimize",
				zoom: "maximize",
				titleDoubleClick: "zoom",
				frameEdges: "resize",
				systemMenu: true,
				captionTooltips: true,
			},
			menuBar: { placement: "window" },
			desktop: { iconGridOrigin: "top-left" },
			scrollBar: { fitsBars: "shown" },
			fileDialog: {
				frame: "movable",
				navigation: "flat",
				saveName: "selected",
			},
			taskbar: {
				startLabel: "Start",
				startBanner: { title: "Windows", edition: "98" },
			},
			dialog: { caption: "titled" },
		};
		expect(ClassicyAppearanceLayoutSchema.parse(windows)).toStrictEqual(
			windows,
		);
	});
});

describe("the shipped layouts", () => {
	// Read from the JSON, not the package entry, which would register System 7
	// and Windows 98 and so change getAllThemes() for this file's other tests.
	const layoutOf = (file: string): unknown =>
		JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")).layout;

	it.each([
		["Platinum", "packages/appearance/platinum/src/platinum.json"],
		["System 7", "packages/appearance/system7/src/system7.json"],
		["Windows 98", "packages/appearance/windows98/src/windows98.json"],
	])("%s's layout parses to itself", (_name, file) => {
		const layout = layoutOf(file);
		expect(layout).toBeTypeOf("object");
		expect(ClassicyAppearanceLayoutSchema.parse(layout)).toStrictEqual(layout);
	});

	it("Platinum's registered layout is its JSON's", () => {
		expect(getClassicyAppearancePackage("platinum")?.layout).toStrictEqual(
			layoutOf("packages/appearance/platinum/src/platinum.json"),
		);
	});

	it("Storybook's mirrored layout parses to itself", async () => {
		// Registers the package; unregistered at once, so no other test here
		// sees it in getAllThemes().
		const { MIRRORED_APPEARANCE_PACKAGE_ID } = await import(
			"../../storybook/.storybook/MirroredPackage"
		);
		try {
			const layout = getClassicyAppearancePackage(
				MIRRORED_APPEARANCE_PACKAGE_ID,
			)?.layout;
			expect(layout?.menuBar.placement).toBe("window");
			expect(ClassicyAppearanceLayoutSchema.parse(layout)).toStrictEqual(
				layout,
			);
		} finally {
			unregisterClassicyAppearancePackage(MIRRORED_APPEARANCE_PACKAGE_ID);
		}
	});
});
