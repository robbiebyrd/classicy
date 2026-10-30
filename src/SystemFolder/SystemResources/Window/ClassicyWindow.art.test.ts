import { existsSync, readFileSync } from "node:fs";
import { compile } from "sass";
import { describe, expect, it } from "vitest";

/**
 * The Platinum title-bar art (Part E 2.1): the pinstripes, the red stripes and
 * the utility windoid's texture are masked package art, not images baked into
 * the stylesheet. The element paints the light rows as its background color
 * and a `::before` paints the dark rows through the registered stripe mask
 * (`--classicy-art-window-stripes[-red]`); every `mask-*` longhand mirrors the
 * `background-*` longhand the old striped image had, so Platinum renders as
 * before.
 *
 * The look lives in the Platinum package (ruling E4), so this compiles
 * `platinum.scss`, whose rules sit indented inside `@layer classicy.package`
 * and are scoped under the Platinum desktop root.
 */

const PLATINUM = "src/Appearance/Platinum/styles";
const css = compile(`${PLATINUM}/platinum.scss`, { loadPaths: ["src"] }).css;

const P = ".classicyDesktop[data-classicy-appearance=platinum]";
// One selector list per line, unindented.
const flat = css.replace(/,\s*\n\s*/g, ", ").replace(/\n\s+/g, "\n");

/** Every rule as its selector list and its declaration block. */
const rules = [...flat.matchAll(/\n([^\n{}@][^\n{}]*) \{\n([^}]*)\}/g)].map(
	([, selectors, body]) => ({
		selectors: selectors.split(", "),
		body,
	}),
);

/**
 * The declarations of every rule whose selector list names
 * `${P} ${selector}`, merged in source order (a later rule's value wins, as
 * it does in the cascade between equal selectors).
 */
const rule = (selector: string): Record<string, string> => {
	const matched = rules.filter((r) => r.selectors.includes(`${P} ${selector}`));
	if (matched.length === 0) throw new Error(`no rule for ${selector}`);
	const props: Record<string, string> = {};
	for (const { body } of matched)
		for (const line of body.split(";\n")) {
			const colon = line.indexOf(":");
			if (colon > 0)
				props[line.slice(0, colon).trim()] = line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
		}
	return props;
};

const ACTIVE =
	":where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle";
const RED = ".classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle";
const ALERT =
	".classicyWindow:has(.classicyAlertMovable) .classicyWindowTitleBar .classicyWindowTitle";
const UTILITY =
	".classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowTitle";

describe("ClassicyWindow title-bar art (Platinum package)", () => {
	it("draws the active stripes as a masked dark layer over a light ground", () => {
		const el = rule(`${ACTIVE} .classicyWindowTitleCenter`);
		expect(el["background-color"]).toBe("var(--platinum-stripe-light)");
		const before = rule(`${ACTIVE} .classicyWindowTitleCenter::before`);
		expect(before["mask-image"]).toBe("var(--classicy-art-window-stripes)");
		expect(before["mask-size"]).toBe("auto 100%");
		expect(before["background-color"]).toBe("var(--platinum-stripe-dark)");
	});

	it("keeps the 99.8% stripe scale on the side bands", () => {
		expect(
			rule(`${ACTIVE} .classicyWindowTitleLeft::before`)["mask-size"],
		).toBe("auto 99.8%");
		expect(
			rule(`${ACTIVE} .classicyWindowTitleRight::before`)["mask-size"],
		).toBe("auto 99.8%");
	});

	it("red windows use the red mask and colors", () => {
		const el = rule(`${RED} .classicyWindowTitleCenter`);
		expect(el["background-color"]).toBe("var(--platinum-stripe-red-light)");
		const b = rule(`${RED} .classicyWindowTitleCenter::before`);
		expect(b["mask-image"]).toBe("var(--classicy-art-window-stripes-red)");
		expect(b["background-color"]).toBe("var(--platinum-stripe-red-dark)");
		expect(b["mask-size"]).toBe("auto 100%");
	});

	// T1: the red and movable-alert side bands' `background:` shorthand reset
	// the size to `auto` over the active rule's 99.8%, so their masks say so.
	it("red and movable-alert side bands write mask-size auto over the active 99.8%", () => {
		for (const band of [
			`${RED} .classicyWindowTitleLeft::before`,
			`${RED} .classicyWindowTitleRight::before`,
			`${ALERT} .classicyWindowTitleLeft::before`,
			`${ALERT} .classicyWindowTitleRight::before`,
		]) {
			expect(rule(band)["mask-size"], band).toBe("auto");
			expect(rule(band)["mask-image"], band).toBe(
				"var(--classicy-art-window-stripes-red)",
			);
		}
		const center = rule(`${ALERT} .classicyWindowTitleCenter::before`);
		expect(center["mask-size"]).toBe("auto 100%");
		expect(center["background-color"]).toBe("var(--platinum-stripe-red-dark)");
	});

	it("every stripe layer mirrors the old image's repeat and position, over the whole band", () => {
		for (const layer of [
			`${ACTIVE} .classicyWindowTitleCenter::before`,
			`${ACTIVE} .classicyWindowTitleLeft::before`,
			`${RED} .classicyWindowTitleRight::before`,
			`${ALERT} .classicyWindowTitleCenter::before`,
			".classicyWindowFrameTitleBar::before",
		]) {
			const b = rule(layer);
			expect(b.content, layer).toBe('""');
			expect(b.position, layer).toBe("absolute");
			expect(b.inset, layer).toBe("0");
			expect(b["mask-repeat"], layer).toBe("repeat");
			expect(b["mask-position"], layer).toBe("0 0");
		}
		for (const band of [
			`${ACTIVE} .classicyWindowTitleCenter`,
			`${ACTIVE} .classicyWindowTitleLeft`,
			`${RED} .classicyWindowTitleCenter`,
			`${ALERT} .classicyWindowTitleRight`,
			".classicyWindowFrameTitleBar",
		])
			expect(rule(band).position, band).toBe("relative");
	});

	it("the window frame's title bar draws the same stripes under its title", () => {
		const bar = rule(".classicyWindowFrameTitleBar");
		expect(bar["background-color"]).toBe("var(--platinum-stripe-light)");
		expect(bar.isolation).toBe("isolate");
		const before = rule(".classicyWindowFrameTitleBar::before");
		expect(before["mask-image"]).toBe("var(--classicy-art-window-stripes)");
		expect(before["mask-size"]).toBe("auto 100%");
		expect(before["z-index"]).toBe("-1");
	});

	it("utility texture is two masked radial layers at 4px 3px", () => {
		const s = rule(`${UTILITY} .classicyWindowTitleCenter::before`);
		expect(s["mask-image"]).toBe("var(--classicy-art-window-utility-shade)");
		expect(s["mask-size"]).toBe("4px 3px");
		expect(s["background-color"]).toBe("var(--color-black)");
		const h = rule(`${UTILITY} .classicyWindowTitleCenter::after`);
		expect(h["mask-image"]).toBe(
			"var(--classicy-art-window-utility-highlight)",
		);
		expect(h["mask-size"]).toBe("4px 3px");
		expect(h["background-color"]).toBe("var(--color-white)");
		expect(
			rule(`${UTILITY} .classicyWindowTitleCenter`)["background-color"],
		).toBe("var(--color-system-03)");
	});

	// T2: an active windoid matches the active stripe rule too; the texture
	// rule must set every property that rule's ::before sets.
	it("the utility texture overrides every property of the active stripe layer", () => {
		const stripe = rule(`${ACTIVE} .classicyWindowTitleCenter::before`);
		const texture = rule(`${UTILITY} .classicyWindowTitleCenter::before`);
		for (const prop of Object.keys(stripe))
			expect(texture[prop], prop).toBeDefined();
	});

	// T3: the windoid's side bands draw nothing, over the active stripes.
	it("the utility side bands drop the stripes", () => {
		for (const band of [
			".classicyWindowTitleLeft",
			".classicyWindowTitleRight",
		]) {
			expect(rule(`${UTILITY} ${band}`).background, band).toBe("none");
			expect(rule(`${UTILITY} ${band}::before`).content, band).toBe("none");
		}
	});

	it("declares the stripe colors on the package root", () => {
		const root = rules
			.filter((r) => r.selectors.includes(P))
			.map((r) => r.body)
			.join("\n");
		expect(root).toContain("--platinum-stripe-light: var(--color-white)");
		expect(root).toContain("--platinum-stripe-dark: #787878");
		expect(root).toContain("--platinum-stripe-red-light: #f9dada");
		expect(root).toContain("--platinum-stripe-red-dark: #ef8c89");
	});

	it("no stylesheet embeds stripe art any more", () => {
		const titleBarRules = rules.filter((r) =>
			r.selectors.some((s) =>
				/classicyWindowTitle(Center|Left|Right)|classicyWindowFrameTitleBar/.test(
					s,
				),
			),
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
	// never painted; their rules and art are gone rather than masked.
	it("draws no title-bar caps", () => {
		for (const band of [
			`${ACTIVE} .classicyWindowTitleLeft::after`,
			`${RED} .classicyWindowTitleRight::after`,
			`${ALERT} .classicyWindowTitleLeft::after`,
		])
			expect(() => rule(band), band).toThrow(/no rule/);
		for (const cap of ["left", "right", "left-red", "right-red"])
			expect(
				existsSync(`src/Appearance/Platinum/assets/art/title-bar-${cap}.svg`),
				cap,
			).toBe(false);
	});
});
