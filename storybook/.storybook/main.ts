import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

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
				richSvg(),
				VitePluginImageTools({
					quality: 100,
					enableWebp: true,
					enableDev: true,
					enableDevWebp: true,
				}),
			],
		});
	},
};

export default config;
