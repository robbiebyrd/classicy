import { describe, expect, it } from "vitest";
import {
	CLASSICY_FORBIDDEN_KEYS,
	isClassicyPlainObject,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceKeyGuards.internal";
import { parseClassicyAppearanceOptionPath } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions";
import { isThemeMetricFamilyTarget } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";

// One guard and one denylist for both theme write paths (the option path and
// the metric family form), so the two can never drift apart.
describe("ClassicyAppearanceKeyGuards", () => {
	it("denies the keys that reach an object's prototype", () => {
		expect([...CLASSICY_FORBIDDEN_KEYS].sort()).toEqual([
			"__proto__",
			"constructor",
			"prototype",
		]);
	});

	it("freezes the denylist, so no importer can splice the guard away", () => {
		expect(Object.isFrozen(CLASSICY_FORBIDDEN_KEYS)).toBe(true);
	});

	it("accepts only plain objects", () => {
		expect(isClassicyPlainObject({})).toBe(true);
		expect(isClassicyPlainObject(Object.create(null))).toBe(true);
		expect(isClassicyPlainObject([])).toBe(false);
		expect(isClassicyPlainObject(null)).toBe(false);
		expect(isClassicyPlainObject(3)).toBe(false);
		expect(isClassicyPlainObject(new Date())).toBe(false);
		expect(isClassicyPlainObject(Object.create({}))).toBe(false);
	});

	it("both write paths refuse every denied key", () => {
		for (const key of CLASSICY_FORBIDDEN_KEYS) {
			expect(parseClassicyAppearanceOptionPath(`desktop.${key}`)).toBe(
				undefined,
			);
			expect(isThemeMetricFamilyTarget({ family: key, key: "x" })).toBe(false);
			expect(isThemeMetricFamilyTarget({ family: "strip", key })).toBe(false);
		}
	});
});
