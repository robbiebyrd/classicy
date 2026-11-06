import { describe, expect, it } from "vitest";
import {
	CLASSICY_DTS_EXCLUDE,
	findClassicyBuildScriptDeclarations,
	findClassicyJsonDeclarations,
	findClassicyTestDeclarations,
} from "./classicyDistTypes";

describe("CLASSICY_DTS_EXCLUDE", () => {
	it("keeps tests, test helpers and stories out of the declarations", () =>
		expect(CLASSICY_DTS_EXCLUDE).toEqual(
			expect.arrayContaining([
				"node_modules/**",
				"**/*.test.ts",
				"**/*.test.tsx",
				"**/__tests__/**",
				"**/*.stories.ts",
				"**/*.stories.tsx",
			]),
		));

	it("keeps the build scripts in bin/ out of the declarations", () =>
		expect(CLASSICY_DTS_EXCLUDE).toContain("bin/**"));

	it("keeps the root build configs (vite.config.ts, vitest.config.ts) out of the declarations", () =>
		expect(CLASSICY_DTS_EXCLUDE).toContain("*.config.ts"));

	it("keeps imported JSON (package.json, theme and sound data) out of the declarations", () =>
		expect(CLASSICY_DTS_EXCLUDE).toContain("**/*.json"));
});

describe("findClassicyTestDeclarations", () => {
	it("finds test, test-helper and story declarations and their maps", () =>
		expect(
			findClassicyTestDeclarations([
				"src/SystemFolder/SystemResources/Button/ClassicyButton.test.d.ts",
				"src/SystemFolder/SystemResources/Button/ClassicyButton.test.d.ts.map",
				"src/__tests__/setup.d.ts",
				"src\\Appearance\\__tests__\\appearanceProbe.d.ts",
				"bin/classicyPackageCss.test.d.ts",
				"src/Button.stories.d.ts",
			]),
		).toEqual([
			"src/SystemFolder/SystemResources/Button/ClassicyButton.test.d.ts",
			"src/SystemFolder/SystemResources/Button/ClassicyButton.test.d.ts.map",
			"src/__tests__/setup.d.ts",
			"src\\Appearance\\__tests__\\appearanceProbe.d.ts",
			"bin/classicyPackageCss.test.d.ts",
			"src/Button.stories.d.ts",
		]));

	it("passes the library's own declarations", () =>
		expect(
			findClassicyTestDeclarations([
				"src/index.d.ts",
				"src/SystemFolder/SystemResources/Button/ClassicyButton.d.ts",
				"src/SystemFolder/SystemResources/Button/ClassicyButton.d.ts.map",
				"src/testing/ClassicyTestable.d.ts",
				"src/latest.d.ts",
			]),
		).toEqual([]));
});

describe("findClassicyBuildScriptDeclarations", () => {
	it("finds declarations of the build scripts in bin/ and their maps", () =>
		expect(
			findClassicyBuildScriptDeclarations([
				"bin/classicyPackageCss.d.ts",
				"bin/classicyPackageCss.d.ts.map",
				"bin\\classicyDistTypes.d.ts",
				"src/index.d.ts",
			]),
		).toEqual([
			"bin/classicyPackageCss.d.ts",
			"bin/classicyPackageCss.d.ts.map",
			"bin\\classicyDistTypes.d.ts",
		]));

	it("finds declarations of the root build configs and their maps", () =>
		expect(
			findClassicyBuildScriptDeclarations([
				"vite.config.d.ts",
				"vite.config.d.ts.map",
				"vitest.config.d.ts",
				"vitest.config.d.ts.map",
				"src/index.d.ts",
			]),
		).toEqual([
			"vite.config.d.ts",
			"vite.config.d.ts.map",
			"vitest.config.d.ts",
			"vitest.config.d.ts.map",
		]));

	it("passes the library's own declarations, even one under a bin folder", () =>
		expect(
			findClassicyBuildScriptDeclarations([
				"src/index.d.ts",
				"src/SystemFolder/bin/Trash.d.ts",
				"binary.d.ts",
				"src/Theme/ClassicyTheme.config.d.ts",
				"package.json.d.ts",
			]),
		).toEqual([]));
});

describe("findClassicyJsonDeclarations", () => {
	it("finds declarations of imported JSON files and their maps", () =>
		expect(
			findClassicyJsonDeclarations([
				"package.json.d.ts",
				"package.json.d.ts.map",
				"src/Appearance/Platinum/platinum.json.d.ts",
				"assets\\sounds\\platinum\\platinum.json.d.ts",
				"src/index.d.ts",
			]),
		).toEqual([
			"package.json.d.ts",
			"package.json.d.ts.map",
			"src/Appearance/Platinum/platinum.json.d.ts",
			"assets\\sounds\\platinum\\platinum.json.d.ts",
		]));

	it("passes the library's own declarations, even one named after JSON", () =>
		expect(
			findClassicyJsonDeclarations([
				"src/index.d.ts",
				"src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile.d.ts",
				"src/json.d.ts",
				"src/ClassicyJsonSchema.d.ts",
			]),
		).toEqual([]));
});
