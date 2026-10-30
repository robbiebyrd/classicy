import { existsSync, readFileSync } from "node:fs";
import { compile } from "sass";
import { describe, expect, it } from "vitest";
import {
	cssRuleLookup,
	PLATINUM_ROOT,
	parseCssRules,
} from "@/__tests__/compiledCss";

/**
 * The Platinum title-bar art (Part E 2.1, rebuilt in E 6.1 under owner ruling
 * E20): the pinstripes, the red stripes and the utility windoid's texture are
 * registered package art (`--classicy-art-window-stripes[-red]`,
 * `--classicy-art-window-utility-texture`), not images baked into the
 * stylesheet. Each band draws its art as its own background image, with the
 * `background` shorthand and sizes the bands had before Part E: masks, in any
 * number of layers, blend the anti-aliased row boundaries of a band drawn at a
 * fractional scale or position differently from the one image (up to 21
 * levels in Chromium, 25 in Firefox), and E20 accepts no drift.
 *
 * The look lives in the Platinum package (ruling E4), so this compiles
 * `platinum.scss`, whose rules sit indented inside `@layer classicy.package`
 * and are scoped under the Platinum desktop root.
 */

const PLATINUM = "src/Appearance/Platinum/styles";
const css = compile(`${PLATINUM}/platinum.scss`, { loadPaths: ["src"] }).css;

const P = PLATINUM_ROOT;
const rules = parseCssRules(css);

/** The merged declarations for `${P} ${selector}` in the package. */
const rule = cssRuleLookup(rules, P);

/**
 * The merged declarations for `selector` in the base (structure-only) window
 * sheet, for the geometry the art keeps.
 */
const baseRule = cssRuleLookup(
	parseCssRules(
		compile("src/SystemFolder/SystemResources/Window/ClassicyWindow.scss").css,
	),
);

const ACTIVE =
	":where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle";
const RED = ".classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle";
const ALERT =
	".classicyWindow:has(.classicyAlertMovable) .classicyWindowTitleBar .classicyWindowTitle";
const FRAME =
	".classicyWindowFrame .classicyWindowTitleBar .classicyWindowTitle";
const UTILITY =
	".classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitle";

/** Every stripe band of a title area. */
const BANDS = [
	".classicyWindowTitleCenter",
	".classicyWindowTitleLeft",
	".classicyWindowTitleRight",
];

describe("ClassicyWindow title-bar art (Platinum package)", () => {
	it("draws the active stripes as each band's image", () => {
		const center = rule(`${ACTIVE} .classicyWindowTitleCenter`);
		expect(center.background).toBe("var(--classicy-art-window-stripes)");
		// The shorthand's own size (auto), as before Part E.
		expect(center["background-size"]).toBeUndefined();
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		]) {
			const side = rule(`${ACTIVE} ${band}`);
			expect(side.background, band).toBe("var(--classicy-art-window-stripes)");
			expect(side["background-size"], band).toBe("auto 99.8%");
		}
	});

	it("red windows and movable alerts draw the red stripes", () => {
		for (const chain of [RED, ALERT]) {
			const center = rule(`${chain} .classicyWindowTitleCenter`);
			expect(center.background, chain).toBe(
				"var(--classicy-art-window-stripes-red)",
			);
			expect(center["background-size"], chain).toBe("auto 100%");
			// The shorthand resets the active side bands' 99.8% to auto.
			for (const band of [
				".classicyWindowTitleLeft",
				".classicyWindowTitleRight",
			]) {
				const side = rule(`${chain} ${band}`);
				expect(side.background, `${chain} ${band}`).toBe(
					"var(--classicy-art-window-stripes-red)",
				);
				expect(side["background-size"], `${chain} ${band}`).toBeUndefined();
			}
		}
	});

	it("the window frame's title bar draws the focused window's stripes", () => {
		expect(rule(`${FRAME} .classicyWindowTitleCenter`).background).toBe(
			"var(--classicy-art-window-stripes)",
		);
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		])
			expect(rule(`${FRAME} ${band}`)["background-size"], band).toBe(
				"auto 99.8%",
			);
	});

	it("the utility texture is the center band's image, tiled 4px 3px", () => {
		const center = rule(`${UTILITY} .classicyWindowTitleCenter`);
		expect(center["background-image"]).toBe(
			"var(--classicy-art-window-utility-texture)",
		);
		expect(center["background-repeat"]).toBe("repeat");
		expect(center["background-size"]).toBe("4px 3px");
		// T3: the windoid's side bands draw nothing, over the active stripes.
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		])
			expect(rule(`${UTILITY} ${band}`).background, band).toBe("none");
	});

	// No band draws a layer of its own: no mask, no position, no stripe
	// color. The bands beside a title keep the base sheet's zero-height end
	// boxes (relatively positioned, as before Part E), and the package gives
	// them an empty image layer: it paints nothing, but without it Chromium
	// blends the control boxes' luminosity dither one level differently.
	it("the bands carry no stripe layers, masks or stripe colors", () => {
		for (const chain of [ACTIVE, RED, ALERT, FRAME, UTILITY])
			for (const band of BANDS) {
				let el: Record<string, string> = {};
				try {
					el = rule(`${chain} ${band}`);
				} catch {
					continue;
				}
				for (const prop of Object.keys(el))
					expect(prop, `${chain} ${band}`).not.toMatch(/^mask/);
				expect(el.position, `${chain} ${band}`).toBeUndefined();
				for (const pseudo of [":before", ":after", "::before", "::after"]) {
					if (band === ".classicyWindowTitleCenter" || chain === UTILITY) {
						expect(
							() => rule(`${chain} ${band}${pseudo}`),
							`${chain} ${band}${pseudo}`,
						).toThrow(/no rule/);
						continue;
					}
					if (pseudo.startsWith("::")) continue;
					expect(rule(`${chain} ${band}${pseudo}`), band + pseudo).toEqual({
						"background-image": "linear-gradient(transparent, transparent)",
					});
				}
			}
		expect(css).not.toMatch(/--platinum-stripe-/);
	});

	it("the base sheet keeps the zero-height end boxes of the bands beside a title", () => {
		const base =
			":where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle";
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		]) {
			const after = baseRule(`${base} ${band}:after`);
			expect(after.position, band).toBe("relative");
			expect(after.float, band).toBe("right");
			expect(after.content, band).toBe('" "');
			const before = baseRule(`${base} ${band}:before`);
			expect(before.position, band).toBe("relative");
			expect(before.display, band).toBe("block");
			expect(before.content, band).toBe('" "');
		}
	});

	it("no stylesheet embeds stripe art any more", () => {
		const titleBarRules = rules.filter((r) =>
			r.selectors.some((s) => /classicyWindowTitle(Center|Left|Right)/.test(s)),
		);
		expect(titleBarRules.length).toBeGreaterThan(0);
		for (const r of titleBarRules)
			expect(r.body, r.selectors[0]).not.toMatch(/data:image\/svg\+xml|url\(/);
		expect(readFileSync(`${PLATINUM}/_assets.scss`, "utf8")).not.toMatch(
			/\$title-bar-/,
		);
		for (const partial of ["_Window", "_Alert", "_WindowFrame"])
			expect(
				readFileSync(`${PLATINUM}/components/${partial}.scss`, "utf8"),
				partial,
			).not.toMatch(/\$title-bar-/);
	});

	// Ruling E13: the side-band caps measured 0px tall (Phase 0 gate), so they
	// never painted; their rules and art are gone.
	it("draws no title-bar caps", () => {
		for (const cap of ["left", "right", "left-red", "right-red"])
			expect(
				existsSync(`src/Appearance/Platinum/assets/art/title-bar-${cap}.svg`),
				cap,
			).toBe(false);
	});
});

const BOX = ".classicyWindow .classicyWindowTitleBar";
const ZOOM = `${BOX} .classicyWindowZoomBox`;
const COLLAPSE = `${BOX} .classicyWindowCollapseBox`;
const CLOSE = `${BOX} .classicyWindowCloseBox`;
const RESIZER = ".classicyWindow .classicyWindowResizer";

/**
 * Part E 2.2, E 6.1: the control-box glyphs, the grow-box grip and the
 * control-box dither are images of the registered package art. The glyphs
 * were masks over `--color-black` until E 6.1 (rulings E20, E24): with a
 * masked glyph in the title bar, Chromium blended the boxes' luminosity
 * dither one level off. The glyph art's `currentColor` draws black.
 */
describe("ClassicyWindow control-box and grow-box art (Platinum package)", () => {
	it("zoom and collapse glyphs are their boxes' images", () => {
		const z = rule(`${ZOOM}:after`);
		expect(z["background-image"]).toBe("var(--classicy-art-zoom-glyph)");
		expect(z["background-position"]).toBe("top left");
		expect(baseRule(`${ZOOM}:after`).opacity).toBe("0.65");
		expect(rule(`${COLLAPSE}:after`)["background-image"]).toBe(
			"var(--classicy-art-collapse-glyph)",
		);
	});

	// T6: the depressable box's centered, contained, unrepeated glyph geometry;
	// the component rule moves it top left. No mask and no fill color.
	it("the glyph images keep the old repeat, size and position", () => {
		for (const box of [ZOOM, COLLAPSE]) {
			const after = rule(`${box}:after`);
			expect(after["background-repeat"], box).toBe("no-repeat");
			expect(after["background-size"], box).toBe("contain");
			expect(after["background-position"], box).toBe("top left");
			for (const prop of Object.keys(after))
				expect(prop, box).not.toMatch(/^mask/);
			expect(after["background-color"], box).toBeUndefined();
		}
		expect(baseRule(`${COLLAPSE}:after`).opacity).toBe("0.65");
	});

	// The close box shares the depressable :after but draws no glyph.
	it("the close box's glyph layer stays empty", () => {
		const after = rule(`${CLOSE}:after`);
		expect(after["background-color"]).toBeUndefined();
		expect(after["background-image"]).toBeUndefined();
		expect(after["mask-image"]).toBeUndefined();
	});

	it("grip and dither are package images with unchanged geometry", () => {
		const g = rule(RESIZER);
		expect(g["background-image"]).toBe("var(--classicy-art-window-grip)");
		expect(baseRule(RESIZER)["background-size"]).toBe(
			"calc(var(--window-control-size) - var(--window-border-size) * 2)",
		);
		expect(baseRule(RESIZER)["background-repeat"]).toBe("no-repeat");
		expect(baseRule(RESIZER)["background-position"]).toBe("center");
		for (const box of [ZOOM, COLLAPSE, CLOSE]) {
			const d = rule(`${box}:before`);
			expect(d["background-image"], box).toBe(
				"var(--classicy-art-window-dither)",
			);
			expect(d["background-repeat"], box).toBe("no-repeat");
			expect(d["background-size"], box).toBe("cover");
			expect(d["mix-blend-mode"], box).toBe("luminosity");
			expect(d.opacity, box).toBe("0.25");
		}
	});

	// P5: an inactive window's grow box drops the grip over the image.
	it("the dimmed grow box still drops the grip", () => {
		expect(
			rule(".classicyWindow .classicyWindowResizerDimmed")["background-image"],
		).toBe("none");
	});

	it("no glyph, grip or dither art is embedded in the stylesheet", () => {
		const artRules = rules.filter((r) =>
			r.selectors.some((s) =>
				/classicyWindow(ZoomBox|CollapseBox|CloseBox|Resizer)/.test(s),
			),
		);
		expect(artRules.length).toBeGreaterThan(0);
		for (const r of artRules)
			expect(r.body, r.selectors[0]).not.toMatch(/data:image|url\(/);
		for (const file of ["components/_Window.scss", "_mixins.scss"])
			expect(readFileSync(`${PLATINUM}/${file}`, "utf8"), file).not.toMatch(
				/@use ['"](\.\.\/)?assets['"]|assets\.\$/,
			);
	});
});
