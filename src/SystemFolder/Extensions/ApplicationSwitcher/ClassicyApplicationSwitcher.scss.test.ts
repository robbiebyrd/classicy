import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

const css = sass.compile(
	path.resolve(import.meta.dirname, "ClassicyApplicationSwitcher.scss"),
	{ style: "expanded" },
).css;

/** The declarations of the block `selector` heads. */
const declarations = (selector: string): Record<string, string> => {
	const at = css.indexOf(`\n${selector} {\n`);
	if (at < 0) throw new Error(`rule not found: ${selector}`);
	const body = css.slice(at + selector.length + 4, css.indexOf("}", at));
	return Object.fromEntries(
		body
			.split("\n")
			.map((line) => line.trim().replace(/;$/, ""))
			.filter((line) => line.includes(":"))
			.map((line) => {
				const colon = line.indexOf(":");
				return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
			}),
	);
};

describe("the Application Switcher's stylesheet", () => {
	// Mac OS 8.5 draws the palette's names as small text: "Calculator" is 8
	// rows tall in `platinum-85-switcher-palette.png`, as Geneva is at the
	// small UI size (review M1 of story 0231-8c6).
	it("draws the palette's names at the small UI size, in the small UI family, else the body font", () => {
		const name = declarations(".classicyApplicationSwitcherName");
		expect(name["font-size"]).toBe("var(--ui-font-size-small)");
		expect(name["font-family"]).toBe(
			"var(--ui-font-small, var(--body-font)), sans-serif",
		);
	});
});
