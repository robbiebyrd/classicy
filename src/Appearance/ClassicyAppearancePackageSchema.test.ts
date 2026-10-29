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
