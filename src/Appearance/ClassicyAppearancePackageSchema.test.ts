import { platinumSoundPack } from "@classicy/appearance-platinum";
import { describe, expect, it } from "vitest";
import {
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

	// A live thumb drag's snap-back and its distance (the WIG audit's 6.10):
	// optional, Platinum's and System 7's layouts declaring neither.
	it("takes optional scrollBar.liveSnapBack and snapBackScale, and refuses bad values", () => {
		const input = platinumShaped();
		(input.layout as Record<string, unknown>).scrollBar = {
			liveSnapBack: true,
			snapBackScale: { across: 8, along: 2 },
		};
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.scrollBar).toEqual({
			liveSnapBack: true,
			snapBackScale: { across: 8, along: 2 },
		});
		for (const [scrollBar, key] of [
			[{ liveSnapBack: "yes" }, "liveSnapBack"],
			[{ snapBackScale: { across: 8 } }, "snapBackScale"],
			[{ snapBackScale: { across: -1, along: 2 } }, "snapBackScale"],
			[{ snapBackScale: { across: 8, along: 65 } }, "snapBackScale"],
		] as const) {
			const bad = platinumShaped();
			(bad.layout as Record<string, unknown>).scrollBar = scrollBar;
			const parsed = ClassicyAppearancePackageSchema.safeParse(bad);
			expect(parsed.success, JSON.stringify(scrollBar)).toBe(false);
			expect(
				parsed.error?.issues.some(
					(i) => i.path[1] === "scrollBar" && i.path[2] === key,
				),
				JSON.stringify(scrollBar),
			).toBe(true);
		}
	});

	// The menus' time-outs and their keyboard's treatment of dimmed items
	// (the WIG audit's 7.6 / 14.4, 7.7 and 7.12): optional, so Platinum's
	// layout, which declares none, still parses, and each kept as given.
	it("takes an optional menuBar.idleTimeoutMs and an optional menu group", () => {
		for (const [menuBar, menu] of [
			[{ placement: "screen" }, undefined],
			[{ placement: "screen", idleTimeoutMs: 0 }, {}],
			[{ placement: "window", idleTimeoutMs: 15000 }, { submenuDelayMs: 0 }],
			[{ placement: "screen" }, { disabledItems: "skip" }],
		]) {
			const input = platinumShaped();
			const layout = input.layout as Record<string, unknown>;
			layout.menuBar = menuBar;
			layout.menu = menu;
			expect(
				ClassicyAppearancePackageSchema.safeParse(input).success,
				JSON.stringify({ menuBar, menu }),
			).toBe(true);
		}
		const input = platinumShaped();
		const layout = input.layout as Record<string, unknown>;
		layout.menuBar = { placement: "screen", idleTimeoutMs: 0 };
		layout.menu = { submenuDelayMs: 400, disabledItems: "browse" };
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.menuBar).toEqual({
			placement: "screen",
			idleTimeoutMs: 0,
		});
		expect(result.data?.layout.menu).toEqual({
			submenuDelayMs: 400,
			disabledItems: "browse",
		});
	});

	it("rejects a negative or fractional menu time-out and an unknown disabledItems", () => {
		for (const [path, menuBar, menu] of [
			[
				["layout", "menuBar", "idleTimeoutMs"],
				{ placement: "screen", idleTimeoutMs: -1 },
				undefined,
			],
			[
				["layout", "menu", "submenuDelayMs"],
				{ placement: "screen" },
				{ submenuDelayMs: 0.5 },
			],
			[
				["layout", "menu", "disabledItems"],
				{ placement: "screen" },
				{ disabledItems: "hide" },
			],
		] as const) {
			const input = platinumShaped();
			const layout = input.layout as Record<string, unknown>;
			layout.menuBar = menuBar;
			layout.menu = menu;
			const result = ClassicyAppearancePackageSchema.safeParse(input);
			expect(result.success, path.join(".")).toBe(false);
			expect(result.error?.issues.map((i) => i.path)).toContainEqual(path);
		}
	});

	// Access keys, the shortcuts' spelling and empty submenus (the WIG
	// audit's 7.1, 8.9 and 7.15): optional, each kept as given.
	it("takes optional menu.accessKeys, menu.shortcutSpelling and menu.emptySubmenus, and refuses another value", () => {
		const input = platinumShaped();
		const layout = input.layout as Record<string, unknown>;
		layout.menu = {
			accessKeys: "auto",
			shortcutSpelling: "names",
			emptySubmenus: "placeholder",
		};
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.menu).toEqual({
			accessKeys: "auto",
			shortcutSpelling: "names",
			emptySubmenus: "placeholder",
		});
		for (const menu of [
			{ accessKeys: "explicit" },
			{ shortcutSpelling: "glyphs" },
			{ emptySubmenus: "leaf" },
		]) {
			const ok = platinumShaped();
			(ok.layout as Record<string, unknown>).menu = menu;
			expect(ClassicyAppearancePackageSchema.safeParse(ok).success).toBe(true);
		}
		for (const [key, value] of [
			["accessKeys", "ampersand"],
			["shortcutSpelling", "words"],
			["emptySubmenus", "hidden"],
		]) {
			const bad = platinumShaped();
			(bad.layout as Record<string, unknown>).menu = { [key]: value };
			const refused = ClassicyAppearancePackageSchema.safeParse(bad);
			expect(refused.success, key).toBe(false);
			expect(refused.error?.issues.map((i) => i.path)).toContainEqual([
				"layout",
				"menu",
				key,
			]);
		}
	});

	// The tree's keys and the help's placement (the WIG audit's 7.21 and
	// 7.27): optional groups with optional keys, each kept as given.
	it("takes optional tree.keys and balloonHelp.placement, and refuses another value", () => {
		const input = platinumShaped();
		const layout = input.layout as Record<string, unknown>;
		layout.tree = { keys: "windows" };
		layout.balloonHelp = { placement: "pointer" };
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.tree).toEqual({ keys: "windows" });
		expect(result.data?.layout.balloonHelp).toEqual({ placement: "pointer" });
		for (const [group, value] of [
			["tree", {}],
			["tree", { keys: "mac" }],
			["balloonHelp", {}],
			["balloonHelp", { placement: "anchor" }],
		] as const) {
			const ok = platinumShaped();
			(ok.layout as Record<string, unknown>)[group] = value;
			expect(ClassicyAppearancePackageSchema.safeParse(ok).success).toBe(true);
		}
		for (const [group, key, value] of [
			["tree", "keys", "emacs"],
			["balloonHelp", "placement", "cursor"],
		]) {
			const bad = platinumShaped();
			(bad.layout as Record<string, unknown>)[group] = { [key]: value };
			const refused = ClassicyAppearancePackageSchema.safeParse(bad);
			expect(refused.success, key).toBe(false);
			expect(refused.error?.issues.map((i) => i.path)).toContainEqual([
				"layout",
				group,
				key,
			]);
		}
	});

	// The mouse conventions (the WIG audit's 5.6, 5.7, 4.8-4.10, 1.18, and
	// 5.3, 5.5, 5.9 and A.9's `selection.selectOn`, `dragRange` and
	// `modifiers`): `selection.secondaryButton`, `contextMenu.openOn` and
	// `input.escapeCancels` optional groups with optional keys, `mouse` a
	// top-level keyword, each kept as given.
	it("takes optional selection, contextMenu, mouse and input, and refuses another value", () => {
		const input = platinumShaped();
		const layout = input.layout as Record<string, unknown>;
		layout.selection = {
			secondaryButton: "select",
			selectOn: "press",
			dragRange: true,
			modifiers: "windows",
		};
		layout.contextMenu = { openOn: "release" };
		layout.mouse = "windows";
		layout.input = { escapeCancels: true };
		const result = ClassicyAppearancePackageSchema.safeParse(input);
		expect(result.success).toBe(true);
		expect(result.data?.layout.selection).toEqual({
			secondaryButton: "select",
			selectOn: "press",
			dragRange: true,
			modifiers: "windows",
		});
		expect(result.data?.layout.contextMenu).toEqual({ openOn: "release" });
		expect(result.data?.layout.mouse).toBe("windows");
		expect(result.data?.layout.input).toEqual({ escapeCancels: true });
		for (const [key, value] of [
			["selection", {}],
			["selection", { secondaryButton: "menu" }],
			["selection", { selectOn: "click" }],
			["selection", { dragRange: false }],
			["selection", { modifiers: "mac" }],
			["contextMenu", {}],
			["contextMenu", { openOn: "event" }],
			["mouse", "mac"],
			["input", {}],
			["input", { escapeCancels: false }],
		] as const) {
			const ok = platinumShaped();
			(ok.layout as Record<string, unknown>)[key] = value;
			expect(ClassicyAppearancePackageSchema.safeParse(ok).success, key).toBe(
				true,
			);
		}
		for (const [group, key, value] of [
			["selection", "secondaryButton", "both"],
			["selection", "selectOn", "release"],
			["selection", "dragRange", "yes"],
			["selection", "modifiers", "linux"],
			["contextMenu", "openOn", "press"],
			["input", "escapeCancels", "yes"],
		]) {
			const bad = platinumShaped();
			(bad.layout as Record<string, unknown>)[group] = { [key]: value };
			const refused = ClassicyAppearancePackageSchema.safeParse(bad);
			expect(refused.success, key).toBe(false);
			expect(refused.error?.issues.map((i) => i.path)).toContainEqual([
				"layout",
				group,
				key,
			]);
		}
		const badMouse = platinumShaped();
		(badMouse.layout as Record<string, unknown>).mouse = "pen";
		const refused = ClassicyAppearancePackageSchema.safeParse(badMouse);
		expect(refused.success).toBe(false);
		expect(refused.error?.issues.map((i) => i.path)).toContainEqual([
			"layout",
			"mouse",
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
