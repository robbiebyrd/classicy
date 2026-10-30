import { readFileSync } from "node:fs";
import { compile } from "sass";
import { describe, expect, it } from "vitest";
import {
	cssRuleLookup,
	PLATINUM_ROOT,
	parseCssRules,
} from "@/__tests__/compiledCss";

/**
 * The Platinum menu and pop-up arrows (Part E 2.2) are registered package
 * art, not images baked into the stylesheet. Both are image layers of that
 * art, like the grow-box grip, and the base sheets keep the images' geometry:
 *
 * - The submenu triangle (`--classicy-art-submenu-arrow`) is the
 *   `::after` box's image (ruling E24): as a mask it drew one 8-bit level off
 *   on the triangle's anti-aliased edge in Firefox.
 * - The pop-up double arrow (`--classicy-art-popup-arrows`) is the
 *   indicator's image (ruling E21): a mask does not reproduce the old raster
 *   at the ComboBox's tile size, and a mask on the indicator itself would cut
 *   its border, corner radii and bevel down to the arrow shape (blocker
 *   E-B2).
 *
 * The look lives in the Platinum package (ruling E4), so this compiles
 * `platinum.scss`, whose rules sit indented inside `@layer classicy.package`
 * and are scoped under the Platinum desktop root.
 */

const PLATINUM = "src/Appearance/Platinum/styles";
const css = compile(`${PLATINUM}/platinum.scss`, { loadPaths: ["src"] }).css;
const menuCss = compile(
	"src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss",
).css;
const popUpCss = compile(
	"src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
).css;

const P = PLATINUM_ROOT;
const rules = parseCssRules(css);

/**
 * The declarations of every package rule whose selector list names
 * `${P} ${selector}`, merged in source order.
 */
const rule = cssRuleLookup(rules, P);

describe("menu and pop-up arrows (Platinum package)", () => {
	// Ruling E24: the `::after` box draws the registered art as its own image,
	// placed by the base sheet's longhands; no mask and no fill color.
	it("the submenu triangle is the indicator box's image, at the right center", () => {
		const t = rule(".classicyMenuItemChildMenuIndicator:after");
		expect(t["background-image"]).toBe("var(--classicy-art-submenu-arrow)");
		expect(t["mask-image"]).toBeUndefined();
		expect(t["mask-position"]).toBeUndefined();
		expect(t["mask-repeat"]).toBeUndefined();
		expect(t["background-color"]).toBeUndefined();
		expect(menuCss).toMatch(
			/\.classicyMenuItemChildMenuIndicator:after \{[^}]*background-repeat: no-repeat;[^}]*background-position: right center;/,
		);
	});

	// Ruling E21: the indicator draws the registered art as its own image,
	// sized and placed by the base sheet's unchanged longhands.
	it("the pop-up arrows are the indicator's image, at 45%, centered", () => {
		const el = rule(".classicyPopUpMenuIndicator");
		expect(el["background-image"]).toBe("var(--classicy-art-popup-arrows)");
		expect(el["mask-image"]).toBeUndefined();
		expect(popUpCss).toMatch(
			/\.classicyPopUpMenuIndicator \{[^}]*background-repeat: no-repeat;[^}]*background-position: center;[^}]*background-size: 45%;/,
		);
	});

	// E-B2 / E21: no arrow layer, so the border, corners and bevel stay whole
	// and nothing re-anchors the indicator.
	it("the indicator draws no arrow layer and stays unpositioned", () => {
		expect(() => rule(".classicyPopUpMenuIndicator::after")).toThrow(/no rule/);
		expect(rule(".classicyPopUpMenuIndicator").position).toBeUndefined();
	});

	it("neither the menu nor the pop-up embeds its arrow art", () => {
		expect(menuCss).not.toMatch(/data:image/);
		expect(popUpCss).not.toMatch(/data:image/);
		const arrowRules = rules.filter((r) =>
			r.selectors.some((s) =>
				/classicyMenuItemChildMenuIndicator|classicyPopUpMenuIndicator/.test(s),
			),
		);
		expect(arrowRules.length).toBeGreaterThan(0);
		for (const r of arrowRules)
			expect(r.body, r.selectors[0]).not.toMatch(/data:image|url\(/);
		for (const partial of ["_Menu", "_PopUpMenu"])
			expect(
				readFileSync(`${PLATINUM}/components/${partial}.scss`, "utf8"),
				partial,
			).not.toMatch(/@use ['"]\.\.\/assets['"]|assets\.\$/);
	});
});
