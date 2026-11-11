import path from "node:path";
import { NodePackageImporter } from "sass";
import { defineConfig, type UserConfig } from "vite";
import dts from "vite-plugin-dts";
import { classicyDeclarationExtensionsWriter } from "../../../bin/classicyDeclarationSpecifiers";
import { noInlineAppearanceAssetsPlugin } from "../../../bin/classicyNoInlineAssets";
import { classicyPackageStylesheetsPlugin } from "../../../bin/classicyPackageStylesheets";
import { SYSTEM7_FONT_FACES } from "./src/assets/system7Fonts.internal";

// @classicy/appearance-system7's library build: ES and UMD bundles of the
// System 7 Appearance Package (plan 0018-dbd §2.2), built as Platinum's is
// (packages/appearance/platinum/vite.config.ts). The core is a peer
// dependency and stays external in both formats, so a host's one copy of the
// core's registries (package, asset, sound pack, log) is the one System 7
// registers into (design 0014-ahm, anti-goal "Two copies of the registries").
// `pnpm build` runs bin/verify-dist.mjs on the result.

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

// `--mode bundle-test` (System7OneRegistry.test.ts, which builds the bundles
// into a scratch folder before any core build) skips the type declarations:
// they resolve `@classicy/classicy` to the core's built declarations.
export default defineConfig(({ command, mode }) => {
	// A shipped bundle is a production build whatever the shell exports (see
	// the core's vite.config.ts and Platinum's): the JSX transform follows
	// process.env.NODE_ENV.
	if (command === "build") process.env.NODE_ENV = "production";
	return system7Config(mode);
});

const system7Config = (mode: string): UserConfig => ({
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	// The package's glyph `content` escapes stay ASCII, as in the core's
	// build (verify-dist invariant 5).
	esbuild: { charset: "ascii" },
	base: "./",
	assetsInclude: ["**/*.ogg", "**/*.m4a", "**/*.mp3", "**/*.ac3", "**/*.wav"],
	css: {
		preprocessorOptions: {
			// The vocabulary is `pkg:@classicy/classicy/scss/<module>`.
			scss: { importers: [new NodePackageImporter()] },
		},
	},
	// Every asset in the package ships as a file in dist/assets (its fonts and
	// its sound sheet today), nothing inlined.
	plugins: [
		noInlineAppearanceAssetsPlugin(),
		// dist/classicy-system7.css and dist/classicy-system7.fonts.css, the
		// stylesheets strict-CSP hosts link after the core's classicy.css.
		classicyPackageStylesheetsPlugin({
			packageId: "system7",
			fonts: { faces: SYSTEM7_FONT_FACES, dir: "src/assets/fonts" },
		}),
		...(mode === "bundle-test"
			? []
			: [
					dts({
						tsconfigPath: "tsconfig.build.json",
						entryRoot: "src",
						outDir: "dist/types",
						exclude: [
							"**/*.test.ts",
							"**/*.test.tsx",
							"**/__tests__/**",
							"**/*.stories.tsx",
							// No exported type refers to the JSON: system7Json is System7Json.
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
	],
	build: {
		sourcemap: true,
		lib: {
			entry: path.resolve(import.meta.dirname, "src/index.ts"),
			formats: ["es", "umd"],
			name: "classicyAppearanceSystem7",
			fileName: (format) => `appearance-system7.${format}.js`,
		},
		rollupOptions: {
			external: isExternal,
			output: {
				// Package assets go under dist/assets.
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
