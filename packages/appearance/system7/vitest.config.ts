import path from "node:path";
import { defineConfig } from "vitest/config";

// The package's tests run against the workspace core's source, as Platinum's
// do (packages/appearance/platinum/vitest.config.ts): System 7's
// `@classicy/classicy` imports resolve to the core's barrel, so they share
// its one set of registries, and the core's test setup and aliases apply
// (tests may import core internals and helpers as `@/…`). The root's
// `vitest run` runs this project too (vitest.config.ts `projects`).

const repoRoot = path.resolve(import.meta.dirname, "../../..");

export default defineConfig({
	// Platinum's sound sprites include an ac3 file, a format Vite does not know
	// as an asset: tests that register Platinum beside System 7 import it.
	assetsInclude: ["**/*.ac3"],
	test: {
		name: "appearance-system7",
		environment: "jsdom",
		setupFiles: [path.join(repoRoot, "src/__tests__/setup.ts")],
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
