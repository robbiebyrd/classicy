import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: ["./src/__tests__/setup.ts"],
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			"@": path.resolve(__dirname, "./src/"),
			"@img": path.resolve(__dirname, "./assets/img"),
			"@snd": path.resolve(__dirname, "./assets/sounds"),
			classicy: path.resolve(__dirname, "./src/index.ts"),
		},
	},
});
