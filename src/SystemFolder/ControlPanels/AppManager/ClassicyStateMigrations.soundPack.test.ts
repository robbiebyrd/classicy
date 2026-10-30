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

/** A theme as a pre-sound-pack build persisted it: `sound.name`, no `pack`. */
const withSoundName = (theme: ClassicyTheme): ClassicyTheme => {
	const copy = JSON.parse(JSON.stringify(theme)) as {
		sound: { name?: string; pack?: string; disabled: string[] };
	};
	copy.sound = { name: "platinum", disabled: ["ClassicyBeep"] };
	return copy as unknown as ClassicyTheme;
};

/** Default state whose active, built-in and custom themes all use `sound.name`. */
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
					activeTheme: withSoundName(appearance.activeTheme),
					availableThemes: (appearance.availableThemes ?? []).map(
						withSoundName,
					),
					customThemes: [
						{
							...withSoundName(appearance.activeTheme),
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

describe("migrateClassicyState — theme sound pack", () => {
	it("renames sound.name to sound.pack on activeTheme, availableThemes and customThemes", () => {
		const appearance = migrateClassicyState(strippedState()).System.Manager
			.Appearance;
		const sounds = [
			appearance.activeTheme.sound,
			...(appearance.availableThemes ?? []).map((t) => t.sound),
			...(appearance.customThemes ?? []).map((t) => t.sound),
		];
		expect(sounds.length).toBeGreaterThan(2);
		for (const sound of sounds) {
			expect(sound).toEqual({ pack: "platinum", disabled: ["ClassicyBeep"] });
			expect(Object.hasOwn(sound, "name")).toBe(false);
		}
	});

	it("returns the same object when every theme already has sound.pack", () => {
		expect(migrateClassicyState(DefaultAppManagerState)).toBe(
			DefaultAppManagerState,
		);
	});

	it("does not mutate the input", () => {
		const state = deepFreeze(strippedState());
		expect(() => migrateClassicyState(state)).not.toThrow();
		expect(
			(state.System.Manager.Appearance.activeTheme.sound as { name?: string })
				.name,
		).toBe("platinum");
	});

	it("a migrated activeTheme exports and parses as a theme file", () => {
		const migrated = migrateClassicyState(strippedState());
		const parsed = parseClassicyThemeFile(
			exportClassicyTheme(migrated.System.Manager.Appearance.activeTheme),
		);
		expect(parsed.ok).toBe(true);
	});

	it("drops a stray sound.name when the merge over defaults already supplied sound.pack", () => {
		// The real load path: persisted { name, disabled } is deep-merged over the
		// defaults' { pack, disabled } before migrating, leaving both keys.
		const persisted = JSON.parse(
			JSON.stringify(strippedState()),
		) as ClassicyStore;
		persisted.System.Manager.Appearance.activeTheme.sound = {
			name: "platinum",
			disabled: [],
		} as unknown as ClassicyTheme["sound"];
		// `never`: DeepPartial<ClassicyStore> is too deep for tsc to relate to a
		// full store ("excessively deep"); the persisted blob is untyped anyway.
		const merged = mergeClassicyState(
			DefaultAppManagerState,
			persisted as never,
		);
		const sound = merged.System.Manager.Appearance.activeTheme
			.sound as unknown as { pack?: string };
		expect(sound.pack).toBe("platinum");
		expect(Object.hasOwn(sound, "name")).toBe(false);
	});

	it("is idempotent and copy-on-write for a theme carrying both name and pack", () => {
		const state = JSON.parse(
			JSON.stringify(DefaultAppManagerState),
		) as ClassicyStore;
		state.System.Manager.Appearance.activeTheme.sound = {
			name: "platinum",
			pack: "platinum",
			disabled: [],
		} as unknown as ClassicyTheme["sound"];
		deepFreeze(state);
		const once = migrateClassicyState(state);
		expect(once.System.Manager.Appearance.activeTheme.sound).toEqual({
			pack: "platinum",
			disabled: [],
		});
		expect(migrateClassicyState(once)).toBe(once);
	});
});
