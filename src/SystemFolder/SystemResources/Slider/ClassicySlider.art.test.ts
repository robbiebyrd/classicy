import { compile } from "sass";
import { describe, expect, it } from "vitest";
import {
	PLATINUM_STYLES_DIR,
	parseCssRules,
	platinumSassOptions,
} from "@/__tests__/compiledCss";

/**
 * The Platinum slider (story 0194-5bs, HIGOS8 Figure 2-17) is pixel art drawn
 * in theme tokens: every layer of the channel, the indicator, the knob, the
 * ghost and the ticks is a one-pixel-grid `linear-gradient` of one token, so
 * a theme's colors reach it. It reads no registered image (the pre-3.2
 * pentagon art, `--classicy-art-slider-thumb`, `-thumb-rect` and `-strikes`,
 * stays registered for hosts and for the deprecated `platinum-slider-thumb`
 * mixin) and no SVG baked into the stylesheet. The art test of each part is
 * in platinum.css.test.ts, "the slider, drawn from HIGOS8 Figure 2-17".
 *
 * The look lives in the Platinum package (ruling E4), so this compiles
 * `platinum.scss`.
 */

const css = compile(`${PLATINUM_STYLES_DIR}/platinum.scss`, {
	...platinumSassOptions(),
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

describe("slider art (Platinum package)", () => {
	it("draws in theme tokens, from no registered or embedded image", () => {
		expect(sliderCss).toMatch(
			/linear-gradient\(var\(--color-theme-03\), var\(--color-theme-03\)\)/,
		);
		expect(sliderCss).not.toMatch(
			/--classicy-art-slider|data:image|slider-strikes\.svg|#[0-9a-f]{3,6}\b/i,
		);
	});

	it("the base sheet embeds no thumb art", () => {
		expect(base).not.toMatch(/data:image|slider-strikes\.svg|classicy-art/);
	});

	// Fix round 4: Firefox's UA sheet gives ::-moz-range-thumb a border and a
	// 0.5em corner radius, which clipped the 15 x 17 pixel-art indicator
	// round at every corner (and System 7's capsule). The base sheet resets
	// both, and no package rule sets a radius back on the thumb.
	it("resets Firefox's thumb border and corner radius, which no package restores", () => {
		const mozThumb = parseCssRules(base).filter((r) =>
			r.selectors.some((s) => s === ".classicySlider::-moz-range-thumb"),
		);
		expect(mozThumb).toHaveLength(1);
		expect(mozThumb[0].body).toMatch(/border:\s*none/);
		expect(mozThumb[0].body).toMatch(/border-radius:\s*0\s*(;|$)/m);
		const packageThumbs = parseCssRules(css)
			.filter((r) => r.selectors.some((s) => s.includes("::-moz-range-thumb")))
			.map((r) => r.body)
			.join("\n");
		expect(packageThumbs).not.toMatch(/border-radius/);
	});
});
