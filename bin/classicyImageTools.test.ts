import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASSICY_IMAGE_TOOLS_EXCLUDES } from "./classicyImageTools";

describe("CLASSICY_IMAGE_TOOLS_EXCLUDES", () => {
	it("matches package art in the repo and in the packages/ layout", () => {
		for (const id of [
			"/r/src/Appearance/Platinum/assets/art/resizer.svg",
			"/r/packages/appearance/platinum/src/assets/art/resizer.svg",
		]) {
			expect(CLASSICY_IMAGE_TOOLS_EXCLUDES.test(id)).toBe(true);
		}
	});

	it("leaves other images to the image plugin", () => {
		expect(CLASSICY_IMAGE_TOOLS_EXCLUDES.test("/r/assets/img/logo.png")).toBe(
			false,
		);
	});

	it("is the pattern both the library and Storybook configs hand the plugin", () => {
		for (const file of ["vite.config.ts", "storybook/.storybook/main.ts"]) {
			const source = readFileSync(file, "utf8");
			expect(source, file).toContain("excludes: CLASSICY_IMAGE_TOOLS_EXCLUDES");
		}
	});
});
