// Platinum's built-in themes as a mounted desktop lists them. The default
// state lists none (its active theme is the core's own,
// CLASSICY_CORE_DEFAULT_THEME): the store loads before Platinum registers,
// and ClassicyDesktop loads getAllThemes() into `availableThemes` when it
// mounts. Reducer tests that start from "the default state with every
// built-in" build it here. Importing this module registers Platinum.
import "@/Appearance/Platinum";
import {
	type ClassicyTheme,
	getAllThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStore,
	type DeepPartial,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/** Platinum's 21 presets, as Platinum registered them. */
export const PLATINUM_BUILT_IN_THEMES: readonly ClassicyTheme[] =
	getAllThemes();

/**
 * A deep, unaliased copy of the default state as a mounted desktop has it:
 * Platinum's built-ins in `availableThemes` and its `default` theme active.
 */
export const defaultStateWithPlatinumThemes = (): ClassicyStore =>
	mergeClassicyState(DefaultAppManagerState, {
		System: {
			Manager: {
				Appearance: {
					availableThemes: [...PLATINUM_BUILT_IN_THEMES],
					activeTheme: PLATINUM_BUILT_IN_THEMES[0],
				},
			},
		},
	} as DeepPartial<ClassicyStore>);
