import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Platinum is the workspace package `@classicy/appearance-platinum` (plan
 * 0015-kxa §3.2). The interim bridge that kept the old in-core specifier
 * resolving is gone: no root file or package imports it, and no config aliases
 * it. Every spelling is assembled from parts, and this file is skipped, so it
 * does not match itself.
 */
const OLD_DIR = ["Appearance", "Platinum"].join("/");
// A regex alias writes the slashes escaped, so both spellings count; a
// relative path out of a test (`../Appearance/Platinum`) is the same import.
const OLD_SPECIFIER = new RegExp(
	`(?:@|\\.\\.)\\\\?/${OLD_DIR.replace("/", "\\\\?/")}`,
);
const SELF = "src/Appearance/ClassicyPlatinumSpecifier.repo.test.ts";

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
		const offenders = tracked(
			"src",
			"bin",
			"storybook/.storybook",
			"example",
			"packages",
		)
			.filter((file) => file !== SELF)
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

	it("is covered by the scan: planted spellings are found", () => {
		const alias = ["@", OLD_DIR].join("/");
		const escaped = ["@", OLD_DIR].join("/").replaceAll("/", "\\/");
		const relative = ["..", OLD_DIR, "hooks"].join("/");
		for (const planted of [
			`import "${alias}/hooks";`,
			`vi.mock("${alias}/assets/platinumAssets")`,
			`find: /^${escaped}/`,
			`import("${relative}")`,
		])
			expect(OLD_SPECIFIER.test(planted), planted).toBe(true);
		expect(OLD_SPECIFIER.test('import "@classicy/appearance-platinum";')).toBe(
			false,
		);
		expect(OLD_SPECIFIER.test("import './Platinum/hooks'")).toBe(false);
	});
});
