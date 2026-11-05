import { castDraft, produce } from "immer";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { resolveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	listClassicyAppearancePackages,
	subscribeClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { withPortableClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyTheme } from "../AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeReference,
	classicyBuiltInThemeReference,
	isClassicyThemeReference,
	knownClassicyThemePackage,
	refreshedClassicyActiveTheme,
} from "../AppearanceManager/ClassicyBuiltInThemes.internal";
import {
	classicyThemeMeasurementDefaults,
	withoutDefaultThemeMeasurements,
} from "../AppearanceManager/ClassicyThemeMetrics";
import type { ClassicyActionTrust } from "./ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	type DeepPartial,
	DefaultAppManagerState,
	mergeClassicyState,
} from "./ClassicyAppManager";
import { validateAppStateForAction } from "./ClassicyAppManifest";
import { migrateClassicyState } from "./ClassicyStateMigrations";

let hydratedFromStorage = false;

/**
 * The persisted reference to a built-in active theme whose package was not
 * registered when the store loaded (H-R17): the active theme holds the
 * default theme's data under that id until the package registers and
 * `refreshThemesOnRegistration` resolves it, and is saved as the reference
 * meanwhile, never as that stand-in.
 */
let pendingActiveThemeReference: ClassicyThemeReference | null = null;

/** The pending reference, while the active theme is still the one it names. */
const pendingReferenceFor = (
	active: ClassicyTheme | undefined,
): ClassicyThemeReference | null =>
	pendingActiveThemeReference &&
	active?.id === pendingActiveThemeReference.id &&
	(active.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) ===
		pendingActiveThemeReference.package
		? pendingActiveThemeReference
		: null;

/**
 * `state` with its active theme refreshed from the code
 * (`refreshedClassicyActiveTheme`); `reference` is the persisted reference it
 * was loaded from, if any. A reference whose package is not registered yet is
 * kept pending; a whole theme of such a package waits for its registration
 * too (`refreshThemesOnRegistration`).
 */
function withRefreshedActiveTheme(
	state: ClassicyStore,
	reference: ClassicyThemeReference | undefined,
): ClassicyStore {
	if (reference && !knownClassicyThemePackage(reference.package)) {
		pendingActiveThemeReference = reference;
		return state;
	}
	const appearance = state.System.Manager.Appearance;
	const activeTheme = refreshedClassicyActiveTheme(appearance, {
		reference: !!reference,
	});
	if (!activeTheme) return state;
	return {
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Appearance: { ...appearance, activeTheme },
			},
		},
	};
}

/** True when `theme`'s own package defaults can be read now: its package
 * (the default package when it names none) is registered. The default
 * package gets no special case: the store loads before Platinum registers. */
const hasKnownClassicyThemePackage = (theme: ClassicyTheme): boolean =>
	knownClassicyThemePackage(
		theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	) !== undefined;

/**
 * `theme` as it is persisted: a registered wallpaper by its filename
 * (`withPortableClassicyWallpaper`; a URL that only works in this build never
 * reaches storage), and without the package-family leaves equal to its
 * package's defaults (H-R17). A theme whose package is not registered yet,
 * Platinum's included, keeps every knob: its defaults cannot be read yet
 * (they would resolve to another package's, or to the core floor), and an
 * edit that happens to equal those values would be lost.
 */
const persistableClassicyTheme = (theme: ClassicyTheme): ClassicyTheme => {
	if (!theme || typeof theme !== "object") return theme;
	const portable = withPortableClassicyWallpaper(theme);
	return hasKnownClassicyThemePackage(portable)
		? withoutDefaultThemeMeasurements(
				portable,
				classicyThemeMeasurementDefaults(portable.package),
			)
		: portable;
};

/**
 * `state` with its active theme's default knob families dropped: the base
 * for a deep merge of saved state (the load path) or of a host's
 * `defaultState` (the provider). Otherwise a family the merged-in active
 * theme leaves to its package would come back from the default theme as a
 * present value, and the theme's own package could never supply it.
 *
 * Dropped whether or not the theme's package is registered, unlike
 * persistence: the base is a default state (`DefaultAppManagerState`, or a
 * first session's live state, the only one the provider seeds), which holds
 * no edit to lose. Its theme is the core default theme, whose measurements
 * are the core floor that an unregistered package's defaults resolve to, or
 * a registered package's own default theme.
 * @internal
 */
export const withoutDefaultActiveThemeMeasurements = (
	state: ClassicyStore,
): ClassicyStore => {
	const appearance = state.System.Manager.Appearance;
	const theme = appearance.activeTheme;
	if (!theme || typeof theme !== "object") return state;
	return {
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Appearance: {
					...appearance,
					activeTheme: withoutDefaultThemeMeasurements(
						theme,
						classicyThemeMeasurementDefaults(theme.package),
					),
				},
			},
		},
	};
};

/** True iff the module store initialized from valid persisted localStorage state. */
export const wasHydratedFromStorage = (): boolean => hydratedFromStorage;

/**
 * The default state as a first session starts: its active theme, the core
 * default theme (a built-in of the default package), is refreshed from the
 * code like a loaded one. A default package registered before the store
 * (a deep import, Storybook's preview) gives its own `default` here; one
 * registered later replaces it then (`refreshThemesOnRegistration`).
 */
const defaultInitialState = (): ClassicyStore =>
	withRefreshedActiveTheme(DefaultAppManagerState, undefined);

function getInitialState(): ClassicyStore {
	if (typeof window !== "undefined") {
		try {
			const storedState = localStorage.getItem("classicyDesktopState");
			if (storedState) {
				const parsed = JSON.parse(storedState);
				// Schema validation — fall back on shape mismatch
				if (
					!parsed ||
					typeof parsed !== "object" ||
					!("System" in parsed) ||
					!parsed.System?.Manager?.Applications?.apps ||
					!parsed.System?.Manager?.Desktop ||
					!parsed.System?.Manager?.Appearance?.activeTheme
				) {
					classicyLog(
						"warn",
						"ClassicyAppManager",
						"Persisted state schema mismatch; falling back to defaults.",
					);
					return defaultInitialState();
				}
				hydratedFromStorage = true;
				// Built-ins come from the code, never from saved state: drop
				// the list a build before this rule stored (the defaults'
				// current list applies), and note a built-in active theme saved
				// as a reference, so it is resolved against the code below.
				const savedAppearance = parsed.System.Manager.Appearance;
				delete savedAppearance.availableThemes;
				const saved = savedAppearance.activeTheme;
				const reference: ClassicyThemeReference | undefined =
					isClassicyThemeReference(saved)
						? {
								id: saved.id,
								package:
									typeof saved.package === "string"
										? saved.package
										: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
							}
						: undefined;
				// Merge persisted state on top of current defaults so any new fields
				// added since the state was saved get their default values instead of
				// being undefined (e.g. new typography.monoSize / digitalSize keys).
				// Migrate AFTER the merge: arrays replace defaults wholesale, so a
				// 0.x `windows` array survives the merge and is converted here.
				// (mergeClassicyState already migrates its result; the explicit,
				// idempotent pass keeps this load path correct on its own.)
				// (The migration also stores a registered wallpaper by its
				// filename; getThemeVars resolves it at render.)
				return withRefreshedActiveTheme(
					migrateClassicyState(
						mergeClassicyState(
							withoutDefaultActiveThemeMeasurements(DefaultAppManagerState),
							parsed as DeepPartial<ClassicyStore>,
						),
					),
					reference,
				);
			}
		} catch (error) {
			classicyLog(
				"error",
				"ClassicyAppManager",
				"Failed to parse persisted desktop state; falling back to defaults.",
				error,
			);
		}
	}
	return defaultInitialState();
}

export const useAppManager: UseBoundStore<StoreApi<ClassicyStore>> =
	create<ClassicyStore>()(() => ({
		...getInitialState(),
	}));

/**
 * Each registered package as the store last saw it, so a registry change
 * tells which packages it registered or re-registered (a new object under an
 * id). Packages registered before the store were there for its load.
 */
let seenPackages = new Map(
	listClassicyAppearancePackages().map((pkg) => [pkg.id, pkg]),
);

/** The ids of the packages registered or re-registered since the last call. */
const takeNewlyRegisteredPackageIds = (): ReadonlySet<string> => {
	const packages = listClassicyAppearancePackages();
	const ids = new Set(
		packages
			.filter((pkg) => seenPackages.get(pkg.id) !== pkg)
			.map((pkg) => pkg.id),
	);
	seenPackages = new Map(packages.map((pkg) => [pkg.id, pkg]));
	return ids;
};

/** `theme` with its wallpaper by filename when it is a theme of one of
 * `packageIds` (`withPortableClassicyWallpaper`), else `theme` itself. */
const withHealedWallpaper = (
	theme: ClassicyTheme,
	packageIds: ReadonlySet<string>,
): ClassicyTheme =>
	theme &&
	typeof theme === "object" &&
	packageIds.has(theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)
		? withPortableClassicyWallpaper(theme)
		: theme;

/** `themes` with `withHealedWallpaper` applied; the same array when no
 * entry changes. */
const withHealedWallpapers = (
	themes: ClassicyTheme[] | undefined,
	packageIds: ReadonlySet<string>,
): ClassicyTheme[] | undefined => {
	if (!Array.isArray(themes) || packageIds.size === 0) return themes;
	const healed = themes.map((theme) => withHealedWallpaper(theme, packageIds));
	return healed.some((theme, i) => theme !== themes[i]) ? healed : themes;
};

/**
 * The active theme refreshed from the code (`refreshedClassicyActiveTheme`),
 * or `undefined` when it stays: a built-in of a package registered after the
 * store loaded is replaced by its preset, and a pending reference
 * (`pendingActiveThemeReference`) is resolved, falling back to that
 * package's defaults if its preset is gone. A pending reference is dropped
 * once the user has chosen another theme.
 */
const refreshedActiveBuiltInTheme = (
	appearance: ClassicyStore["System"]["Manager"]["Appearance"],
): ClassicyTheme | undefined => {
	const reference = pendingReferenceFor(appearance.activeTheme);
	if (reference && !knownClassicyThemePackage(reference.package)) return;
	pendingActiveThemeReference = null;
	return refreshedClassicyActiveTheme(appearance, { reference: !!reference });
};

/**
 * Refresh the themes from the code whenever a package registers (or
 * re-registers, or leaves), in one store write and only when something
 * changes: the active built-in (`refreshedActiveBuiltInTheme`), and the
 * wallpapers of every theme (active, host-loaded or custom) of a package
 * that just registered. A wallpaper saved before its package registered (a
 * `data:` URI from an inlining build, an older build's URL) could not be
 * matched at load, and is stored by its filename now. A theme of any other
 * package, registered or not, is left as it is.
 */
const refreshThemesOnRegistration = (): void => {
	const registered = takeNewlyRegisteredPackageIds();
	const appearance = useAppManager.getState().System.Manager.Appearance;
	const refreshed = refreshedActiveBuiltInTheme(appearance);
	const activeTheme = withHealedWallpaper(
		refreshed ?? appearance.activeTheme,
		registered,
	);
	const availableThemes = withHealedWallpapers(
		appearance.availableThemes,
		registered,
	);
	const customThemes = withHealedWallpapers(
		appearance.customThemes,
		registered,
	);
	if (
		activeTheme === appearance.activeTheme &&
		availableThemes === appearance.availableThemes &&
		customThemes === appearance.customThemes
	) {
		return;
	}
	useAppManager.setState((currentState) =>
		produce(currentState, (draft) => {
			const draftAppearance = draft.System.Manager.Appearance;
			if (activeTheme !== appearance.activeTheme) {
				draftAppearance.activeTheme = castDraft(activeTheme);
			}
			if (availableThemes !== appearance.availableThemes) {
				draftAppearance.availableThemes = castDraft(availableThemes);
			}
			if (customThemes !== appearance.customThemes) {
				draftAppearance.customThemes = castDraft(customThemes);
			}
		}),
	);
};
subscribeClassicyAppearancePackages(refreshThemesOnRegistration);

// The asset registry follows the active Appearance Package: the store's
// packageId resolved against the package registry, so assets and the desktop
// root's data-classicy-appearance always agree. Connected here, once the store
// exists; the registry reads it lazily, never during module evaluation.
connectClassicyAssetPackageSource({
	getId: () => resolveClassicyAppearancePackage().id,
	subscribe: (onChange) => {
		const unsubscribeStore = useAppManager.subscribe(onChange);
		const unsubscribePackages = subscribeClassicyAppearancePackages(onChange);
		return () => {
			unsubscribeStore();
			unsubscribePackages();
		};
	},
});

/**
 * Dispatch an action to the store. `trust` defaults to `"trusted"` — the
 * existing, unrestricted behavior every current call site relies on.
 * Passing `"untrusted"` is strictly opt-in and causes the reducer to reject
 * the action before any handler runs if its type falls under a guarded
 * route (see ClassicyActionTrust.ts).
 */
export const dispatch = (
	action: ActionMessage,
	trust: ClassicyActionTrust = "trusted",
): void => {
	useAppManager.setState((currentState) =>
		produce(currentState, (draft) => {
			classicyDesktopStateEventReducer(
				castDraft(draft) as ClassicyStore,
				action,
				trust,
			);
		}),
	);
	// Kernel-enforced manifest validation (dev-only, warn-only): every real
	// dispatch crosses this boundary, so enforcement here does not depend on
	// call-site discipline. Lives outside the reducer to keep the module
	// graph acyclic (ClassicyAppManifest imports ClassicyAppManager).
	if (process.env.NODE_ENV !== "production") {
		validateAppStateForAction(useAppManager.getState(), action);
	}
};

export const useAppManagerDispatch = (): ((
	action: ActionMessage,
	trust?: ClassicyActionTrust,
) => void) => dispatch;

// Persist to localStorage with a 500ms debounce on every state change
let unsubscribeFn: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Produce a sanitized copy of state safe for persistence.
 * Strips fields that contain PII or are intentionally session-only.
 */
export function sanitizeStateForPersistence(
	state: ClassicyStore,
): ClassicyStore {
	// Built-in themes are not persisted: they come from the code on load
	// (ClassicyBuiltInThemes.internal.ts), so `availableThemes` is dropped and
	// a built-in active theme is saved as its reference, `{ id, package }`.
	// Every other theme is saved whole, keeping only the package-family values
	// a user changed (H-R17): the rest equal the package defaults, which
	// getThemeVars fills when it reads the theme. That keeps saved state near
	// its pre-knob size, and lets a later change to a package's defaults reach
	// existing users.
	const appearance = state.System?.Manager?.Appearance;
	const list = (themes: ClassicyTheme[] | undefined) =>
		Array.isArray(themes) ? themes.map(persistableClassicyTheme) : themes;
	const activeTheme = appearance
		? ((classicyBuiltInThemeReference(appearance) ??
				pendingReferenceFor(appearance.activeTheme) ??
				persistableClassicyTheme(appearance.activeTheme)) as ClassicyTheme)
		: undefined;
	const customThemes = list(appearance?.customThemes);
	const changed = (
		next: ClassicyTheme[] | undefined,
		prev: ClassicyTheme[] | undefined,
	) => next?.some((t, i) => t !== prev?.[i]) ?? false;
	return produce(state, (draft) => {
		const draftAppearance = draft.System?.Manager?.Appearance;
		if (draftAppearance && appearance) {
			if (activeTheme && activeTheme !== appearance.activeTheme) {
				draftAppearance.activeTheme = castDraft(activeTheme);
			}
			delete draftAppearance.availableThemes;
			if (changed(customThemes, appearance.customThemes)) {
				draftAppearance.customThemes = castDraft(customThemes);
			}
		}
		const browserApp = draft.System.Manager.Applications.apps["Browser.app"];
		if (browserApp?.data && "history" in browserApp.data) {
			delete (browserApp.data as Record<string, unknown>).history;
		}
		// HyperCard: drop the ephemeral interpreter runtime (frames, pending
		// dialog/wait/transition, effects) so a reload never restores a
		// half-finished continuation. Only stack deltas are persisted.
		const hyperCardApp =
			draft.System.Manager.Applications.apps["HyperCard.app"];
		const openStacks = (hyperCardApp?.data as Record<string, unknown>)
			?.openStacks;
		if (openStacks && typeof openStacks === "object") {
			for (const openStack of Object.values(
				openStacks as Record<string, Record<string, unknown>>,
			)) {
				if (openStack && typeof openStack === "object") {
					delete openStack.runtime;
				}
			}
		}
		// HyperCard editor: strip the undo/redo history from each persisted edit
		// session. Immer's structural sharing collapses to plain arrays under
		// JSON.stringify, so up to MAX_UNDO full HCStack snapshots get flattened
		// and re-serialized every 500ms — a quota risk that silently disables
		// ALL desktop persistence on QuotaExceededError. The draft, dirty flag,
		// and pristine snapshot are session-scoped and still worth keeping;
		// only the replay history is dropped. SET to empty arrays rather than
		// deleting the keys — the editor reducers read `.length` unconditionally.
		const editSessions = (hyperCardApp?.data as Record<string, unknown>)?.edits;
		if (editSessions && typeof editSessions === "object") {
			for (const editSession of Object.values(
				editSessions as Record<string, Record<string, unknown>>,
			)) {
				if (editSession && typeof editSession === "object") {
					editSession.undo = [];
					editSession.redo = [];
				}
			}
		}
		// The screensaver's `active` flag is session-only: persisting it would
		// boot a reloaded desktop straight into a running screensaver.
		const screenSaverApp =
			draft.System.Manager.Applications.apps["ScreenSaver.app"];
		if (screenSaverApp?.data && "active" in screenSaverApp.data) {
			delete (screenSaverApp.data as Record<string, unknown>).active;
		}
		// The Special menu's confirmation alert belongs to the session that
		// opened it; a reload must not greet the user with Empty Trash. An
		// error alert is just as transient, and its message may name an item
		// by its display name (a refused move in the derived Applications
		// folder), which persisted state never holds (K-R13).
		if (draft.System.Manager.Desktop) {
			draft.System.Manager.Desktop.systemDialog = null;
			draft.System.Manager.Desktop.errorDialog = null;
		}
		// Boot parade icons are session-only: owners re-register them on every
		// mount, so persisting them would resurrect icons whose owner removed
		// its bootIcon prop.
		draft.System.Manager.Boot.paradeIcons = [];
		// The keyboard-shortcut registry is runtime state: apps and extensions
		// re-register on every mount. Persisting it would resurrect claims whose
		// owner is gone (and can hold non-serializable intent). Reset to empty.
		draft.System.Manager.Keyboard = { app: {}, system: [], global: {} };
		// "Closed this session" is what makes a re-registering window a reopen
		// that takes focus; after a reload no window has been closed yet.
		// `resizing`, `dragging` and `moving` belong to a gesture in progress;
		// a reload ends it, and a stale flag would keep the window acting as
		// if dragged (preventDefault on mousemove, the resizing class) until
		// its first click.
		for (const app of Object.values(draft.System.Manager.Applications.apps)) {
			for (const w of Object.values(app.windows ?? {})) {
				delete w.closedThisSession;
				delete w.resizing;
				delete w.dragging;
				delete w.moving;
			}
		}
	});
}

/** Start persisting state to localStorage. Returns an unsubscribe function. */
export function startAppManagerPersistence(): () => void {
	if (unsubscribeFn) return unsubscribeFn;
	unsubscribeFn = useAppManager.subscribe((state) => {
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			try {
				const stateToSave = sanitizeStateForPersistence(state);
				localStorage.setItem(
					"classicyDesktopState",
					JSON.stringify(stateToSave),
				);
			} catch (error) {
				classicyLog(
					"error",
					"ClassicyAppManager",
					"Failed to persist desktop state to localStorage. Storage quota may be exceeded.",
					error,
				);
			}
		}, 500);
	});
	return unsubscribeFn;
}

/** Call this during app cleanup or test teardown to stop localStorage sync. */
export function stopAppManagerPersistence(): void {
	if (debounceTimer !== null) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	if (unsubscribeFn) {
		unsubscribeFn();
		unsubscribeFn = null;
	}
}

// Auto-start persistence (consumers can call stopAppManagerPersistence to clean up)
startAppManagerPersistence();
