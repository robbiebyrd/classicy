import { readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The System 7 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the System 7
// desktop root, so its look applies only while it is the active package
// (design 0014-ahm; the core's _package.scss), as Platinum's does
// (platinum.css.test.ts).

const STYLESHEET = path.join(import.meta.dirname, "system7.scss");
const SYSTEM7_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)system7\1\](?=$|[\s.:#[>+~])/;

/**
 * Every style-rule selector in Sass's expanded output (through at-rules, not
 * into `@keyframes` steps), a multi-line selector list included.
 */
const selectorsOf = (css: string) => {
	const selectors: string[] = [];
	const stack: ("at" | "keyframes" | "rule")[] = [];
	let pending = "";
	for (const raw of css.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("/*")) continue;
		if (line === "}") {
			stack.pop();
			continue;
		}
		if (stack.at(-1) !== "rule" && line.endsWith(",")) {
			pending += `${line} `;
			continue;
		}
		if (line.endsWith("{")) {
			const header = `${pending}${line.slice(0, -1)}`.trim();
			pending = "";
			if (header.startsWith("@keyframes")) stack.push("keyframes");
			else if (header.startsWith("@")) stack.push("at");
			else {
				if (stack.at(-1) !== "keyframes")
					selectors.push(...header.split(",").map((s) => s.trim()));
				stack.push("rule");
			}
		}
	}
	return selectors;
};

describe("system7.scss (compiled)", () => {
	const css = compile(STYLESHEET, {
		importers: [new NodePackageImporter()],
	}).css;

	it("is one @layer classicy.package block", () => {
		expect(css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
	});

	it("holds rules, every one scoped under the system7 root", () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((s) => !SYSTEM7_SCOPE.test(s))).toEqual([]);
	});

	// The selector scan itself, so "every one scoped" cannot hold vacuously.
	it("the scan catches an unscoped rule in a multi-line list", () =>
		expect(
			selectorsOf(
				".classicyDesktop[data-classicy-appearance=system7] .a,\n.b {\n  color: red;\n}\n",
			).filter((s) => !SYSTEM7_SCOPE.test(s)),
		).toEqual([".b"]));

	it("hides the collapse box, which System 7 windows lack", () =>
		expect(css).toMatch(
			/\.classicyDesktop\[data-classicy-appearance=system7\] \.classicyWindowTitleBar \[data-classicy-control=collapse\] \{\s*display: none;\s*\}/,
		));

	it("uses no !important (the cascade layers decide)", () =>
		expect(readFileSync(STYLESHEET, "utf8")).not.toContain("!important"));
});
