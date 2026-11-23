import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import {
	CLASSICY_DEFLATE_ID_RE,
	classicyDeflateAssetPlugin,
} from "./bin/classicyDeflateAsset";

// Platinum's source, the workspace package @classicy/appearance-platinum
// (plan 0015-kxa §3.1).
const platinumSrc = path.resolve(
	__dirname,
	"./packages/appearance/platinum/src",
);

// In the core's project, Platinum's source imports of `@classicy/classicy`
// load only the core modules it uses (src/__tests__/platinumCoreImports.ts),
// not the whole barrel; Platinum's own project loads the barrel.
const platinumCoreImports = path.resolve(
	__dirname,
	"./src/__tests__/platinumCoreImports.ts",
);
const coreBarrel = path.resolve(__dirname, "./src/index.ts");
const platinumCoreImportsPlugin = (): Plugin => ({
	name: "classicy-platinum-core-imports",
	enforce: "pre",
	resolveId(source, importer) {
		// The alias below has already turned the name into the barrel's path.
		if (
			(source === "@classicy/classicy" || source === coreBarrel) &&
			importer?.startsWith(`${platinumSrc}${path.sep}`) &&
			!/\.test\.tsx?(?:\?|$)/.test(importer)
		)
			return platinumCoreImports;
		return null;
	},
});

export default defineConfig({
	plugins: [
		platinumCoreImportsPlugin(),
		// `?classicy-deflate` imports (the pdf.js worker): the inline `classicy`
		// project extends this config, so the core's tests load them as the
		// library build does.
		classicyDeflateAssetPlugin(),
	],
	test: {
		environment: "jsdom",
		setupFiles: ["./src/__tests__/setup.ts"],
		// A deflated file under node_modules goes through the plugin, not Node.
		server: { deps: { inline: [CLASSICY_DEFLATE_ID_RE] } },
		exclude: ["**/.claude/**", "**/.trunk/**", "**/node_modules/**"],
		// The core's tests here; each workspace package's under its own config
		// (`pnpm --filter <name> exec vitest run` runs it alone).
		projects: [
			{ test: { name: "classicy", exclude: ["packages/**"] } },
			"./packages/appearance/platinum",
			"./packages/appearance/system7",
		],
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: [
			{
				find: /^@classicy\/appearance-platinum$/,
				replacement: path.join(platinumSrc, "index.ts"),
			},
			// System 7's source, the workspace package @classicy/appearance-system7
			// (plan 0018-dbd §2.2), which the theme-variable coverage test imports.
			{
				find: /^@classicy\/appearance-system7$/,
				replacement: path.resolve(
					__dirname,
					"./packages/appearance/system7/src/index.ts",
				),
			},
			{ find: "@", replacement: path.resolve(__dirname, "./src/") },
			{ find: "@img", replacement: path.resolve(__dirname, "./assets/img") },
			{ find: "@vid", replacement: path.resolve(__dirname, "./assets/vid") },
			{
				find: "@classicy/classicy",
				replacement: path.resolve(__dirname, "./src/index.ts"),
			},
		],
	},
});
