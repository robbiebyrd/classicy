import { describe, expect, it } from "vitest";
import {
	ClassicyAppearancePackageSchema,
	classicyKnobsToSchema,
} from "@/Appearance/ClassicyAppearancePackageSchema";
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
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
		["A\u2061B"],
		["A\u2065B"],
		["A\u206aB"],
		["\u{1F468}\u200d\u{1F469}\u200d\u{1F467}"],
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
