import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";

/** A theme as a build before the font-size bounds could persist it: core and
 * knob-family font sizes outside 8–72, beside a non-font knob past 72. */
const withBadSizes = (theme: ClassicyTheme): ClassicyTheme => {
	const copy = JSON.parse(JSON.stringify(theme)) as ClassicyTheme;
	copy.typography.uiSize = 400;
	copy.typography.headerSize = 0;
	copy.desktop.iconFontSize = 2;
	Object.assign(copy.measurements, {
		hyperCard: { ...copy.measurements.hyperCard, fontSize: 0 },
		appleGuide: { ...copy.measurements.appleGuide, bodyFontSize: 400 },
		// A family no package registered yet (H-R17): healed by key name.
		someVendorPkg: { titleFontSize: 500, gutter: 300 },
	});
	return copy;
};

const badState = (): ClassicyStore => {
	const appearance = DefaultAppManagerState.System.Manager.Appearance;
	return {
		...DefaultAppManagerState,
		System: {
			...DefaultAppManagerState.System,
			Manager: {
				...DefaultAppManagerState.System.Manager,
				Appearance: {
					...appearance,
					activeTheme: withBadSizes(appearance.activeTheme),
					availableThemes: (appearance.availableThemes ?? []).map(withBadSizes),
					customThemes: [
						{
							...withBadSizes(appearance.activeTheme),
							id: "custom",
							name: "Custom",
						},
					],
				},
			},
		},
	};
};

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const v of Object.values(value as object)) deepFreeze(v);
	}
	return value;
};

const themesOf = (state: ClassicyStore): ClassicyTheme[] => {
	const appearance = state.System.Manager.Appearance;
	return [
		appearance.activeTheme,
		...(appearance.availableThemes ?? []),
		...(appearance.customThemes ?? []),
	];
};

describe("migrateClassicyState — font sizes", () => {
	it("clamps core and knob-family font sizes into 8–72 on every theme", () => {
		const themes = themesOf(migrateClassicyState(badState()));
		expect(themes.length).toBeGreaterThan(2);
		for (const theme of themes) {
			expect(theme.typography.uiSize).toBe(72);
			expect(theme.typography.headerSize).toBe(8);
			expect(theme.desktop.iconFontSize).toBe(8);
			expect(theme.measurements.hyperCard.fontSize).toBe(8);
			expect(theme.measurements.appleGuide.bodyFontSize).toBe(72);
			expect(theme.measurements.someVendorPkg).toEqual({
				titleFontSize: 72,
				gutter: 300,
			});
		}
	});

	it("leaves in-range sizes and every other key as they were", () => {
		const before = badState();
		const theme =
			migrateClassicyState(before).System.Manager.Appearance.activeTheme;
		const original = before.System.Manager.Appearance.activeTheme;
		expect(theme.typography.bodySize).toBe(original.typography.bodySize);
		expect(theme.measurements.appleGuide.headerFontSize).toBe(
			original.measurements.appleGuide.headerFontSize,
		);
		expect(theme.measurements.pager).toBe(original.measurements.pager);
		expect(theme.measurements.window).toBe(original.measurements.window);
	});

	it("returns the same object when every size is already in range", () => {
		expect(migrateClassicyState(DefaultAppManagerState)).toBe(
			DefaultAppManagerState,
		);
	});

	it("is idempotent: a second pass returns the first result unchanged", () => {
		const once = migrateClassicyState(badState());
		expect(migrateClassicyState(once)).toBe(once);
	});

	it("never mutates the input (frozen store state)", () => {
		const frozen = deepFreeze(badState());
		const snapshot = JSON.stringify(frozen);
		expect(() => migrateClassicyState(frozen)).not.toThrow();
		expect(JSON.stringify(frozen)).toBe(snapshot);
	});

	it("heals persisted state through mergeClassicyState", () => {
		const persisted: unknown = JSON.parse(JSON.stringify(badState()));
		// `never`: DeepPartial<ClassicyStore> is too deep for tsc to relate to a
		// full store ("excessively deep"); the persisted blob is untyped anyway.
		const merged = mergeClassicyState(
			DefaultAppManagerState,
			persisted as never,
		);
		const theme = merged.System.Manager.Appearance.activeTheme;
		expect(theme.typography.uiSize).toBe(72);
		expect(theme.measurements.hyperCard.fontSize).toBe(8);
	});

	it("makes a healed theme exportable again", () => {
		const active = migrateClassicyState(badState()).System.Manager.Appearance
			.activeTheme;
		const parsed = parseClassicyThemeFile(exportClassicyTheme(active));
		expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
	});
});
