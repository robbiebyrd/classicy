import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { getClassicyDrawnPackageId } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMeasurementSource.internal";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	CLASSICY_MEASUREMENT_NAME,
	classicyThemeMeasurementDefaults,
	classicyThemeMeasurementPins,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import type { ClassicyThemeMetricKey } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";

/**
 * The explicit-edit record (`ClassicyTheme.measurementPins`, story 0235-xgi,
 * fix round 1).
 *
 * Under another package a theme draws the drawing package's value for every
 * knob whose own value equals its own package's default
 * (`classicyDrawnThemeMeasurements`). So without a record, a value the user
 * sets to that default while another package draws (Control Size 12 on a
 * Platinum theme under System 7, which draws 11) would change nothing drawn.
 * `ClassicyDesktopChangeMetric` records such a value; drawing and
 * persistence keep a recorded value as the theme's own.
 *
 * The record is written only while another (registered) package draws the
 * theme; a host that draws only its own package's themes never has one, so
 * its persisted bytes are what they were.
 */

/**
 * The `measurements.<family>.<key>` a core metric target names
 * (`windowControlSize` → `window.controlSize`), or `undefined`.
 */
export const classicyThemeMetricPath = (
	metricKey: ClassicyThemeMetricKey | string,
): { family: string; key: string } | undefined => {
	for (const [family, keys] of Object.entries(CLASSICY_DEFAULT_THEME_METRICS)) {
		for (const key of Object.keys(keys)) {
			if (`${family}${key[0].toUpperCase()}${key.slice(1)}` === metricKey)
				return { family, key };
		}
	}
	return undefined;
};

/**
 * Records, or clears, `family.key` in `theme`'s explicit-edit record after
 * an edit set it, while `drawnPackageId` draws (the store's
 * `Appearance.packageId`). Recorded when the drawing package is not the
 * theme's own (and both are registered) and the value equals the theme's
 * own package's default; cleared otherwise: an edit off the default needs
 * no record, and an edit made under the theme's own package means the
 * default. Mutates `theme` (an edit's working copy); the record and each
 * family are removed when they empty. Returns whether the record changed.
 */
export const updateClassicyMeasurementPin = (
	theme: ClassicyTheme,
	family: string,
	key: string,
	drawnPackageId: string | undefined,
): boolean => {
	if (
		!CLASSICY_MEASUREMENT_NAME.test(family) ||
		!CLASSICY_MEASUREMENT_NAME.test(key)
	)
		return false;
	const ownId = theme.package ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;
	const drawnId = getClassicyDrawnPackageId(drawnPackageId);
	const measurements = theme.measurements as Record<string, unknown>;
	const familyValues = Object.hasOwn(measurements, family)
		? (measurements[family] as Record<string, unknown> | undefined)
		: undefined;
	const value =
		familyValues && Object.hasOwn(familyValues, key)
			? familyValues[key]
			: undefined;
	const ownDefaults = classicyThemeMeasurementDefaults(ownId);
	const ownDefault =
		Object.hasOwn(ownDefaults, family) &&
		Object.hasOwn(ownDefaults[family], key)
			? ownDefaults[family][key]
			: undefined;
	const pin =
		drawnId !== undefined &&
		drawnId !== ownId &&
		getClassicyDrawnPackageId(ownId) === ownId &&
		typeof value === "number" &&
		value === ownDefault;
	const pinned = classicyThemeMeasurementPins(theme).get(family)?.has(key);
	if (pin === Boolean(pinned)) return false;
	const record: Record<string, string[]> = {};
	for (const [f, keys] of classicyThemeMeasurementPins(theme))
		record[f] = [...keys];
	if (pin) {
		record[family] = [...(record[family] ?? []), key];
	} else {
		record[family] = (record[family] ?? []).filter((k) => k !== key);
		if (record[family].length === 0) delete record[family];
	}
	if (Object.keys(record).length === 0) delete theme.measurementPins;
	else theme.measurementPins = record;
	return true;
};

/**
 * `theme` with its explicit-edit record in the shape the schema accepts:
 * each family a camelCase name holding an array of camelCase keys, each
 * once; an empty or malformed record dropped. Copy-on-write: the same theme
 * back when there is nothing to change, so the state migration
 * (`migrateClassicyState`) is idempotent.
 */
export const withValidClassicyMeasurementPins = <
	T extends { measurementPins?: unknown },
>(
	theme: T,
): T => {
	if (!theme || typeof theme !== "object" || !("measurementPins" in theme))
		return theme;
	const pins = classicyThemeMeasurementPins(theme);
	const valid: Record<string, string[]> = {};
	for (const [family, keys] of pins) valid[family] = [...keys];
	if (
		pins.size > 0 &&
		JSON.stringify(valid) === JSON.stringify(theme.measurementPins)
	)
		return theme;
	const next = { ...theme };
	if (pins.size === 0) delete next.measurementPins;
	else next.measurementPins = valid;
	return next;
};
