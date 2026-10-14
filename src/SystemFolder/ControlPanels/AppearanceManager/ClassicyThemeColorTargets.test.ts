import { describe, expect, it } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeColorTarget,
	isThemeColorTarget,
	setThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";

const freshTheme = (): ClassicyTheme => structuredClone(getTheme("default"));

describe("theme colour targets: hostile keys (CodeQL prototype pollution)", () => {
	const hostile = ["__proto__", "constructor", "prototype", "toString"];

	it("rejects prototype-ish colour keys outright", () => {
		for (const colorKey of hostile) {
			expect(isThemeColorTarget({ colorKey })).toBe(false);
			expect(isThemeColorTarget({ colorKey, index: 0 })).toBe(false);
		}
	});

	it("never writes to Object.prototype, even if validation were bypassed", () => {
		for (const colorKey of hostile) {
			const theme = freshTheme();
			setThemeColor(
				theme,
				{ colorKey } as unknown as ClassicyThemeColorTarget,
				0x123456,
			);
		}
		const probe: Record<string, unknown> = {};
		expect(probe.polluted).toBeUndefined();
		expect(Object.prototype).not.toHaveProperty("0");
		expect(({} as Record<string, unknown>)["0"]).toBeUndefined();
	});

	it("refuses an out-of-range or non-integer palette index", () => {
		const theme = freshTheme();
		const before = [...theme.color.system];
		for (const index of [-1, 7, 1.5, Number.NaN]) {
			expect(() =>
				setThemeColor(
					theme,
					{ colorKey: "system", index } as ClassicyThemeColorTarget,
					0xff0000,
				),
			).toThrow(RangeError);
		}
		expect(theme.color.system).toEqual(before);
	});

	it("still writes every in-range palette slot", () => {
		const theme = freshTheme();
		for (let index = 0; index < 7; index++) {
			setThemeColor(
				theme,
				{ colorKey: "theme", index } as ClassicyThemeColorTarget,
				index + 1,
			);
		}
		expect(theme.color.theme).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});
});
