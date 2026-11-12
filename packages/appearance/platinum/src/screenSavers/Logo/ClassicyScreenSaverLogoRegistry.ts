import { classicyLog, resolveClassicyAsset } from "@classicy/classicy";
import { useSyncExternalStore } from "react";
import berkeleySystemsLogo from "./logo.webp";

/**
 * One image the "Logo" screen saver can bounce around the screen. Consumers
 * add their own with `registerClassicyScreenSaverLogo` and the Screen Saver
 * control panel offers it in the saver's Logo pop-up menu.
 */
export interface ClassicyScreenSaverLogoDefinition {
	/** Unique id, stored in the saver's config as `logo`. */
	id: string;
	/** Display name shown in the control panel's Logo pop-up menu. */
	name: string;
	/**
	 * Image URL (or data URI), drawn on the overlay's black background. A
	 * function is called each time the saver draws, so a logo can follow the
	 * asset registry (the `classicy` and `startup-screen` logos read the
	 * active package's icons that way).
	 */
	src: string | (() => string);
	/**
	 * Rendered width in px. Omit it to draw the image at its natural size;
	 * give only one of `width`/`height` to scale with the aspect kept.
	 */
	width?: number;
	/** Rendered height in px; see `width`. */
	height?: number;
}

/** The image a logo draws: its `src`, called now when it is a function. */
export const classicyScreenSaverLogoSrc = (
	logo: ClassicyScreenSaverLogoDefinition,
): string => (typeof logo.src === "function" ? logo.src() : logo.src);

/** Ids of the logos Platinum ships, for `SetConfig { logo }` and tests. */
export const CLASSICY_SCREEN_SAVER_LOGO_IDS = {
	berkeleySystems: "berkeley-systems",
	classicy: "classicy",
	startupScreen: "startup-screen",
} as const;

/** The logo the saver shows until the user picks another. */
export const CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID =
	CLASSICY_SCREEN_SAVER_LOGO_IDS.berkeleySystems;

/** The registry's state: the logos, their subscribers and the list. */
interface ClassicyScreenSaverLogoRegistryState {
	readonly registry: Map<string, ClassicyScreenSaverLogoDefinition>;
	readonly listeners: Set<() => void>;
	snapshot: readonly ClassicyScreenSaverLogoDefinition[];
}

// One registry per page, whichever bundle evaluates this module. Platinum's
// bundle carries it, and so does System 7's, which bundles the savers'
// registration module (design 0017-6me, "Screen savers"), so a host loading
// both packages evaluates it twice. The core's registries are one copy (the
// core is a peer); this one has no core home, so its state lives on
// `globalThis` under a registered symbol, and the second copy joins the
// first: a logo registered through Platinum's export is the one the Logo
// saver draws and offers, whichever bundle registered that saver last. The
// key carries the state's shape version.
const STATE_KEY = Symbol.for("@classicy/screen-saver-logos@1");
const holder = globalThis as unknown as Record<
	symbol,
	ClassicyScreenSaverLogoRegistryState | undefined
>;
const state: ClassicyScreenSaverLogoRegistryState = holder[STATE_KEY] ?? {
	registry: new Map(),
	listeners: new Set(),
	snapshot: [],
};
holder[STATE_KEY] = state;
const { registry, listeners } = state;

const publish = () => {
	state.snapshot = Array.from(registry.values());
	for (const listener of listeners) listener();
};

/**
 * Add a logo to the "Logo" screen saver. Call it at module scope, like
 * `registerClassicyScreenSaver`; the control panel's pop-up menu is live, so
 * a later registration appears as soon as it is made. Re-registering an id
 * replaces the image in place (keeping its position in the list), so a
 * consumer can swap out a built-in. Logos list in registration order: the
 * three built-ins first, then third-party logos as they were registered.
 */
export function registerClassicyScreenSaverLogo(
	logo: ClassicyScreenSaverLogoDefinition,
): ClassicyScreenSaverLogoDefinition {
	registry.set(logo.id, logo);
	publish();
	return logo;
}

/** Remove a logo. Returns whether one was registered under that id. */
export function unregisterClassicyScreenSaverLogo(id: string): boolean {
	if (!registry.delete(id)) return false;
	publish();
	return true;
}

export const getClassicyScreenSaverLogo = (
	id: string,
): ClassicyScreenSaverLogoDefinition | undefined => registry.get(id);

/** Every registered logo, in registration order. */
export const listClassicyScreenSaverLogos =
	(): readonly ClassicyScreenSaverLogoDefinition[] => state.snapshot;

export function subscribeClassicyScreenSaverLogos(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Every registered logo, in registration order; re-renders on any change. */
export const useClassicyScreenSaverLogos =
	(): readonly ClassicyScreenSaverLogoDefinition[] =>
		useSyncExternalStore(
			subscribeClassicyScreenSaverLogos,
			() => state.snapshot,
			() => state.snapshot,
		);

/**
 * The logo for a saved id, or the default when the id is unknown — a saved
 * config may name a third-party logo whose module is no longer loaded.
 */
export const resolveClassicyScreenSaverLogo = (
	id: unknown,
): ClassicyScreenSaverLogoDefinition | undefined =>
	(typeof id === "string" ? registry.get(id) : undefined) ??
	registry.get(CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID);

const warnedMissingIcons = new Set<string>();

/**
 * A stock logo's icon from the active package, or the Berkeley Systems mark
 * (logged once per logo id) when no package registers it, so the saver never
 * draws `<img src="">`.
 */
const iconOrBerkeley = (logoId: string, iconKey: string): string => {
	const found = resolveClassicyAsset("icons", iconKey);
	if (found) return found;
	if (!warnedMissingIcons.has(logoId)) {
		warnedMissingIcons.add(logoId);
		classicyLog(
			"warn",
			"ScreenSaver",
			`The "${logoId}" logo's icon "${iconKey}" is not registered; drawing the Berkeley Systems logo instead.`,
		);
	}
	return String(berkeleySystemsLogo);
};

// The stock logos. The Berkeley Systems mark is the After Dark original
// (145 × 54 px); the other two are scaled to the same height so switching
// between them keeps the bounce path.
registerClassicyScreenSaverLogo({
	id: CLASSICY_SCREEN_SAVER_LOGO_IDS.berkeleySystems,
	name: "Berkeley Systems",
	src: String(berkeleySystemsLogo),
	width: 145,
	height: 54,
});

registerClassicyScreenSaverLogo({
	id: CLASSICY_SCREEN_SAVER_LOGO_IDS.classicy,
	name: "Classicy",
	// Read at draw time, from the active package's icons.
	src: () =>
		iconOrBerkeley(CLASSICY_SCREEN_SAVER_LOGO_IDS.classicy, "classicy.logo"),
	// classicy-logo.svg is 476 × 179.
	width: 144,
	height: 54,
});

registerClassicyScreenSaverLogo({
	id: CLASSICY_SCREEN_SAVER_LOGO_IDS.startupScreen,
	name: "Startup Screen",
	// The mark the startup screen shows beside the wordmark by default.
	src: () =>
		iconOrBerkeley(
			CLASSICY_SCREEN_SAVER_LOGO_IDS.startupScreen,
			"system.macosSvg",
		),
	// macos.svg is 235.7 × 193.6.
	width: 66,
	height: 54,
});
