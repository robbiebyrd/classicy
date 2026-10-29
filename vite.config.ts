import path, { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";
import VitePluginImageTools from "vite-plugin-image-tools";
import richSvg from "vite-plugin-react-rich-svg";
import { classicyCssLayerPlugin } from "./bin/classicyCssLayerPlugin";
import {
	CLASSICY_LAYER_ORDER,
	classicyStyleInjector,
} from "./bin/classicyStyleInjector";

// Package assets under src/Appearance (the Platinum fonts and system art) must
// ship as files in dist/assets, not as base64 inside the bundle. Lib mode
// inlines every asset regardless of `assetsInlineLimit` (`shouldInline` returns
// true for `build.lib`), but a per-import `?no-inline` query short-circuits that
// check. This resolver appends the query to every asset import that resolves
// under src/Appearance, so source files keep plain imports. The emitted files
// are referenced as `new URL("assets/...", import.meta.url)`, relative to the
// bundle. Imports that already carry a Vite query are left alone.
function noInlineAppearanceAssetsPlugin(): Plugin {
	const ASSET_RE = /\.(woff2?|ttf|otf|png|jpe?g|gif|svg|ogg|m4a|mp3|ac3|wav)$/i;

	return {
		name: "classicy-no-inline-appearance-assets",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!importer || source.includes("?")) return null;
			const resolved = await this.resolve(source, importer, {
				...options,
				skipSelf: true,
			});
			if (!resolved) return null;
			const [file] = resolved.id.split("?");
			if (!ASSET_RE.test(file) || !file.includes("/src/Appearance/")) {
				return null;
			}
			return `${resolved.id}${resolved.id.includes("?") ? "&" : "?"}no-inline`;
		},
	};
}

// `import "classicy"` should be enough to get a styled desktop (#303): no CSS
// loader to configure, no second import to remember. This plugin embeds the
// primary stylesheet into each entry bundle (ES and UMD) as a string and
// appends a few lines that, when the module first runs in a browser, insert
// it as `<style id="classicy-styles">` at the *top* of <head>, ahead of the
// host's stylesheets, as when hosts imported classicy.css themselves. (Since
// the rules are layered, an unlayered host rule wins whatever its order or
// specificity.) It is guarded so it runs once
// (a second copy of the library, or HMR, finds the element and stops) and
// never in a non-browser environment (SSR, tests without a DOM).
//
// dist/classicy.css is still emitted, for hosts whose Content-Security-Policy
// forbids inline <style> and who link the file instead; importing it as well as
// the package is harmless (identical rules). Both start with
// CLASSICY_LAYER_ORDER, the cascade layer order, ahead of the
// `@layer classicy.base { … }` blocks classicyCssLayerPlugin compiles every
// component stylesheet into. The code is inserted before the sourceMappingURL
// comment, after all existing code, so the bundles' source maps stay aligned.
//
// dist/fonts.js is a deprecated no-op: the Platinum fonts are files registered
// at runtime (registerClassicyFonts), but `import "classicy/fonts"` must keep
// resolving for existing consumers. UMD allows only one entry, so fonts.js is
// not a Rollup input but an emitted asset: a self-contained script with no
// imports or exports, valid as an ES module, as CommonJS and as a classic
// <script>. dist/fonts.d.ts lets TypeScript resolve the import.
function injectCssPlugin(): Plugin {
	return {
		name: "classicy-inject-css",
		enforce: "post",
		generateBundle(_options, bundle) {
			const cssAsset = Object.values(bundle).find(
				(output) =>
					output.type === "asset" && output.fileName === "classicy.css",
			);
			if (cssAsset?.type !== "asset") return;
			const css =
				typeof cssAsset.source === "string"
					? cssAsset.source
					: new TextDecoder().decode(cssAsset.source);
			const injector = classicyStyleInjector(css);
			// The linked file (strict-CSP hosts) declares the layer order before
			// any rule too, as the injected <style> does -- after the `@charset`
			// Vite hoists to the top, which only counts as a file's first bytes.
			const charset = /^@charset "[^"]*";\n?/.exec(css)?.[0] ?? "";
			cssAsset.source = `${charset}${CLASSICY_LAYER_ORDER}\n${css.slice(charset.length)}`;

			this.emitFile({
				type: "asset",
				fileName: "fonts.js",
				source:
					'// Deprecated no-op: Classicy\'s fonts are registered by the Platinum appearance package (registerClassicyFonts). Kept so `import "classicy/fonts"` keeps resolving.\n',
			});
			this.emitFile({
				type: "asset",
				fileName: "fonts.d.ts",
				source:
					"// Deprecated no-op side-effect module, kept for compatibility: classicy's fonts are registered by the Platinum appearance package.\nexport {};\n",
			});

			for (const output of Object.values(bundle)) {
				if (output.type !== "chunk" || !output.isEntry) continue;
				const marker = output.code.lastIndexOf("\n//# sourceMappingURL=");
				output.code =
					marker === -1
						? `${output.code}\n${injector}`
						: `${output.code.slice(0, marker)}\n${injector}${output.code.slice(marker + 1)}`;
			}
		},
	};
}

// Packages that must resolve to a single shared instance in the consumer's
// app (zustand, most notably -- bundling it would create a second store
// realm) or that are large enough to not belong inlined in a UI library.
// Matched by exact specifier or "<pkg>/<subpath>" so subpath imports (e.g.
// zustand/middleware, react-player/lazy providers) are externalized too.
//
// DO NOT add "@mdxeditor/editor" here. It pulls in @lexical/code -> prismjs,
// and prismjs's language files (prism-clike.js et al) are plain scripts that
// mutate a *global* `Prism` which only prism.js's CommonJS tail installs.
// Rollup (this build, Vite 7) injects a `global` shim, so that tail runs and
// the global exists: `typeof jt < "u" && (jt.Prism = q)`. Rolldown (Vite 8,
// what rt911 builds with) leaves the bare identifier -- `typeof global < "u"
// && (global.Prism = n)` -- which is false in a browser, so the global is
// never set and the first language file throws "Prism is not defined" at
// module-evaluation time, white-screening the whole consumer app.
// Externalizing this package hands that chain to the consumer's bundler and
// took 911realtime.org down (classicy 0.70.0/0.70.1). Keeping it bundled
// keeps prismjs inside a Rollup build that handles it correctly.
//
// DO NOT add "pdfjs-dist" here either, for an unrelated reason: because
// build.lib forces asset inlining, PDFViewerDocument's `?url` import bakes
// *this repo's* pdf.worker into dist as a data: URI. pdf.js refuses to run
// when the worker and the API disagree on version, so externalizing the
// library while still inlining the worker means the consumer supplies the API
// from their own node_modules and the two drift apart on the next release.
// That shipped: classicy inlined the 6.1.200 worker while rt911 resolved the
// 6.2.108 API, and every PDF failed with "Couldn't load this PDF." The two
// halves have to come from one place, and the worker is already pinned here,
// so the library belongs here too.
const externalPackages = [
	"react",
	"react-dom",
	"react/jsx-runtime",
	"zustand",
	"immer",
	"react-player",
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
		noInlineAppearanceAssetsPlugin(),
		// Compiles every component stylesheet into @layer classicy.base; the
		// injected stylesheet declares the layer order first (CLASSICY_LAYER_ORDER).
		classicyCssLayerPlugin(),
		react(),
		dts({
			outDir: "dist/types",
		}),
		richSvg(),
		VitePluginImageTools({
			// Package assets ship exactly as authored (Part E uses the art as CSS
			// masks): no WebP conversion, no svgo. This one option gates the build
			// WebP pass, the svgo pass and the dev middleware alike.
			excludes: /src\/Appearance\//,
			quality: 100,
			enableWebp: true,
			enableDev: true,
			enableDevWebp: true,
		}),
		injectCssPlugin(),
	],
	build: {
		sourcemap: true,
		// Lib mode ignores `assetsInlineLimit` (assets always inline), so it is
		// deliberately not set. noInlineAppearanceAssetsPlugin uses the per-import
		// `?no-inline` opt-out to emit package assets under src/Appearance as files.
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["umd", "es"],
			name: "classicy",
			fileName: (format) => `classicy.${format}.js`,
		},
		rollupOptions: {
			external: isExternal,
			output: {
				// Package assets (src/Appearance/**) go under dist/assets; every
				// other emitted file, the stylesheet included, keeps its root-level
				// name (injectCssPlugin and `classicy/dist/classicy.css` depend on it).
				assetFileNames: (asset) =>
					asset.originalFileNames.some((name) =>
						name.includes("src/Appearance/"),
					)
						? "assets/[name][extname]"
						: "[name][extname]",
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
					"react/jsx-runtime": "react/jsx-runtime",
					zustand: "zustand",
					immer: "immer",
					"react-player": "ReactPlayer",
					"@tanstack/react-table": "ReactTable",
				},
			},
		},
	},
});
