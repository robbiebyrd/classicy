import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

// Invariant 7 end to end: the real bin/check-dist-imports.mjs, run in
// named-file mode on synthetic bundles. They live outside dist/, so the
// invariants that read dist/ itself (the injected stylesheet, fonts, assets)
// skip them and only the import scan and invariant 7 apply.

const SCRIPT = resolve("bin/check-dist-imports.mjs");
const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="platinum"] .classicyWindow{border:1px solid}}';
const root = mkdtempSync(join(tmpdir(), "classicy-check-dist-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

let run = 0;
/** Writes the bundles (literal = the package string's JS literal, or none) and runs the script on them. */
const check = (bundles: Record<string, string | null>) => {
	const dir = join(root, `case-${run++}`);
	mkdirSync(join(dir, "fx"), { recursive: true });
	const names = Object.entries(bundles).map(([name, literal]) => {
		const file = join("fx", name);
		writeFileSync(
			join(dir, file),
			literal === null
				? "const a=1;export{a};"
				: `const css=${literal};export{css};`,
		);
		return file;
	});
	const result = spawnSync(process.execPath, [SCRIPT, ...names], {
		cwd: dir,
		encoding: "utf8",
	});
	return { status: result.status, stderr: result.stderr };
};
const literal = (css: string) => `\`${css}\``;
const both = (css: string | null) => ({
	"classicy.es.js": css === null ? null : literal(css),
	"classicy.umd.js": css === null ? null : literal(css),
});
const MISSING = /carries no non-empty @layer classicy\.package stylesheet/;

describe("check-dist-imports.mjs invariant 7 (named files)", () => {
	it("passes entry bundles that each carry the package stylesheet", () => {
		expect(check(both(PACKAGE))).toEqual({ status: 0, stderr: "" });
		expect(check(both(`${CLASSICY_LAYER_ORDER}\n${PACKAGE}`)).status).toBe(0);
	});

	it("does not require a package stylesheet in a non-entry bundle", () =>
		expect(check({ ...both(PACKAGE), "pdf-DcHjwfzs.js": null }).status).toBe(
			0,
		));

	it.each([
		["missing package string", null, [MISSING]],
		["the bare layer statement", "@layer classicy.package;", [MISSING]],
		["an empty block", "@layer classicy.package{}", [MISSING]],
		[
			"a block without the data-classicy-appearance scope",
			"@layer classicy.package{.classicyWindow{border:1px solid}}",
			[MISSING],
		],
		[
			"a block nested in classicy.base",
			`@layer classicy.base{${PACKAGE}}`,
			[/nested inside classicy\.base/, MISSING],
		],
		[
			"a stray rule after the block",
			`${PACKAGE}.leak{color:red}`,
			[/not exactly one @layer classicy\.package block/, MISSING],
		],
	])("fails on %s, in each entry bundle", (_name, css, messages) => {
		const { status, stderr } = check(both(css));
		expect(status).toBe(1);
		for (const bundle of ["classicy.es.js", "classicy.umd.js"]) {
			const lines = stderr
				.split("\n")
				.filter((line) => line.startsWith(join("fx", bundle)));
			expect(lines, bundle).toHaveLength(messages.length);
			for (const [i, message] of messages.entries())
				expect(lines[i]).toMatch(message);
		}
	});

	it("fails when only one entry bundle lost its stylesheet", () => {
		const { status, stderr } = check({
			"classicy.es.js": literal(PACKAGE),
			"classicy.umd.js": literal("@layer classicy.package{}"),
		});
		expect(status).toBe(1);
		expect(stderr.trim().split("\n")).toEqual([
			expect.stringMatching(
				new RegExp(
					`^${join("fx", "classicy\\.umd\\.js")}: .*${MISSING.source}`,
				),
			),
		]);
	});
});
