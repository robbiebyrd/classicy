// Where `classicyThemeMeasurementDefaults` finds a package's own
// `defaults.measurements`. A runtime leaf (no imports), set by the package
// registry when it evaluates.
//
// Why not import the registry from ClassicyThemeMetrics: the registry
// evaluates `getTheme`/`getAllThemes` at module scope, ClassicyAppearance
// fills its presets with `withDefaultThemeMetrics` at module scope, and
// ClassicyAppearance imports ClassicyThemeMetrics. A metrics → registry edge
// would close that loop, and whichever of the three a bundle reached first,
// one would read another's constants in their temporal dead zone. The
// registry sets the lookup instead. Until it has evaluated no package can be
// registered, so "no lookup" and "no package" mean the same thing: Platinum.

/** A registered package's `defaults.measurements`, by package id (the
 * registered default package for an unknown or missing id). */
export type ClassicyPackageMeasurementsLookup = (
	packageId: string | undefined,
) => unknown;

let lookup: ClassicyPackageMeasurementsLookup = () => undefined;

/**
 * Sets the lookup. Called once, by ClassicyAppearancePackageRegistry.
 * @internal
 */
export const setClassicyPackageMeasurementsLookup = (
	next: ClassicyPackageMeasurementsLookup,
): void => {
	lookup = next;
};

/**
 * The registered package's `defaults.measurements` for `packageId`, or
 * `undefined` while no package is registered.
 * @internal
 */
export const getClassicyPackageMeasurements = (
	packageId: string | undefined,
): unknown => lookup(packageId);
