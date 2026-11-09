import path from "node:path";
import { NodePackageImporter } from "sass";
import { defineConfig, type UserConfig } from "vite";
import dts from "vite-plugin-dts";
import { classicyDeclarationExtensionsWriter } from "../../../bin/classicyDeclarationSpecifiers";
import { noInlineAppearanceAssetsPlugin } from "../../../bin/classicyNoInlineAssets";
import { classicyPackageStylesheetsPlugin } from "../../../bin/classicyPackageStylesheets";
import { PLATINUM_FONT_FACES } from "./src/assets/platinumFonts.internal";

// @classicy/appearance-platinum's library build: ES and UMD bundles of the
// Platinum Appearance Package (plan 0015-kxa §3.1). The core is a peer
// dependency and stays external in both formats, so a host's one copy of the
// core's registries (package, asset, sound pack, log) is the one Platinum
// registers into (design 0014-ahm, anti-goal "Two copies of the registries").
// Since §3.4 this is Platinum's only build: the core's bundle no longer
// carries it. `pnpm build` runs bin/verify-dist.mjs on the result.

const externalPackages = [
	"@classicy/classicy",
	"react",
	"react-dom",
	"react/jsx-runtime",
	// The screen savers' config schemas (plan 0016-vbq §2.1): a dependency of
	// the package, installed and deduplicated by the host's package manager.
	"zod",
];

// Asset imports carrying a Vite query (`?inline`, `?raw`, …) are never
// externalized: the query is a Vite source convention (see the core's
// vite.config.ts).
const isAssetQuery = (id: string) =>
	/\?(?:.*&)?(?:url|raw|worker|inline)\b/.test(id);

const isExternal = (id: string) =>
	!isAssetQuery(id) &&
	externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

// `--mode bundle-test` (PlatinumOneRegistry.test.ts, which builds the bundles
// into a scratch folder before any core build) skips the type declarations:
// they resolve `@classicy/classicy` to the core's built declarations.
export default defineConfig(({ command, mode }) => {
	// A shipped bundle is a production build whatever the shell exports (see
	// the core's vite.config.ts): Vite picks esbuild's dev JSX transform
	// (react/jsx-dev-runtime, jsxDEV() calls carrying the builder's paths)
	// from process.env.NODE_ENV, defaulting it only when unset. Platinum's
	// screen savers are its first JSX (plan 0016-vbq §2.1).
	if (command === "build") process.env.NODE_ENV = "production";
	return platinumConfig(mode);
});

const platinumConfig = (mode: string): UserConfig => ({
	// A shipped bundle is a production build (see the core's vite.config.ts).
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	// The package's glyph `content` escapes stay ASCII, as in the core's
	// build (verify:dist invariant 9).
	esbuild: { charset: "ascii" },
	base: "./",
	assetsInclude: ["**/*.ogg", "**/*.m4a", "**/*.mp3", "**/*.ac3", "**/*.wav"],
	css: {
		preprocessorOptions: {
			// The vocabulary is `pkg:@classicy/classicy/scss/<module>`.
			scss: { importers: [new NodePackageImporter()] },
		},
	},
	// Every asset in the package ships as a file in dist/assets: its art and
	// fonts (src/assets), the sound sprites, wallpapers, art and cursors in
	// assets/ (plan 0015-kxa §3.3) and the screen savers' art (src/screenSavers,
	// plan 0016-vbq §2.1). Only the halftone mask is inlined (ruling
	// E17).
	plugins: [
		noInlineAppearanceAssetsPlugin(),
		// dist/classicy-platinum.css and dist/classicy-platinum.fonts.css, the
		// stylesheets strict-CSP hosts link after the core's classicy.css.
		classicyPackageStylesheetsPlugin({
			packageId: "platinum",
			fonts: { faces: PLATINUM_FONT_FACES, dir: "src/assets/fonts" },
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
							// No exported type refers to the JSON: platinumJson is PlatinumJson.
							"**/*.json",
						],
						// Each relative specifier gets the `.js` its module ships as:
						// a node16/nodenext host resolves `"./hooks"` to nothing in a
						// `"type": "module"` package (verify-dist invariant 7).
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
			name: "classicyAppearancePlatinum",
			fileName: (format) => `appearance-platinum.${format}.js`,
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
					zod: "Zod",
				},
			},
		},
	},
});
