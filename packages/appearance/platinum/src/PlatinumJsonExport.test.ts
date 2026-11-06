import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearanceLayout,
	ClassicyTheme,
} from "@classicy/classicy";
import { describe, expect, expectTypeOf, it } from "vitest";
import "./index";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { type PlatinumJson, platinumJson } from "./index";
import platinumSource from "./platinum.json";

// `platinumJson` is public. The registered package shares its objects with the
// JSON it was built from (knobs, and each preset's colors, typography and
// desktop), so the export must be a frozen copy: a host that could mutate it
// would edit a registered built-in theme.
describe("the platinumJson export", () => {
	const isFrozen = (value: unknown): boolean =>
		typeof value !== "object" ||
		value === null ||
		(Object.isFrozen(value) &&
			Object.values(value).every((child) => isFrozen(child)));

	it("is deep-frozen", () => {
		expect(isFrozen(platinumJson)).toBe(true);
	});

	it("throws on mutation in strict mode", () => {
		expect(() => {
			(platinumJson.knobs as unknown as Record<string, unknown>).extra = 1;
		}).toThrow(TypeError);
		expect(() => {
			(
				platinumJson.presets[0].color as unknown as { [k: string]: unknown }
			).extra = 1;
		}).toThrow(TypeError);
	});

	it("is a copy: the registered package is not the export's objects", () => {
		const registered = getClassicyAppearancePackage("platinum");
		expect(registered?.knobs).not.toBe(platinumJson.knobs);
		expect(registered?.presets?.[0].color).not.toBe(
			platinumJson.presets[0].color,
		);
		// ...and the registered data was not frozen by the export.
		expect(Object.isFrozen(registered?.knobs)).toBe(
			Object.isFrozen(platinumSource.knobs),
		);
	});

	it("equals the source data", () => {
		expect(platinumJson).toEqual(platinumSource);
	});
});

// Its public type is the core's own types, not the JSON literal TypeScript
// infers (`growBoxCorner: string`, `disabled: never[]`), which no host could
// hand back to the core: a preset is a ClassicyTheme, the layout a
// ClassicyAppearanceLayout. Checked by the gate's `tsc --noEmit -p .`, which
// type-checks this file: the assignments below compile without a cast.
describe("the platinumJson export's type", () => {
	it("is PlatinumJson, on the core's types", () => {
		const theme: ClassicyTheme = platinumJson.presets[0];
		const defaults: ClassicyTheme = platinumJson.defaults;
		const layout: ClassicyAppearanceLayout = platinumJson.layout;
		const knobs: ClassicyAppearanceKnobs = platinumJson.knobs;
		expect([theme, defaults, layout, knobs]).toHaveLength(4);
		expectTypeOf(platinumJson).toEqualTypeOf<PlatinumJson>();
		expectTypeOf(platinumJson.layout.window.growBoxCorner).toEqualTypeOf<
			ClassicyAppearanceLayout["window"]["growBoxCorner"]
		>();
	});

	// The JSON's top-level keys are the type's, no more and no fewer.
	it("has the JSON's top-level keys", () => {
		const keys: Array<keyof PlatinumJson> = [
			"id",
			"name",
			"defaults",
			"presets",
			"layout",
			"knobs",
		];
		expect(Object.keys(platinumSource).sort()).toEqual([...keys].sort());
		expectTypeOf<keyof PlatinumJson>().toEqualTypeOf<
			keyof typeof platinumSource
		>();
	});
});
