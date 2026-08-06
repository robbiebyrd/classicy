import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";

// dist/classicy.css is dominated by base64 @font-face `src:` data URIs (the
// bundled fonts in AppearanceManager/styles/fonts.scss) -- every consumer
// downloads every bundled font whether or not their theme uses them. Those
// rules are pulled in via a plain `import "...fonts.scss"` deep inside the
// component tree (ClassicyDesktop.tsx), so by the time Rollup gets to CSS
// output they're indistinguishable from any other stylesheet content -- and
// because this is `build.lib` with `formats: ["umd", "es"]`, UMD forbids a
// second entry point (Rollup errors if `lib.entry` isn't a single module for
// non-ESM formats), so "give fonts.scss its own rollup input" isn't
// available here without dropping UMD or a second build pass.
// Splitting therefore happens post-render instead: this plugin's
// `generateBundle` hook runs once per output format, finds the emitted CSS
// asset(s), regex-extracts every `@font-face` block whose `src` is a
// `data:` URI into a sibling `fonts.css` asset (emitted via `emitFile`, same
// mechanism Rollup uses for any other build-time asset), and rewrites the
// original CSS asset's `source` with those blocks removed. `@font-face`
// rules never nest braces, so a non-greedy-free `[^}]*` scan between `{`/`}`
// is a safe, complete parse of each rule -- no CSS parser dependency needed.
// While a rule is in hand, it also backfills `font-display: swap` on faces
// that don't already declare it, so extracting these into an opt-in
// stylesheet doesn't newly block text rendering on whether a consumer
// happened to load fonts.css yet.
function splitFontFacesPlugin(): Plugin {
	const FONT_FACE_RE = /@font-face\s*\{[^}]*\}/g;

	return {
		name: "classicy-split-font-faces",
		// MUST be "post". Vite's own `vite:css-post` plugin is what actually
		// adds the bundled .css asset, and it does so in its generateBundle.
		// An unordered user plugin's generateBundle runs BEFORE that, so the
		// bundle contains no .css asset yet, the loop below matches nothing,
		// and the split silently no-ops — which is exactly what happened
		// before this was added.
		enforce: "post",
		generateBundle(_options, bundle) {
			for (const fileName of Object.keys(bundle)) {
				const output = bundle[fileName];
				if (output.type !== "asset" || !fileName.endsWith(".css")) continue;

				const source =
					typeof output.source === "string"
						? output.source
						: new TextDecoder().decode(output.source);

				const extractedFaces: string[] = [];
				const remainingCss = source.replace(FONT_FACE_RE, (rule) => {
					// Leave any non-inlined @font-face (e.g. a future system-font
					// fallback) in the primary stylesheet -- only base64 payloads
					// are the size problem this split exists to solve.
					if (!rule.includes("data:")) return rule;

					const ruleWithDisplay = /font-display\s*:/.test(rule)
						? rule
						: rule.replace("{", "{\n  font-display: swap;");

					extractedFaces.push(ruleWithDisplay);
					return "";
				});

				if (extractedFaces.length === 0) continue;

				output.source = remainingCss;
				this.emitFile({
					type: "asset",
					fileName: "fonts.css",
					source: extractedFaces.join("\n\n"),
				});
			}
		},
	};
}

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

// Asset imports carrying a Vite query (`?url`, `?raw`, `?worker`, ...) are
// NOT module imports and must never be externalized, even when they live
// under an external package: the query is a Vite *source* convention with no
// meaning to a consumer's resolver. Externalizing one emits it verbatim into
// dist, where it breaks every consumer path that doesn't run vite:asset --
// `vite dev` (rolldown pre-bundles deps, "No such file or directory") and
// vitest (externalizes node_modules to Node ESM, "does not provide an export
// named 'default'"). `vite build` still works, so the breakage is invisible
// here. Let vite:asset claim these and inline them instead.
const isAssetQuery = (id: string) =>
	/\?(?:.*&)?(?:url|raw|worker|inline)\b/.test(id);

const isExternal = (id: string) =>
	!isAssetQuery(id) &&
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
		splitFontFacesPlugin(),
	],
	build: {
		sourcemap: true,
		// NOTE: `assetsInlineLimit` is deliberately NOT set here — it would do
		// nothing. Because `build.lib` is set below (umd/es dual-format output),
		// Vite's asset pipeline short-circuits to "always inline" BEFORE it ever
		// reads that option. From Vite's docs: "If you specify build.lib,
		// build.assetsInlineLimit will be ignored and assets will always be
		// inlined, regardless of file size." Verified empirically too — adding
		// the option changed dist/classicy.es.js by 1.4 kB (the config line
		// itself) and removed no data URIs.
		//
		// That is why ~78% of the JS bundle is base64: a 1.79 MB audio sprite,
		// a 1.67 MB inlined worker, and 384 PNGs. The only supported opt-out is
		// a per-import `?no-inline` query at each asset's import site
		// (PDFViewerDocument.tsx's pdf.worker URL, ClassicySounds.ts's sprite
		// `new URL(...)`, every @img import) — a source-wide change with real
		// runtime risk, since it moves worker/audio URL resolution from an
		// unconditional data: URI to a path the consumer's bundler must resolve.
		// jsdom tests cannot catch a regression there. Not attempted here.
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
