// The type declarations the package ships (dist/types, emitted by
// vite-plugin-dts) are for the library only. Tests, test helpers, stories and
// the build scripts in bin/, the root build configs (vite.config.ts,
// vitest.config.ts) and every imported JSON file (resolveJsonModule:
// package.json, platinum.json, the sound sprite map) are compiled by tsc like
// everything else, so without an explicit exclude every one of them shipped a
// .d.ts in the tarball.
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
	// Root only: no leading **/, so a library module named *.config.ts ships.
	"*.config.ts",
	// JSON is bundled into the JS; no exported type refers to its declaration.
	"**/*.json",
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
const ROOT_CONFIG_DECLARATION = /^[^\\/]+\.config\.d\.ts(?:\.map)?$/;

/**
 * The paths among `files` (relative to dist/types) that declare one of the
 * build scripts in the repository's bin/ (the Vite plugins, the dist checks)
 * or a root build config (vite.config.ts, vitest.config.ts), or are such a
 * declaration's map. Consumers never import them.
 */
export const findClassicyBuildScriptDeclarations = (
	files: ReadonlyArray<string>,
): string[] =>
	files.filter(
		(file) =>
			BUILD_SCRIPT_DECLARATION.test(file) || ROOT_CONFIG_DECLARATION.test(file),
	);

const JSON_DECLARATION = /\.json\.d\.ts(?:\.map)?$/;

/**
 * The paths among `files` (relative to dist/types) that declare an imported
 * JSON file (package.json, platinum.json, …), or are such a declaration's map.
 */
export const findClassicyJsonDeclarations = (
	files: ReadonlyArray<string>,
): string[] => files.filter((file) => JSON_DECLARATION.test(file));
