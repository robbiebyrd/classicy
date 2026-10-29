// The type declarations the package ships (dist/types, emitted by
// vite-plugin-dts) are for the library only. Tests, test helpers, stories and
// the build scripts in bin/ are compiled by tsc like everything else, so
// without an explicit exclude every one of them shipped a .d.ts in the tarball.
//
// Plain erasable TypeScript: check-dist-imports.mjs imports this file through
// Node's type stripping.

/**
 * vite-plugin-dts's `exclude` (vite.config.ts). It replaces the plugin's
 * default (`node_modules/**`, or tsconfig's `exclude`), so it repeats
 * `node_modules/**`; tsconfig's own excludes still apply, because the plugin
 * filters the files tsconfig already selected.
 */
export const CLASSICY_DTS_EXCLUDE = [
	"node_modules/**",
	"**/*.test.ts",
	"**/*.test.tsx",
	"**/__tests__/**",
	"**/*.stories.ts",
	"**/*.stories.tsx",
	"bin/**",
];

const TEST_DECLARATION = /\.(?:test|stories)\.d\.ts(?:\.map)?$/;
const TEST_HELPER_DIRECTORY = /(?:^|[\\/])__tests__[\\/]/;

/**
 * The paths among `files` (relative to dist/types) that declare a test, a
 * test helper or a story, or are such a declaration's map.
 */
export const findClassicyTestDeclarations = (
	files: ReadonlyArray<string>,
): string[] =>
	files.filter(
		(file) => TEST_DECLARATION.test(file) || TEST_HELPER_DIRECTORY.test(file),
	);

const BUILD_SCRIPT_DECLARATION = /^bin[\\/]/;

/**
 * The paths among `files` (relative to dist/types) that declare one of the
 * build scripts in the repository's bin/ (the Vite plugins, the dist checks),
 * or are such a declaration's map. Consumers never import them.
 */
export const findClassicyBuildScriptDeclarations = (
	files: ReadonlyArray<string>,
): string[] => files.filter((file) => BUILD_SCRIPT_DECLARATION.test(file));
