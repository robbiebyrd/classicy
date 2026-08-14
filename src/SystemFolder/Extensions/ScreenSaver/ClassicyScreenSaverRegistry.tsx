import type { FC as FunctionalComponent } from "react";
import type { z } from "zod";

/** A saver's configuration values, persisted per saver id in app state. */
export type ClassicyScreenSaverConfig = Record<string, unknown>;

/** Props every screensaver visual component receives from the host. */
export interface ClassicyScreenSaverProps {
	/** Resolved config: schema/`defaultConfig` defaults merged under saved values. */
	config: ClassicyScreenSaverConfig;
}

/** Props a saver's custom options UI receives from the host (control panel). */
export interface ClassicyScreenSaverConfigProps {
	/** Resolved config, same shape the visual component receives. */
	config: ClassicyScreenSaverConfig;
	/**
	 * Report changed values. The host owns persistence: patches are dispatched
	 * as `ClassicyAppScreenSaverSetConfig`, validated against `configSchema`,
	 * and merged into the saver's stored config — the options UI never writes
	 * to the store directly.
	 */
	onChange: (patch: ClassicyScreenSaverConfig) => void;
}

export interface ClassicyScreenSaverDefinition {
	/** Unique id, used as the `saverConfigs` key and in SetSaver actions. */
	id: string;
	/** Display name shown in the Screen Saver control panel list. */
	name: string;
	/** Full-viewport visual, rendered inside the black overlay when active. */
	component: FunctionalComponent<ClassicyScreenSaverProps>;
	/**
	 * Zod schema for this saver's config. Should be a `z.looseObject` with
	 * `.describe()` on each field — descriptions become labels in the
	 * auto-generated options form, and the schema validates SetConfig patches.
	 */
	configSchema?: z.ZodType;
	/** Fallback config when a field has no schema default and no saved value. */
	defaultConfig?: ClassicyScreenSaverConfig;
	/**
	 * Custom options UI. When absent, the control panel renders a form derived
	 * from `configSchema` (number → spinner, boolean → checkbox, enum → pop-up
	 * menu, string → input); when neither exists the saver has no options.
	 */
	configComponent?: FunctionalComponent<ClassicyScreenSaverConfigProps>;
	/**
	 * Skip the overlay's opaque black background so the live desktop shows
	 * through. For savers that dim or reveal the screen itself (Fade Out,
	 * Spotlight) — the After Dark originals faked this with a desktop
	 * screenshot; here the real desktop plays that part.
	 */
	transparentBackground?: boolean;
}

const registry = new Map<string, ClassicyScreenSaverDefinition>();

/**
 * Register a screensaver. Call at module scope before rendering, like
 * `registerClassicyIcons`. Re-registering an id replaces the previous entry,
 * so a consumer can swap out a built-in saver with their own variant.
 */
export function registerClassicyScreenSaver(
	saver: ClassicyScreenSaverDefinition,
): ClassicyScreenSaverDefinition {
	registry.set(saver.id, saver);
	return saver;
}

export function getClassicyScreenSaver(
	id: string,
): ClassicyScreenSaverDefinition | undefined {
	return registry.get(id);
}

/** All registered savers, sorted by display name for stable list UIs. */
export function listClassicyScreenSavers(): ClassicyScreenSaverDefinition[] {
	return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Merge a saver's saved config over its defaults, then validate. Schema
 * failures fall back to the defaults alone rather than passing bad values to
 * the visual component — saved configs are data, not code, and may predate a
 * saver's current schema.
 */
export function resolveScreenSaverConfig(
	saver: ClassicyScreenSaverDefinition,
	saved?: ClassicyScreenSaverConfig,
): ClassicyScreenSaverConfig {
	const merged = { ...(saver.defaultConfig ?? {}), ...(saved ?? {}) };
	if (!saver.configSchema) return merged;
	const parsed = saver.configSchema.safeParse(merged);
	if (parsed.success) return parsed.data as ClassicyScreenSaverConfig;
	const fallback = saver.configSchema.safeParse(saver.defaultConfig ?? {});
	return fallback.success
		? (fallback.data as ClassicyScreenSaverConfig)
		: { ...(saver.defaultConfig ?? {}) };
}
