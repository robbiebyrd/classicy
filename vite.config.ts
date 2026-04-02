import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

export default defineConfig({
	assetsInclude: [
		"**/*.ogg",
		"**/*.m4a",
		"**/*.mp3",
		"**/*.ac3",
		"**/*.wav",
		"**/*.caf",
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/"),
			"@snd": path.resolve(__dirname, "./assets/sounds"),
			"@img": path.resolve(__dirname, "./assets/img"),
		},
	},
	plugins: [
		react(),
		dts({
			outDir: "dist/types",
		}),
		richSvg(),
		VitePluginImageTools({
			quality: 100,
			enableWebp: true,
			enableDev: true,
			enableDevWebp: true,
		}),
	],
	build: {
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["umd", "es"],
			name: "classicy",
			fileName: (format) => `classicy.${format}.js`,
		},
		rollupOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
					"react/jsx-runtime": "react/jsx-runtime",
				},
			},
		},
	},
});
