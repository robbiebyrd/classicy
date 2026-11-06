import { describe, expect, it } from "vitest";
import "./index";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { platinumJson } from "./index";
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
