// The Platinum art ships as files in dist/assets under its source name
// (assetFileNames: assets/[name][extname], unhashed), so verify:dist pins the
// exact set: every .svg/.png in src/Appearance/Platinum/assets/art, and nothing
// else. A count floor would let a legitimate deletion fail the build and an
// addition hide that many missing files.
//
// Plain erasable TypeScript: check-dist-imports.mjs imports this file through
// Node's type stripping.

/**
 * Where verify:dist reads the expected art names from. Only Platinum ships art
 * today; noInlineAppearanceAssetsPlugin emits every asset under src/Appearance/,
 * so a second in-repo package's art fails verify:dist as "extra" until its
 * directory is added here.
 */
export const CLASSICY_ART_SOURCE_DIR = "src/Appearance/Platinum/assets/art";

const ART_NAME = /\.(?:svg|png)$/;

/** Whether `name` is an art file (.svg or .png). */
export const isClassicyArtName = (name: string): boolean => ART_NAME.test(name);

/**
 * Compares the art in the source directory (`source`) with what dist/assets
 * holds (`shipped`); non-art names on either side are ignored. `missing` is
 * source art dist lacks, `extra` is dist art with no source; both sorted.
 */
export const compareClassicyArtNames = (
	source: ReadonlyArray<string>,
	shipped: ReadonlyArray<string>,
): { missing: string[]; extra: string[] } => {
	const expected = new Set(source.filter(isClassicyArtName));
	const actual = new Set(shipped.filter(isClassicyArtName));
	return {
		missing: [...expected].filter((name) => !actual.has(name)).sort(),
		extra: [...actual].filter((name) => !expected.has(name)).sort(),
	};
};
