import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { NodePackageImporter } from "sass";
import { mergeConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";
import { classicyCssLayerPlugin } from "../../bin/classicyCssLayerPlugin";
import { classicyDeflateAssetPlugin } from "../../bin/classicyDeflateAsset";
import { CLASSICY_IMAGE_TOOLS_EXCLUDES } from "../../bin/classicyImageTools";

const repoRoot = path.resolve(import.meta.dirname, "../..");
// Platinum's source, the workspace package @classicy/appearance-platinum.
const platinumSrc = path.join(repoRoot, "packages/appearance/platinum/src");
// System 7's source, the workspace package @classicy/appearance-system7,
// registered only in the iframes of its own stories (./system7.ts) or where
// the Package toolbar chose it (./StorybookPackages.ts).
const system7Src = path.join(repoRoot, "packages/appearance/system7/src");
// Windows 98's source, the workspace package @classicy/appearance-windows98,
// registered the same way (./windows98.ts, ./StorybookPackages.ts).
const windows98Src = path.join(repoRoot, "packages/appearance/windows98/src");

const config: StorybookConfig = {
	framework: "@storybook/react-vite",
	stories: [
		"../Welcome.mdx",
		"../../src/**/*.mdx",
		"../../src/**/*.stories.@(ts|tsx)",
		// Platinum's own stories (its screen savers, plan 0016-vbq §2.1).
		"../../packages/appearance/platinum/src/**/*.stories.@(ts|tsx)",
		// System 7's own stories (plan 0018-dbd §2.2).
		"../../packages/appearance/system7/src/**/*.stories.@(ts|tsx)",
		// Windows 98's own stories.
		"../../packages/appearance/windows98/src/**/*.stories.@(ts|tsx)",
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
			assetsInclude: ["**/*.ogg", "**/*.m4a", "**/*.wav", "**/*.caf"],
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
					{
						find: /^@classicy\/appearance-system7$/,
						replacement: path.join(system7Src, "index.ts"),
					},
					{
						find: /^@classicy\/appearance-windows98$/,
						replacement: path.join(windows98Src, "index.ts"),
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
				// `?classicy-deflate` imports, as in the library build
				// (bin/classicyDeflateAsset.ts): the pdf.js worker is a string in the
				// PDF viewer's lazy chunk, which rebuilds its data: URI when the first
				// PDF opens, so Storybook emits no worker file.
				classicyDeflateAssetPlugin(),
				richSvg(),
				VitePluginImageTools({
					// Package art is served and built exactly as authored (no svgo),
					// as in vite.config.ts; story 0146-doe.
					excludes: CLASSICY_IMAGE_TOOLS_EXCLUDES,
					quality: 100,
					// Disabled. First because pdfjs-dist's worker, imported with
					// `?url`, was emitted as an asset named "...mjs", and
					// vite-plugin-image-tools's webp-compat pass, which takes any
					// bundle entry ending in "js"/"css" for a chunk, crashed on its
					// missing `.code`. The worker is now embedded deflated
					// (`?classicy-deflate`, in a JS chunk), so that asset is gone,
					// but WebP stays off: turning it on would re-encode the static
					// build's images, which the parity tools shoot (bin/parity/
					// README.md), so story pixels could move with it.
					enableWebp: false,
					enableDev: true,
					enableDevWebp: false,
				}),
			],
		});
	},
};

export default config;
