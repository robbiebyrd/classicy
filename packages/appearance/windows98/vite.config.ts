import path from "node:path";
import { NodePackageImporter } from "sass";
import { defineConfig, type UserConfig } from "vite";
import dts from "vite-plugin-dts";
import { classicyDeclarationExtensionsWriter } from "../../../bin/classicyDeclarationSpecifiers";
import { noInlineAppearanceAssetsPlugin } from "../../../bin/classicyNoInlineAssets";
import { classicyPackageStylesheetsPlugin } from "../../../bin/classicyPackageStylesheets";
import { classicySourceMapTextPlugin } from "../../../bin/classicySourceMapText";

// @classicy/appearance-windows98's library build: ES and UMD bundles of the
// Windows 98 Appearance Package, built as System 7's is
// (packages/appearance/system7/vite.config.ts). The core is a peer
// dependency and stays external in both formats, so a host's one copy of the
// core's registries (package, asset, sound pack, log) is the one Windows 98
// registers into (design 0014-ahm, anti-goal "Two copies of the registries").
// `pnpm build` runs bin/verify-dist.mjs on the result.
//
// The package ships no fonts: Windows' MS Sans Serif is Microsoft's, so its
// themes name a stack a host may satisfy ("Pixelated MS Sans Serif" first,
// then the system faces), and there is no classicy-windows98.fonts.css.

const externalPackages = [
	"@classicy/classicy",
	"react",
	"react-dom",
	"react/jsx-runtime",
];

// Asset imports carrying a Vite query (`?inline`, `?raw`, …) are never
// externalized: the query is a Vite source convention (see the core's
// vite.config.ts).
const isAssetQuery = (id: string) =>
	/\?(?:.*&)?(?:url|raw|worker|inline)\b/.test(id);

const isExternal = (id: string) =>
	!isAssetQuery(id) &&
	externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

// `--mode bundle-test` (Windows98OneRegistry.test.ts, which builds the
// bundles into a scratch folder before any core build) skips the type
// declarations: they resolve `@classicy/classicy` to the core's built
// declarations.
export default defineConfig(({ command, mode }) => {
	// A shipped bundle is a production build whatever the shell exports (see
	// the core's vite.config.ts and Platinum's): the JSX transform follows
	// process.env.NODE_ENV.
	if (command === "build") process.env.NODE_ENV = "production";
	return windows98Config(mode);
});

const windows98Config = (mode: string): UserConfig => ({
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	// The package's glyph `content` escapes stay ASCII, as in the core's
	// build (verify-dist invariant 5).
	esbuild: { charset: "ascii" },
	base: "./",
	css: {
		preprocessorOptions: {
			// The vocabulary is `pkg:@classicy/classicy/scss/<module>`.
			scss: { importers: [new NodePackageImporter()] },
		},
	},
	// Every asset in the package ships as a file in dist/assets (its art, its
	// icons and its sound sheet), nothing inlined.
	plugins: [
		noInlineAppearanceAssetsPlugin(),
		// dist/classicy-windows98.css, the stylesheet strict-CSP hosts link
		// after the core's classicy.css. No fonts: no fonts stylesheet.
		classicyPackageStylesheetsPlugin({ packageId: "windows98" }),
		...(mode === "bundle-test"
			? []
			: [
					dts({
						tsconfigPath: "tsconfig.build.json",
						// No declaration maps (verify:dist, invariant 7).
						compilerOptions: { declarationMap: false },
						entryRoot: "src",
						outDir: "dist/types",
						exclude: [
							"**/*.test.ts",
							"**/*.test.tsx",
							"**/__tests__/**",
							"**/*.stories.tsx",
							// No exported type refers to the JSON: windows98Json is Windows98Json.
							"**/*.json",
						],
						// Each relative specifier gets the `.js` its module ships as:
						// a node16/nodenext host resolves `"./assets/…"` to nothing in
						// a `"type": "module"` package (verify-dist invariant 7).
						beforeWriteFile: classicyDeclarationExtensionsWriter({
							root: import.meta.dirname,
							entryRoot: "src",
						}),
					}),
				]),
		// Last: the published maps keep Classicy's own text and drop zod's
		// and any embedded asset's (verify-dist invariant 10).
		classicySourceMapTextPlugin(),
	],
	build: {
		sourcemap: true,
		lib: {
			entry: path.resolve(import.meta.dirname, "src/index.ts"),
			formats: ["es", "umd"],
			name: "classicyAppearanceWindows98",
			fileName: (format) => `appearance-windows98.${format}.js`,
		},
		rollupOptions: {
			external: isExternal,
			output: {
				// Package assets go under dist/assets, each under its source
				// name (no two share one: every name in art/ and icons/ is
				// unique, and verify-dist fails two sources that would collide).
				assetFileNames: "assets/[name][extname]",
				globals: {
					"@classicy/classicy": "classicy",
					react: "React",
					"react-dom": "ReactDOM",
					"react/jsx-runtime": "react/jsx-runtime",
				},
			},
		},
	},
});
