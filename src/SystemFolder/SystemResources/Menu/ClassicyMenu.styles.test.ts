import { describe, expect, it } from "vitest";
import {
	compileScss,
	cssRuleLookup,
	parseCssRules,
} from "@/__tests__/compiledCss";

// A menu list too long for the screen is capped and scrolls (ClassicyMenu).
// The capped list is a column flex box, so its rows would shrink toward
// their line boxes to fit the cap: System 7's 16 px rows drew 14 px apart,
// their text cramped. Structure, so it holds in every package.
const rule = cssRuleLookup(
	parseCssRules(
		compileScss("src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss"),
	),
);

describe("ClassicyMenu's scrolling rows", () => {
	it("keep their height instead of shrinking to the cap", () => {
		expect(rule(".classicyMenuListScrolls > *")["flex-shrink"]).toBe("0");
	});

	it("are as tall as their content, not the capped list", () => {
		// `.classicyMenuItem { height: 100% }` would make an unshrinkable row
		// the capped list's height.
		expect(rule(".classicyMenuItem").height).toBe("100%");
		expect(rule(".classicyMenuListScrolls > .classicyMenuItem").height).toBe(
			"auto",
		);
	});
});

// While the keyboard moved a menu tree's tracking last (ClassicyMenu's
// `focused` state on its root list), the item under a resting pointer drops
// the base sheet's hover highlight, so the keyboard's item (the package's
// `:focus-visible` look) is the one tracked. Keyed on the new state alone, so
// a menu used with the pointer is drawn as before.
describe("ClassicyMenu's keyboard tracking", () => {
	it("drops the hover highlight under a resting pointer while the keyboard tracks", () => {
		expect(
			rule(
				":where(.classicyMenuWrapper > .focused) .classicyMenuItem:hover:not(:focus-visible):not(.open)",
			),
		).toEqual({ color: "inherit", "background-color": "transparent" });
	});
});
