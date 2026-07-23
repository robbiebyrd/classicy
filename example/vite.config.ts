import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

// Repo root (this config lives in example/).
const root = path.resolve(__dirname, "..");

// Dev-server only: resolve the `classicy` library from its live source
// (src/*.tsx + co-located *.scss) instead of the built dist bundle. This gives
// the example instant Vite HMR on library edits — no `pnpm build` (tsc -b +
// vite build, ~50s) between a change and seeing it. `vite build` is unaffected
// and still bundles the packaged `classicy` from node_modules, so production
// builds keep exercising the real published artifact.
const liveSourceAliases = [
	// Every component does `import "./X.scss"`, so the full stylesheet arrives
	// through the source module graph as the barrel loads. The app's explicit
	// dist-CSS import is redirected to an empty stub to avoid a stale copy.
	{
		find: /^classicy\/dist\/classicy\.css$/,
		replacement: path.resolve(__dirname, "live-source.css"),
	},
	// Exact match only — `classicy/scss/*` must keep resolving via the package
	// `exports` map (which already points at source).
	{ find: /^classicy$/, replacement: path.resolve(root, "src/index.ts") },
	// Internal path aliases the library source relies on (mirror ../vite.config.ts).
	{ find: "@snd", replacement: path.resolve(root, "assets/sounds") },
	{ find: "@img", replacement: path.resolve(root, "assets/img") },
	{ find: "@vid", replacement: path.resolve(root, "assets/vid") },
	{ find: "@", replacement: path.resolve(root, "src") },
];

// https://vite.dev/config/
export default defineConfig(({ command }) => {
	const useLiveSource = command === "serve";

	return {
		plugins: [
			react(),
			// Mirror the library's asset handling so live source imports (rich SVG
			// components, ?inline/?no-inline images, webp) resolve identically.
			...(useLiveSource
				? [
						richSvg(),
						VitePluginImageTools({
							quality: 100,
							enableWebp: true,
							enableDev: true,
							enableDevWebp: true,
						}),
					]
				: []),
		],
		// Audio sprite formats the library source imports (mirror ../vite.config.ts).
		assetsInclude: useLiveSource
			? ["**/*.ogg", "**/*.m4a", "**/*.mp3", "**/*.ac3", "**/*.wav", "**/*.caf"]
			: [],
		server: {
			headers: {
				"Cross-Origin-Opener-Policy": "same-origin",
				"Cross-Origin-Embedder-Policy": "credentialless",
			},
		},
		build: {
			sourcemap: true,
		},
		resolve: {
			dedupe: ["react", "react-dom"],
			alias: [
				...(useLiveSource ? liveSourceAliases : []),
				// String finds also cover subpaths (react/jsx-runtime, react-dom/client).
				{
					find: "react-dom",
					replacement: path.resolve(__dirname, "node_modules/react-dom"),
				},
				{
					find: "react",
					replacement: path.resolve(__dirname, "node_modules/react"),
				},
			],
		},
		test: {
			environment: "jsdom",
			alias: {
				react: path.resolve("../node_modules/react"),
				"react-dom": path.resolve("../node_modules/react-dom"),
				"react-dom/client": path.resolve("../node_modules/react-dom/client"),
			},
		},
	};
});
