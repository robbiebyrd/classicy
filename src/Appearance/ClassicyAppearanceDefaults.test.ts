import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
	path.resolve(process.cwd(), "src/Appearance/ClassicyAppearanceDefaults.ts"),
	"utf8",
);

describe("ClassicyAppearanceDefaults", () => {
	// DefaultAppManagerState reads the default package id at module
	// evaluation; a runtime import here could close a cycle back to the app
	// manager and put the constant in its temporal dead zone.
	it("has no runtime imports, only type imports", () => {
		const imports = source.match(/^\s*(?:import|export)\b[^;]*\bfrom\s/gm);
		expect(
			(imports ?? []).filter((line) => !/^\s*import type\b/.test(line)),
		).toEqual([]);
		expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
		expect(source).not.toMatch(/^\s*import\s+["']/m);
	});
});
