/**
 * The guards shared by both untrusted theme write paths, the option path
 * (`ClassicyAppearanceOptions.ts`) and the metric family form
 * (`ClassicyThemeMetricTargets.ts`), so the two can never drift apart.
 *
 * Not public API — `.internal.ts` modules are excluded from the barrels.
 */

/** Keys that reach an object's prototype; never a path segment or a name.
 * Frozen, so no importer can disable the guard at runtime. */
export const CLASSICY_FORBIDDEN_KEYS: readonly string[] = Object.freeze([
	"__proto__",
	"constructor",
	"prototype",
]);

/** True for a key in `CLASSICY_FORBIDDEN_KEYS`. */
export const isClassicyForbiddenKey = (key: string): boolean =>
	CLASSICY_FORBIDDEN_KEYS.includes(key);

/** True for a plain object (`{}` or `Object.create(null)`), never an array,
 * a class instance or an object with another prototype. */
export const isClassicyPlainObject = (
	value: unknown,
): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};
