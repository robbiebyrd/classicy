import path from "node:path";
import { NodePackageImporter } from "sass";
import { defineConfig } from "vite";
import { noInlineAppearanceAssetsPlugin } from "../../../bin/classicyNoInlineAssets";

// @classicy/appearance-platinum's library build: ES and UMD bundles of the
// Platinum Appearance Package (plan 0015-kxa §3.1). The core is a peer
// dependency and stays external in both formats, so a host's one copy of the
// core's registries (package, asset, sound pack, log) is the one Platinum
// registers into (design 0014-ahm, anti-goal "Two copies of the registries").

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

export default defineConfig({
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
	// fonts (src/assets) and the sound sprites, wallpapers, art and cursors in
	// assets/ (plan 0015-kxa §3.3). Only the halftone mask is inlined (ruling
	// E17).
	plugins: [noInlineAppearanceAssetsPlugin()],
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
				},
			},
		},
	},
});
