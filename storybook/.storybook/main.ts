import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";
import { classicyCssLayerPlugin } from "../../bin/classicyCssLayerPlugin";

const repoRoot = path.resolve(import.meta.dirname, "../..");

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
			// unset for the normal/main build so its behaviour is unchanged. Vite
			// rewrites glob-imported asset URLs (ClassicyIcons) against this base,
			// so component icons resolve correctly under the preview sub-path.
			base: process.env.STORYBOOK_BASE || config.base,
			assetsInclude: [
				"**/*.ogg",
				"**/*.m4a",
				"**/*.mp3",
				"**/*.ac3",
				"**/*.wav",
				"**/*.caf",
			],
			resolve: {
				dedupe: ["react", "react-dom"],
				alias: {
					"@sb": path.resolve(import.meta.dirname),
					"@": path.join(repoRoot, "src"),
					"@snd": path.join(repoRoot, "assets/sounds"),
					"@img": path.join(repoRoot, "assets/img"),
					"@vid": path.join(repoRoot, "assets/vid"),
				},
			},
			plugins: [
				// Storybook compiles the SCSS itself, so the component stylesheets
				// are layered here too (@layer classicy.base), as in the library build.
				classicyCssLayerPlugin(),
				richSvg(),
				VitePluginImageTools({
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
