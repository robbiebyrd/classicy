import { compile } from "sass";
import { describe, expect, it } from "vitest";
import {
	cssRuleLookup,
	PLATINUM_ROOT,
	parseCssRules,
} from "@/__tests__/compiledCss";

/**
 * The tab outline (Part E 3.1) is registered package art
 * (`--classicy-art-tab-outline`), not an SVG baked into the stylesheet. It is
 * the tab wrapper's background image over its fill, as the old baked SVG was,
 * with the same size and repeat (kept in the base sheet), so the wrapper's
 * `clip-path` crops it as before.
 *
 * An image, not the plan's masked `::before` over `--color-black`: that mask
 * differs from the old raster by up to 5 levels along the outline (all six
 * Controls/Tabs stories), while the art as an image is exact; owner ruling
 * E20 demands exact parity, and ruling E21 drew the pop-up arrows the same
 * way.
 *
 * The outline is look, so it lives in the Platinum package's Tabs partial
 * (ruling E10); the image geometry and the fills stay in the base sheet.
 */

const css = compile("src/Appearance/Platinum/styles/platinum.scss", {
	loadPaths: ["src"],
}).css;
const base = compile(
	"src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss",
).css;

/** A package rule, scoped under the Platinum desktop root. */
const rule = cssRuleLookup(parseCssRules(css), PLATINUM_ROOT);
/** A rule of the base Tabs sheet. */
const baseRule = cssRuleLookup(parseCssRules(base));

describe("tab outline art (Platinum package)", () => {
	it("the tab outline is the wrapper's image, from the package art", () => {
		const w = rule(".classicyTabButtonWrapper");
		expect(w["background-image"]).toBe("var(--classicy-art-tab-outline)");
		expect(w["mask-image"]).toBeUndefined();
		expect(() => rule(".classicyTabButtonWrapper::before")).toThrow(/no rule/);
	});

	it("the base wrapper keeps the image's geometry and the fills, and embeds no outline", () => {
		const w = baseRule(".classicyTabButtonWrapper");
		expect(w["background-size"]).toBe("100% 100%");
		expect(w["background-repeat"]).toBe("no-repeat");
		expect(w["background-color"]).toBe("var(--color-system-04)");
		expect(w["background-image"]).toBeUndefined();
		expect(w.position).toBeUndefined();
		expect(
			baseRule(".classicyTabButtonWrapper:has(.classicyTabButton.selected)")[
				"background-color"
			],
		).toBe("var(--color-system-02)");
		expect(base).not.toMatch(/data:image/);
	});

	it("no tab rule embeds the outline as a data URI", () => {
		const tabRules = parseCssRules(css).filter((r) =>
			r.selectors.some((s) => s.includes(".classicyTab")),
		);
		expect(tabRules.length).toBeGreaterThan(0);
		for (const r of tabRules)
			expect(r.body, r.selectors[0]).not.toMatch(/data:image|url\(/);
	});
});
