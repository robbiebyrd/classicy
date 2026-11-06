import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Platinum is the workspace package `@classicy/appearance-platinum` (plan
 * 0015-kxa §3.2). The interim bridge that kept the old in-core specifier
 * resolving is gone: no root file imports it, and no config aliases it.
 * The pattern is assembled so this file does not match itself.
 */
// A regex alias writes the slashes escaped, so both spellings count.
const OLD_SPECIFIER = new RegExp(
	["@", "Appearance", "Platinum"].join("\\\\?/"),
);

const tracked = (...pathspecs: string[]): string[] =>
	execFileSync("git", ["ls-files", "-z", "--", ...pathspecs], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter(Boolean);

const CONFIGS = [
	"vitest.config.ts",
	"vite.config.ts",
	"tsconfig.json",
	"storybook/tsconfig.json",
	"storybook/.storybook/main.ts",
	"example/vite.config.ts",
	"example/tsconfig.app.json",
];

describe("the old in-core Platinum specifier", () => {
	it("is imported by no root source, test, story, bin script or Storybook module", () => {
		const offenders = tracked("src", "bin", "storybook/.storybook", "example")
			.filter((file) => /\.(?:[cm]?[jt]sx?|scss|json)$/.test(file))
			.filter((file) => OLD_SPECIFIER.test(readFileSync(file, "utf8")));
		expect(offenders).toEqual([]);
	});

	it("is aliased by no config", () => {
		const offenders = CONFIGS.filter((file) => {
			try {
				return OLD_SPECIFIER.test(readFileSync(file, "utf8"));
			} catch {
				return false;
			}
		});
		expect(offenders).toEqual([]);
	});

	it("is covered by the scan: a planted match is found", () => {
		expect(OLD_SPECIFIER.test('import "@/Appearance/Platinum/hooks";')).toBe(
			true,
		);
		expect(OLD_SPECIFIER.test("find: /^@\\/Appearance\\/Platinum/")).toBe(true);
		expect(OLD_SPECIFIER.test('import "@classicy/appearance-platinum";')).toBe(
			false,
		);
	});
});
