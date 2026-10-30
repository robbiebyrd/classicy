import { describe, expect, it } from "vitest";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyThemeWithPartialMetrics } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";

/** A theme as a pre-metrics build persisted it: `measurements.window` with
 * its four original keys and nothing else. */
const stripMetrics = (theme: ClassicyTheme): ClassicyTheme => {
	const copy = JSON.parse(
		JSON.stringify(theme),
	) as ClassicyThemeWithPartialMetrics;
	const { borderSize, controlSize, paddingSize, scrollbarSize } =
		theme.measurements.window;
	copy.measurements = {
		window: { borderSize, controlSize, paddingSize, scrollbarSize },
	};
	return copy as unknown as ClassicyTheme;
};

/** Default state whose active, built-in and custom themes all lack metrics. */
const strippedState = (): ClassicyStore => {
	const appearance = DefaultAppManagerState.System.Manager.Appearance;
	return {
		...DefaultAppManagerState,
		System: {
			...DefaultAppManagerState.System,
			Manager: {
				...DefaultAppManagerState.System.Manager,
				Appearance: {
					...appearance,
					activeTheme: stripMetrics(appearance.activeTheme),
					availableThemes: (appearance.availableThemes ?? []).map(stripMetrics),
					customThemes: [
						{
							...stripMetrics(appearance.activeTheme),
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

describe("migrateClassicyState — theme metrics", () => {
	it("heals activeTheme, availableThemes and customThemes", () => {
		const migrated = migrateClassicyState(strippedState());
		const appearance = migrated.System.Manager.Appearance;
		expect(appearance.activeTheme.measurements.layout.itemGap).toBe(4);
		expect(appearance.activeTheme.measurements.window.titleBarHeight).toBe(19);
		for (const theme of appearance.availableThemes ?? []) {
			expect(theme.measurements.button.gap).toBe(12);
		}
		expect(appearance.customThemes?.[0]?.measurements.groupBox.gap).toBe(12);
		expect(
			(getThemeVars(appearance.activeTheme) as Record<string, string>)[
				"--layout-item-gap"
			],
		).toBe("4px");
	});

	it("heals knob families from the package defaults", () => {
		const migrated = migrateClassicyState(strippedState());
		const appearance = migrated.System.Manager.Appearance;
		expect(appearance.activeTheme.measurements.pager.cellHeight).toBe(36);
		expect(
			(getThemeVars(appearance.activeTheme) as Record<string, string>)[
				"--pager-cell-height"
			],
		).toBe("36px");
		for (const theme of appearance.availableThemes ?? []) {
			expect(theme.measurements.controlStrip.cellHeight, theme.id).toBe(22);
		}
		expect(
			appearance.customThemes?.[0]?.measurements.balloonHelp.tailWidth,
		).toBe(20);
	});

	it("returns the same object when themes are complete", () => {
		expect(migrateClassicyState(DefaultAppManagerState)).toBe(
			DefaultAppManagerState,
		);
	});

	it("does not mutate the input", () => {
		const state = deepFreeze(strippedState());
		expect(() => migrateClassicyState(state)).not.toThrow();
		expect(
			(
				state.System.Manager.Appearance
					.activeTheme as ClassicyThemeWithPartialMetrics
			).measurements?.layout,
		).toBeUndefined();
	});

	it("mergeClassicyState result is healed", () => {
		const stripped = stripMetrics(
			DefaultAppManagerState.System.Manager.Appearance.activeTheme,
		);
		const merged = mergeClassicyState(DefaultAppManagerState, {
			System: { Manager: { Appearance: { availableThemes: [stripped] } } },
		});
		const themes = merged.System.Manager.Appearance.availableThemes ?? [];
		expect(themes).toHaveLength(1);
		expect(themes[0].measurements.button.gap).toBe(12);
	});
});
