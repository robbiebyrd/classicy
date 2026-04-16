import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		sourcemap: true,
	},
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			react: path.resolve("./node_modules/react"),
			"react-dom": path.resolve("./node_modules/react-dom"),
		},
	},
	test: {
		environment: "jsdom",
		alias: {
			react: path.resolve("../node_modules/react"),
			"react-dom": path.resolve("../node_modules/react-dom"),
			"react-dom/client": path.resolve("../node_modules/react-dom/client"),
		},
	},
});
