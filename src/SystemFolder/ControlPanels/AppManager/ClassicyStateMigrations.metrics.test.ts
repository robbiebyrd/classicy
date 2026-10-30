import { describe, expect, it } from "vitest";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	type ClassicyThemeWithPartialMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
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

	// H-R17 (amends H-R2): the migration runs at store creation, before a
	// host package can register, so it fills only the core five; knob
	// families are healed at read time, from the package registered by then.
	it("heals knob families from the package defaults", () => {
		const migrated = migrateClassicyState(strippedState());
		const appearance = migrated.System.Manager.Appearance;
		const defaults = DefaultAppManagerState.System.Manager.Appearance;
		const vars = (theme: ClassicyTheme | undefined) =>
			theme && (getThemeVars(theme) as Record<string, string>);
		// The stored shape: the core five only.
		expect(appearance.activeTheme.measurements.pager).toBeUndefined();
		expect(appearance.customThemes?.[0]?.measurements.balloonHelp).toBe(
			undefined,
		);
		// What a reader sees: every variable of the unstripped theme it
		// came from, the knob families included.
		expect(vars(appearance.activeTheme)).toEqual(vars(defaults.activeTheme));
		expect(vars(appearance.activeTheme)?.["--pager-cell-height"]).toBe("36px");
		(appearance.availableThemes ?? []).forEach((theme, i) => {
			expect(Object.keys(theme.measurements), theme.id).toEqual(
				Object.keys(CLASSICY_DEFAULT_THEME_METRICS),
			);
			expect(vars(theme), theme.id).toEqual(
				vars(defaults.availableThemes?.[i]),
			);
		});
		// The custom theme is the active theme under another id and name.
		expect(vars(appearance.customThemes?.[0])).toEqual(
			vars(defaults.activeTheme),
		);
	});

	it("a host package registered after the store loads gets its own knob value", () => {
		const base = getTheme("default");
		// A theme persisted before its package declared controlStrip.
		const persistedTheme = {
			...base,
			id: "late-theme",
			package: "late-pack",
			measurements: structuredClone(CLASSICY_DEFAULT_THEME_METRICS),
		} as ClassicyTheme;
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Appearance.activeTheme = persistedTheme;
		// Store creation migrates here, before the host registers its package.
		const migrated =
			migrateClassicyState(state).System.Manager.Appearance.activeTheme;
		registerClassicyAppearancePackage({
			id: "late-pack",
			name: "Late Pack",
			css: "",
			defaults: {
				...base,
				id: "late-pack",
				name: "Late Pack",
				package: "late-pack",
				measurements: {
					...base.measurements,
					controlStrip: { ...base.measurements.controlStrip, cellHeight: 30 },
				},
			},
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		try {
			expect(
				(getThemeVars(migrated) as Record<string, string>)[
					"--control-strip-cell-height"
				],
			).toBe("30px");
		} finally {
			unregisterClassicyAppearancePackage("late-pack");
		}
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
