import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import "./MirroredPackage";

// `?inline` SCSS is "" under vitest, so the registered `css` is empty here:
// the stylesheet is compiled through the sass API instead. vitest's root is
// the repo root.
const compile = (file: string) =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;

/** Sass drops the quotes around an identifier attribute value. */
const unquote = (css: string) => css.replace(/=["']([^"'\]]*)["']\]/g, "=$1]");

const mirroredCss = compile("storybook/.storybook/mirrored.scss");
const platinumCss = compile("src/Appearance/Platinum/styles/platinum.scss");

/** The body of a package's one `@layer classicy.package { … }` block. */
const layerBody = (css: string) => {
	const open = css.indexOf("@layer classicy.package {");
	expect(open).toBeGreaterThanOrEqual(0);
	return css.slice(css.indexOf("{", open) + 1, css.lastIndexOf("}")).trim();
};

const SCOPE = ".classicyDesktop[data-classicy-appearance=mirrored]";

/** The declarations of the scoped rule for exactly `selector`. */
const rule = (selector: string): string => {
	const at = mirroredCss.indexOf(`\n  ${SCOPE} ${unquote(selector)} {`);
	if (at === -1) throw new Error(`rule not found: ${selector}`);
	return mirroredCss.slice(
		mirroredCss.indexOf("{", at) + 1,
		mirroredCss.indexOf("}", at),
	);
};

describe("the Storybook mirrored appearance package", () => {
	it("registers the mirrored package with flipped layout", () => {
		const pkg = getClassicyAppearancePackage("mirrored");
		expect(pkg?.name).toBe("Mirrored (Storybook test)");
		expect(pkg?.defaults.package).toBe("mirrored");
		expect(pkg?.layout).toEqual({
			window: { growBoxCorner: "bottom-left" },
			menuBar: { placement: "window" },
			desktop: { iconGridOrigin: "top-left" },
		});
	});

	it("compiles to one classicy.package block scoped to the mirrored desktop", () => {
		expect(unquote(mirroredCss)).toMatch(
			/\[data-classicy-appearance=mirrored\]/,
		);
		expect(mirroredCss.match(/@layer /g)).toHaveLength(1);
		expect(mirroredCss).not.toMatch(/data-classicy-appearance=["']?platinum/);
		// Every top-level rule of the block is under the mirrored scope (an
		// at-rule such as @supports nests scoped rules of its own).
		for (const line of mirroredCss.split("\n")) {
			if (/^ {2}[^\s}@]/.test(line)) {
				expect(line.startsWith(`  ${SCOPE}`)).toBe(true);
			}
		}
	});

	it("carries Platinum's whole look, rescoped, ahead of its flips", () => {
		const platinum = layerBody(platinumCss).replaceAll(
			"[data-classicy-appearance=platinum]",
			"[data-classicy-appearance=mirrored]",
		);
		expect(layerBody(mirroredCss).startsWith(platinum)).toBe(true);
	});

	it("flips every arrangement slot by CSS", () => {
		expect(rule('[data-classicy-control="close"]')).toMatch(/order: 50/);
		expect(rule('[data-classicy-control="zoom"]')).toMatch(/order: 5;/);
		expect(rule('[data-classicy-control="collapse"]')).toMatch(/order: 6;/);
		expect(mirroredCss).toMatch(
			/ \.classicyWindowTitleLeft,\n {2}\S+ \.classicyWindowTitleRight,\n {2}\S+ \.classicyWindowTitleCenter \{\n\s*display: none;/,
		);
		expect(rule(".classicyAlertTop")).toMatch(/flex-direction: row-reverse/);
		expect(rule(".classicyAlertButtons")).toMatch(
			/flex-direction: row-reverse;\n\s*justify-content: flex-start/,
		);
		expect(
			rule('.classicyDesktopMenu > [data-classicy-part="switcher"]'),
		).toMatch(/order: 1;\n\s*margin-right: auto/);
		expect(
			rule('.classicyDesktopMenu > [data-classicy-part="extensions"]'),
		).toMatch(/margin-left: 0/);
		expect(rule(".classicyTabContainer .classicyTabButtonsRow")).toMatch(
			/order: 1;\n\s*margin-bottom: 0;\n\s*margin-top: calc\(var\(--window-border-size\) \* -1\)/,
		);
		expect(
			rule(".classicyDisclosureHeader > .classicyControlLabelHolder"),
		).toMatch(/order: -1/);
	});

	it("turns the tab outline over with the strip, keeping the labels upright", () => {
		expect(rule(".classicyTabContainer .classicyTabButtonWrapper")).toMatch(
			/transform: scaleY\(-1\)/,
		);
		expect(
			rule(
				".classicyTabContainer .classicyTabButtonWrapper .classicyTabButton",
			),
		).toMatch(/transform: scaleY\(-1\)/);
	});
});
