import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

// Packages that must resolve to a single shared instance in the consumer's
// app (zustand, most notably -- bundling it would create a second store
// realm) or that are large enough to not belong inlined in a UI library.
// Matched by exact specifier or "<pkg>/<subpath>" so subpath imports (e.g.
// zustand/middleware, react-player/lazy providers) are externalized too.
const externalPackages = [
	"react",
	"react-dom",
	"react/jsx-runtime",
	"zustand",
	"immer",
	"react-player",
	"pdfjs-dist",
	"@mdxeditor/editor",
	"@tanstack/react-table",
];

const isExternal = (id: string) =>
	externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

export default defineConfig({
	// Shipped bundles are for browser/consumer-app consumption, never Node --
	// hardcode NODE_ENV so `process.env.NODE_ENV` doesn't survive into the
	// UMD build, where `process` is undefined and dispatch throws a
	// ReferenceError. (vitest uses its own vitest.config.ts, so this doesn't
	// touch the test run.)
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	base: "./",
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
			"@vid": path.resolve(__dirname, "./assets/vid"),
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
			external: isExternal,
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
					"react/jsx-runtime": "react/jsx-runtime",
					zustand: "zustand",
					immer: "immer",
					"react-player": "ReactPlayer",
					"pdfjs-dist": "pdfjsLib",
					"@mdxeditor/editor": "MDXEditor",
					"@tanstack/react-table": "ReactTable",
				},
			},
		},
	},
});
