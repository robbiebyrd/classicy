import { describe, expect, it } from "vitest";
import {
	CLASSICY_DTS_EXCLUDE,
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
