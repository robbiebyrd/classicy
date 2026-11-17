import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

// Fix round 2 of story 0217-etx (review N-1): each spacing class names its
// inline padding, so an Appearance Package can move part of it from one side
// to the other (System 7's half-pixel label nudge) while the sum, and so a
// label-sized button's width, stays the base sheet's.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	),
	{ style: "expanded" },
).css;

const ruleOf = (selector: string) =>
	css.match(
		new RegExp(`^${selector.replace(/[.]/g, "\\.")} \\{\\n([^}]*)\\n\\}`, "m"),
	)?.[1];

describe("ClassicyButton's spacing classes", () => {
	it.each([
		["Sm", "0.5"],
		["Md", "1"],
		["Lg", "1.5"],
		["Xl", "2"],
	])("classicyButtonPadding%s names its inline padding", (suffix, mult) => {
		const body = ruleOf(`.classicyButtonPadding${suffix}`);
		expect(body).toBeDefined();
		expect(body).toContain(
			`--classicy-button-padding-inline: max(var(--button-text-padding), calc(var(--window-padding-size) * ${mult}));`,
		);
		expect(body).toContain(
			`padding: calc(var(--control-padding) * ${mult}) var(--classicy-button-padding-inline);`,
		);
	});
});
