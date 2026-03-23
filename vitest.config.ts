import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/"),
      "@img": path.resolve(__dirname, "./assets/img"),
      "@snd": path.resolve(__dirname, "./assets/sounds"),
    },
  },
});
