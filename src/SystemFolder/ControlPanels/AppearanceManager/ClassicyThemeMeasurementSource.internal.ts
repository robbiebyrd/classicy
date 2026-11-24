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
// registered, so "no lookup" and "no package" mean the same thing: the core
// floor (ClassicyCoreTheme.ts).

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

// The package that draws for a stored `Appearance.packageId`
// (`classicyDrawnThemeMeasurements`, story 0235-xgi): resolved as the
// desktop resolves it (`getRegisteredClassicyAppearancePackageOrDefault`),
// set by the registry too, for the same reason.

/** The id of the package that draws for `packageId`: that package when
 * registered, else the registered default package, else the first
 * registered; `undefined` while no package is registered. */
export type ClassicyDrawnPackageLookup = (
	packageId: string | undefined,
) => string | undefined;

let drawnPackageLookup: ClassicyDrawnPackageLookup = () => undefined;

/**
 * Sets the drawn package lookup. Called once, by
 * ClassicyAppearancePackageRegistry.
 * @internal
 */
export const setClassicyDrawnPackageLookup = (
	next: ClassicyDrawnPackageLookup,
): void => {
	drawnPackageLookup = next;
};

/**
 * The id of the registered package that draws for `packageId`, or
 * `undefined` while no package is registered.
 * @internal
 */
export const getClassicyDrawnPackageId = (
	packageId: string | undefined,
): string | undefined => drawnPackageLookup(packageId);

// The same for a package's `defaults.color.families`
// (`classicyThemeColorFamilyDefaults`), set by the registry too. Unlike the
// measurements' lookup it never falls back to another package: a package's
// colors are its own look, and no base stylesheet reads one.

/** A registered package's `defaults.color.families`, by package id (the
 * default package's for a missing id); `undefined` for an unregistered id. */
export type ClassicyPackageColorFamiliesLookup = (
	packageId: string | undefined,
) => unknown;

let colorFamiliesLookup: ClassicyPackageColorFamiliesLookup = () => undefined;

/**
 * Sets the color families lookup. Called once, by
 * ClassicyAppearancePackageRegistry.
 * @internal
 */
export const setClassicyPackageColorFamiliesLookup = (
	next: ClassicyPackageColorFamiliesLookup,
): void => {
	colorFamiliesLookup = next;
};

/**
 * The registered package's `defaults.color.families` for `packageId`, or
 * `undefined` while that package is not registered.
 * @internal
 */
export const getClassicyPackageColorFamilies = (
	packageId: string | undefined,
): unknown => colorFamiliesLookup(packageId);
