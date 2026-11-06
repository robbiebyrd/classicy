import path from "node:path";
import { defineConfig } from "vitest/config";

// The package's tests run against the workspace core's source: Platinum's
// `@classicy/classicy` imports resolve to the core's barrel, so they share
// its one set of registries, and the core's test setup and aliases apply
// (tests may import core internals and helpers as `@/…`). The root's
// `vitest run` runs this project too (vitest.config.ts `projects`).

const repoRoot = path.resolve(import.meta.dirname, "../../..");

export default defineConfig({
	test: {
		name: "appearance-platinum",
		environment: "jsdom",
		setupFiles: [path.join(repoRoot, "src/__tests__/setup.ts")],
		exclude: ["**/node_modules/**", "**/dist/**", "resources/**"],
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			"@classicy/classicy": path.join(repoRoot, "src/index.ts"),
			"@": path.join(repoRoot, "src"),
			"@img": path.join(repoRoot, "assets/img"),
			"@snd": path.join(repoRoot, "assets/sounds"),
			"@vid": path.join(repoRoot, "assets/vid"),
		},
	},
});
