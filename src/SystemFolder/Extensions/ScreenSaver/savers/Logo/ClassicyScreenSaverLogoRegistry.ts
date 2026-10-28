import { useSyncExternalStore } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
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
	/** Image URL (or data URI). Drawn on the overlay's black background. */
	src: string;
	/**
	 * Rendered width in px. Omit it to draw the image at its natural size;
	 * give only one of `width`/`height` to scale with the aspect kept.
	 */
	width?: number;
	/** Rendered height in px; see `width`. */
	height?: number;
}

/** Ids of the logos Classicy ships, for `SetConfig { logo }` and tests. */
export const CLASSICY_SCREEN_SAVER_LOGO_IDS = {
	berkeleySystems: "berkeley-systems",
	classicy: "classicy",
	startupScreen: "startup-screen",
} as const;

/** The logo the saver shows until the user picks another. */
export const CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID =
	CLASSICY_SCREEN_SAVER_LOGO_IDS.berkeleySystems;

const registry = new Map<string, ClassicyScreenSaverLogoDefinition>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicyScreenSaverLogoDefinition[] = [];

const publish = () => {
	snapshot = Array.from(registry.values());
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
	(): readonly ClassicyScreenSaverLogoDefinition[] => snapshot;

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
			() => snapshot,
			() => snapshot,
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
	src: ClassicyIcons.classicy.logo,
	// classicy-logo.svg is 476 × 179.
	width: 144,
	height: 54,
});

registerClassicyScreenSaverLogo({
	id: CLASSICY_SCREEN_SAVER_LOGO_IDS.startupScreen,
	name: "Startup Screen",
	// The mark the startup screen shows beside the wordmark by default.
	src: ClassicyIcons.system.macosSvg,
	// macos.svg is 235.7 × 193.6.
	width: 66,
	height: 54,
});
