import { act, cleanup, render } from "@testing-library/react";
import { produce } from "immer";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
	compileScss,
	cssRuleLookup,
	parseCssRules,
} from "@/__tests__/compiledCss";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

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

	// Integration review G round 3, F1: an absolute list with no width of its
	// own shrank to the room its title's wrapper left it, and wrapped its
	// items ("Date and Time Manager" in the Application menu, every long item
	// of the Apple menu on a 640-pixel desktop).
	it("draw a pull-down and every submenu at their items' width", () => {
		const menu = rule("Menu/ClassicyMenu.scss");
		expect(menu(".classicySubMenu").width).toBe("max-content");
		expect(menu(".classicyContextSubMenu").width).toBe("max-content");
	});

	it("hang the Application menu from its title's right side, at its items' width", () => {
		const bar = rule("Desktop/MenuBar/ClassicyDesktopMenuBar.scss")(
			".classicyDesktopMenuAppSwitcher * ul",
		);
		expect(bar.left).toBe("auto");
		// Its frame's right column under the title's last, as Mac OS 8.1 and
		// 8.5 draw it: out of the title's content box by its end padding.
		expect(bar.right).toBe("calc(var(--menu-item-padding-inline) * -1)");
		expect(bar.width).toBeUndefined();
	});

	it("draw a pop-up menu's list at its items' width (its button's at least)", () =>
		expect(
			rule("PopUpMenu/ClassicyPopUpMenu.scss")(".classicyPopUpMenuList").width,
		).toBe("max-content"));
});

// Found with integration review G round 3's F1: the Apple menu and its
// submenus took a fifth of the viewport at the least (`min-width: 20vw` in
// the menu bar's sheet), wider than their items on a wide screen. The menu
// bar's sheet sizes them by no viewport unit and gives them no width of its
// own, so the shared `.classicySubMenu` rule (`width: max-content`, above)
// sizes them. A pin on `vw` alone let `20dvw` or `12vmax` back in (round 4,
// F3).
describe("the Apple menu's width", () => {
	const MENU_BAR =
		"src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss";
	const menuBarCss = compileScss(MENU_BAR);

	/**
	 * Every length in a viewport unit (CSS Values 4 §6.1: `vw`, `vh`, `vi`,
	 * `vb`, `vmin`, `vmax`, and their small, large and dynamic forms such as
	 * `svw`, `lvh` and `dvmax`), in any case, as `.5vw` or `20VW` too.
	 */
	const viewportLengths = (css: string) =>
		css.match(/\d(?:[sld]?v(?:w|h|i|b|min|max))\b/gi) ?? [];

	/** The properties that give a box its width. */
	const WIDTHS = new Set([
		"width",
		"min-width",
		"max-width",
		"inline-size",
		"min-inline-size",
		"max-inline-size",
	]);

	/**
	 * The menu bar as it draws, inside the root `ClassicyDesktop` gives it
	 * (its id and class, `data-classicy-appearance`, `data-classicy-menu-bar`
	 * and `data-classicy-grow-box`, as ClassicyDesktop.tsx renders them), so a
	 * rule scoped by the desktop root reaches the lists as in a page; its
	 * Apple menu holding a submenu with a submenu of its own: the Apple
	 * menu's lists are its pull-down and those two.
	 */
	const appleMenuLists = () => {
		act(() => {
			useAppManager.setState(
				produce(DefaultAppManagerState, (draft) => {
					draft.System.Manager.Desktop.systemMenu.push({
						id: "control-panels",
						title: "Control Panels",
						menuChildren: [
							{
								id: "control-panel",
								title: "Appearance",
								menuChildren: [{ id: "themes", title: "Themes" }],
							},
						],
					});
				}),
				true,
			);
		});
		const { container } = render(
			createElement(
				"div",
				{
					id: "classicyDesktop",
					className: "classicyDesktop",
					"data-classicy-appearance": "platinum",
					"data-classicy-menu-bar": "screen",
					"data-classicy-grow-box": "bottom-right",
				},
				createElement(ClassicyDesktopMenuBar),
			),
		);
		const apple = container.querySelector(".classicyDesktopMenuApple");
		return {
			apple,
			lists: Array.from(apple?.querySelectorAll("ul") ?? []),
		};
	};

	/** A user-action pseudo-class (`:hover`, `:focus`…). */
	const USER_ACTION = /:(?:hover|active|focus-visible|focus-within|focus)\b/g;

	/**
	 * `selector` with each user-action pseudo-class taken as held or not, in
	 * every combination: held, it matches every element; not held, none. So
	 * `ul:hover` is found as held and `ul:not(:hover)` as not held, which a
	 * rewrite taking them all as held turned into `:not(:not(…))`, matching
	 * nothing.
	 */
	const userActionStates = (selector: string): string[] => {
		const count = selector.match(USER_ACTION)?.length ?? 0;
		const states: string[] = [];
		for (let held = 0; held < 2 ** count; held++) {
			let at = 0;
			states.push(
				selector.replace(USER_ACTION, () => {
					const isHeld = (held >> at) & 1;
					at += 1;
					return isHeld ? ":not([data-never-set])" : "[data-never-set]";
				}),
			);
		}
		return states;
	};

	/**
	 * Every width the rules of `css` give one of the Apple menu's lists, with
	 * the menu closed and open: a rule of a selector that matches a list with
	 * its user-action pseudo-classes (`:hover`, `:focus`…) held or not, in
	 * any combination. Selectors of a pseudo-element are left out (they size
	 * a generated box, not the list).
	 */
	const appleListWidths = (css: string) => {
		const { apple, lists } = appleMenuLists();
		const states = [
			() => {},
			() => {
				for (const item of [apple, ...(apple?.querySelectorAll("li") ?? [])])
					item?.classList.add("open");
			},
		];
		const found = new Set<string>();
		for (const enter of states) {
			enter();
			for (const { selectors, body } of parseCssRules(css)) {
				const widths = body
					.split(";\n")
					.map((line) => line.trim().replace(/;$/, ""))
					.filter((line) => WIDTHS.has(line.split(":")[0].trim()));
				if (widths.length === 0) continue;
				for (const selector of selectors) {
					if (/::|:(?:before|after|first-line|first-letter)\b/.test(selector))
						continue;
					const states = userActionStates(selector);
					lists.forEach((list, at) => {
						if (states.some((state) => list.matches(state)))
							for (const width of widths)
								found.add(`list ${at}: ${selector} { ${width} }`);
					});
				}
			}
		}
		return { lists, found: [...found] };
	};

	afterEach(cleanup);

	it("is set by no viewport unit in the menu bar's sheet", () =>
		expect(viewportLengths(menuBarCss)).toEqual([]));

	it("is given by no rule of the menu bar's sheet, to the menu or any submenu", () => {
		const { lists, found } = appleListWidths(menuBarCss);
		expect(lists).toHaveLength(3);
		expect(found).toEqual([]);
	});

	it("is the shared submenu rule's, the items' width", () => {
		const { found } = appleListWidths(
			compileScss("src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss"),
		);
		for (const at of [0, 1, 2])
			expect(found).toContain(
				`list ${at}: .classicySubMenu { width: max-content }`,
			);
	});

	// The removed rule, in each viewport unit and in other lengths, and
	// under other selectors that reach the Apple menu's lists: each one put
	// back in the menu bar's sheet is found.
	it.each([
		[".classicyDesktopMenuApple div ul", "min-width: 20vw"],
		[".classicyDesktopMenuApple div ul", "min-width: 20dvw"],
		[".classicyDesktopMenuApple div ul", "min-width: 20svw"],
		[".classicyDesktopMenuApple div ul", "min-width: 20lvw"],
		[".classicyDesktopMenuApple div ul", "min-width: 12vmax"],
		[".classicyDesktopMenuApple div ul", "min-width: 12vmin"],
		[".classicyDesktopMenuApple div ul", "min-width: 20vi"],
		[".classicyDesktopMenuApple div ul", "min-width: 20dvh"],
		[".classicyDesktopMenuApple div ul", "min-width: .5VW"],
		[".classicyDesktopMenuApple ul", "width: calc(10vw + 4em)"],
	])("finds %s { %s } by its viewport unit and its width", (selector, width) => {
		const css = `${menuBarCss}\n${selector} {\n  ${width};\n}\n`;
		expect(viewportLengths(css)).not.toEqual([]);
		expect(appleListWidths(css).found).not.toEqual([]);
	});

	it.each([
		[".classicyDesktopMenuApple ul", "min-width: 16em"],
		[".classicyDesktopMenuApple.open .classicySubMenu", "max-width: 50%"],
		[".classicyDesktopMenuApple:hover ul", "inline-size: 12rem"],
		[".classicyDesktopMenu .classicySubMenu", "min-inline-size: 10em"],
		// Scoped by the desktop root, as base sheets scope rules
		// (ClassicyDesktop.scss, ClassicyDesktopIcon.scss), and not held
		// (integration review G round 5, finding 2).
		[".classicyDesktop .classicyDesktopMenuApple div ul", "min-width: 16em"],
		[
			"[data-classicy-menu-bar=screen] .classicyDesktopMenuApple ul",
			"min-width: 16em",
		],
		["#classicyDesktop .classicyDesktopMenuApple ul", "min-width: 16em"],
		[
			'.classicyDesktop[data-classicy-appearance="platinum"] .classicyDesktopMenuApple ul',
			"min-width: 16em",
		],
		[".classicyDesktopMenuApple ul:not(:hover)", "min-width: 16em"],
		[".classicyDesktopMenuApple:hover ul:not(:focus)", "min-width: 16em"],
	])("finds %s { %s } by its width", (selector, width) =>
		expect(
			appleListWidths(`${menuBarCss}\n${selector} {\n  ${width};\n}\n`).found,
		).not.toEqual([]));
});
