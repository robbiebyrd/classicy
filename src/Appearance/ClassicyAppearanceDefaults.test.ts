import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";

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

	// The Windows shell's layout keys (plan 0020-w98 §1) are optional, and the
	// default layout declares none of them: absent, the core does what it did.
	it("keeps the default layout as it was: three groups, no behavior key", () => {
		expect(CLASSICY_DEFAULT_APPEARANCE_LAYOUT).toStrictEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		});
		expect(Object.keys(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toEqual([
			"window",
			"menuBar",
			"desktop",
		]);
		expect(Object.keys(CLASSICY_DEFAULT_APPEARANCE_LAYOUT.window)).toEqual([
			"growBoxCorner",
		]);
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(true);
		expect(Object.isFrozen(CLASSICY_DEFAULT_APPEARANCE_LAYOUT.window)).toBe(
			true,
		);
	});
});
