import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * `.classicyRadioInputGroupColumns` (`align="columns"`) overrides the group's
 * `flex-direction: row` at the same specificity, so it must come after the
 * group rule to win. jsdom does no cascade, so this pins the order on the
 * compiled stylesheet.
 */

const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.scss",
	),
	{ style: "expanded" },
).css;

// Prefixed with a newline so the file's first rule is found like any other.
const at = (selector: string): number => {
	const i = `\n${css}`.indexOf(`\n${selector} {`);
	if (i < 0) throw new Error(`no rule for ${selector}`);
	return i;
};

const body = (selector: string): string => {
	const start = at(selector);
	return `\n${css}`.slice(start, `\n${css}`.indexOf("}", start));
};

describe("ClassicyRadioInput.scss cascade", () => {
	it("lays the group out in a row and the columns modifier in a column", () => {
		expect(body(".classicyRadioInputGroup")).toContain("flex-direction: row;");
		expect(body(".classicyRadioInputGroupColumns")).toContain(
			"flex-direction: column;",
		);
	});

	it("puts the columns rule after the group rule, so align='columns' stacks", () =>
		expect(at(".classicyRadioInputGroupColumns")).toBeGreaterThan(
			at(".classicyRadioInputGroup"),
		));
});
