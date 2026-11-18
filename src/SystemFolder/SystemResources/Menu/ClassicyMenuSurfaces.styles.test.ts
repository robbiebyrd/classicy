import { describe, expect, it } from "vitest";
import {
	compileScss,
	cssRuleLookup,
	parseCssRules,
} from "@/__tests__/compiledCss";

// A fixed menu surface is as wide as its items, wherever it is placed: a
// fixed box is otherwise shrunk to the room left of its `left` edge, so a
// menu measured or placed near the right edge wrapped its items, and the
// width it was placed by was not the width it drew at (a bevel button's
// Screen Saver menu: 247 px at the left, 184 px at the right edge, its
// shadow then a pixel past the desktop). Structure, so it holds in every
// package.
const rule = (file: string) =>
	cssRuleLookup(
		parseCssRules(compileScss(`src/SystemFolder/SystemResources/${file}`)),
	);

describe("fixed menu surfaces", () => {
	it("draw a contextual menu at its items' width", () =>
		expect(
			rule("ContextualMenu/ClassicyContextualMenu.scss")(
				".classicyContextMenuWrapper",
			).width,
		).toBe("max-content"));

	it("draw a bevel button's menu at its items' width, not its panels", () => {
		const bevel = rule("BevelButton/ClassicyBevelButton.scss");
		expect(
			bevel(".classicyBevelButtonPopup:not(.classicyBevelButtonPopupPanel)")
				.width,
		).toBe("max-content");
	});

	it("draw a pop-up menu's list at its items' width (its button's at least)", () =>
		expect(
			rule("PopUpMenu/ClassicyPopUpMenu.scss")(".classicyPopUpMenuList").width,
		).toBe("max-content"));
});
