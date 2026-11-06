import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { NodePackageImporter } from "sass";
import { mergeConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";
import { classicyCssLayerPlugin } from "../../bin/classicyCssLayerPlugin";
import { CLASSICY_IMAGE_TOOLS_EXCLUDES } from "../../bin/classicyImageTools";

const repoRoot = path.resolve(import.meta.dirname, "../..");
// Platinum's source, the workspace package @classicy/appearance-platinum.
const platinumSrc = path.join(repoRoot, "packages/appearance/platinum/src");

const config: StorybookConfig = {
	framework: "@storybook/react-vite",
	stories: [
		"../Welcome.mdx",
		"../../src/**/*.mdx",
		"../../src/**/*.stories.@(ts|tsx)",
	],
	addons: ["@storybook/addon-docs"],
	staticDirs: [{ from: "../../assets", to: "/assets" }],
	async viteFinal(config) {
		return mergeConfig(config, {
			// Serve Storybook under a sub-path when STORYBOOK_BASE is set (used by
			// the PR-preview workflow, e.g. "/classicy/pr-preview/pr-12/"). Left
			// unset for the normal/main build so its behavior is unchanged. Vite
			// rewrites glob-imported asset URLs (ClassicyIcons) against this base,
			// so component icons resolve correctly under the preview sub-path.
			base: process.env.STORYBOOK_BASE || config.base,
			// Storybook does not load the root vite.config.ts, so the library
			// build's charset is repeated here: stories exercise the same escaped
			// glyph CSS that dist ships (verify:dist invariant 9).
			esbuild: { charset: "ascii" },
			assetsInclude: [
				"**/*.ogg",
				"**/*.m4a",
				"**/*.mp3",
				"**/*.ac3",
				"**/*.wav",
				"**/*.caf",
			],
			// Platinum's SCSS uses the vocabulary as `pkg:@classicy/classicy/scss/*`.
			css: {
				preprocessorOptions: {
					scss: { importers: [new NodePackageImporter()] },
				},
			},
			resolve: {
				dedupe: ["react", "react-dom"],
				alias: [
					// Platinum (plan 0015-kxa §3.1) reaches the core as
					// `@classicy/classicy`: the stories' own core source, so there is one
					// copy of the registries.
					{
						find: /^@classicy\/classicy$/,
						replacement: path.join(repoRoot, "src/index.ts"),
					},
					{
						find: /^@classicy\/appearance-platinum$/,
						replacement: path.join(platinumSrc, "index.ts"),
					},
					{ find: "@sb", replacement: path.resolve(import.meta.dirname) },
					{ find: "@", replacement: path.join(repoRoot, "src") },
					{ find: "@img", replacement: path.join(repoRoot, "assets/img") },
					{ find: "@vid", replacement: path.join(repoRoot, "assets/vid") },
				],
			},
			plugins: [
				// Storybook compiles the SCSS itself, so the component stylesheets
				// are layered here too (@layer classicy.base), as in the library build.
				classicyCssLayerPlugin(),
				richSvg(),
				VitePluginImageTools({
					// Package art is served and built exactly as authored (no svgo),
					// as in vite.config.ts; story 0146-doe.
					excludes: CLASSICY_IMAGE_TOOLS_EXCLUDES,
					quality: 100,
					// Disabled: pdfjs-dist's worker is imported with `?url` (see
					// PDFViewerDocument.tsx) and is emitted as a plain asset whose
					// name ends in ".mjs". vite-plugin-image-tools's webp-compat
					// pass matches any bundle entry ending in "js"/"css" and
					// assumes it's a JS/CSS chunk (`.code`/`.source`), but an
					// asset only has `.source` — so `.code` is undefined and the
					// plugin crashes trying to `.replace()` it. This only bites
					// once a story renders the real ClassicyDesktop (which pulls
					// in PDFViewer transitively), so webp conversion is disabled
					// here rather than worked around upstream.
					enableWebp: false,
					enableDev: true,
					enableDevWebp: false,
				}),
			],
		});
	},
};

export default config;
