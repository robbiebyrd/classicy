import path from "node:path";
import { defineConfig } from "vitest/config";
import {
	CLASSICY_DEFLATE_ID_RE,
	classicyDeflateAssetPlugin,
} from "../../../bin/classicyDeflateAsset";

// The package's tests run against the workspace core's source, as Platinum's
// do (packages/appearance/platinum/vitest.config.ts): System 7's
// `@classicy/classicy` imports resolve to the core's barrel, so they share
// its one set of registries, and the core's test setup and aliases apply
// (tests may import core internals and helpers as `@/…`). The root's
// `vitest run` runs this project too (vitest.config.ts `projects`).

const repoRoot = path.resolve(import.meta.dirname, "../../..");

export default defineConfig({
	// `?classicy-deflate` imports (the pdf.js worker) load as in the core's
	// library build (bin/classicyDeflateAsset.ts).
	plugins: [classicyDeflateAssetPlugin()],
	// Platinum's sound sprites include an ac3 file, a format Vite does not know
	// as an asset: tests that register Platinum beside System 7 import it.
	assetsInclude: ["**/*.ac3"],
	test: {
		name: "appearance-system7",
		environment: "jsdom",
		setupFiles: [path.join(repoRoot, "src/__tests__/setup.ts")],
		// A deflated file under node_modules goes through the plugin, not Node.
		server: { deps: { inline: [CLASSICY_DEFLATE_ID_RE] } },
		exclude: ["**/node_modules/**", "**/dist/**"],
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			"@classicy/classicy": path.join(repoRoot, "src/index.ts"),
			"@": path.join(repoRoot, "src"),
			"@img": path.join(repoRoot, "assets/img"),
			"@vid": path.join(repoRoot, "assets/vid"),
		},
	},
});
