import { compile } from "sass";
import { describe, expect, it } from "vitest";
import { parseCssRules } from "@/__tests__/compiledCss";

/**
 * The Platinum slider thumb (Part E 3.1) draws its outline, its rounded-knob
 * outline and its grip strikes from registered package art
 * (`--classicy-art-slider-thumb`, `-thumb-rect`, `-strikes`), not from SVGs
 * baked into the stylesheet or the external `slider-strikes.svg`. They stay
 * image layers of the thumb's `background`, not masks: a native range thumb
 * has no pseudo-elements, so a mask on it would clip the body gradient too.
 * Every layer keeps its position, size and repeat.
 *
 * The look lives in the Platinum package (ruling E4), so this compiles
 * `platinum.scss`. Sass prints `a / b` in a background layer as `a/b`.
 */

const css = compile("src/Appearance/Platinum/styles/platinum.scss", {
	loadPaths: ["src"],
}).css;
const base = compile(
	"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
).css;

/**
 * The declaration blocks of every slider rule of the package. The rest of the
 * package is out of scope here: the icon halftone still compiles to a data
 * URI until Part G's halftone lands (ruling G16).
 */
const sliderCss = parseCssRules(css)
	.filter((r) => r.selectors.some((s) => s.includes(".classicySlider")))
	.map((r) => r.body)
	.join("\n");

describe("slider thumb art (Platinum package)", () => {
	it("thumb layers come from the package art variables", () => {
		expect(sliderCss).toMatch(
			/var\(--classicy-art-slider-thumb\) 0 0 ?\/ ?100% 100% no-repeat/,
		);
		expect(sliderCss).toMatch(
			/var\(--classicy-art-slider-strikes\) center 30% ?\/ ?45% 35% no-repeat/,
		);
		expect(sliderCss).toMatch(
			/var\(--classicy-art-slider-thumb-rect\) 0 0 ?\/ ?100% 100% no-repeat/,
		);
		expect(sliderCss).not.toMatch(/data:image|slider-strikes\.svg/);
	});

	it("the nondirectional knob keeps its strikes centered at 50%", () => {
		expect(sliderCss).toMatch(
			/var\(--classicy-art-slider-strikes\) center 50% ?\/ ?45% 35% no-repeat/,
		);
	});

	it("the base sheet embeds no thumb art", () => {
		expect(base).not.toMatch(/data:image|slider-strikes\.svg|classicy-art/);
	});
});
