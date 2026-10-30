import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * G 2.2: the stylesheets read the named theme derivations
 * (`CLASSICY_THEME_DERIVATIONS`, emitted by `getThemeVars`) instead of
 * restating each proportion as `calc(var(--input) * N)`. Each file is compiled
 * as shipped and the exact declarations are pinned.
 */

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), "src/SystemFolder", file), {
		style: "expanded",
	}).css;

const windowCss = compile("SystemResources/Window/ClassicyWindow.scss");
const menu = compile("SystemResources/Menu/ClassicyMenu.scss");
const popUp = compile("SystemResources/PopUpMenu/ClassicyPopUpMenu.scss");
const tabs = compile("SystemResources/Tabs/ClassicyTabs.scss");
const button = compile("SystemResources/Button/ClassicyButton.scss");
const controlLabel = compile(
	"SystemResources/ControlLabel/ClassicyControlLabel.scss",
);
const controlGroup = compile(
	"SystemResources/ControlGroup/ClassicyControlGroup.scss",
);
const slider = compile("SystemResources/Slider/ClassicySlider.scss");
const desktopIcon = compile("SystemResources/Desktop/ClassicyDesktopIcon.scss");

const escapeRegExp = (s: string): string =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The declarations of every top-level block `selector` heads in `css`, merged
 * in source order (a later block's declaration wins, as in the cascade).
 */
const declarations = (
	css: string,
	selector: string,
): Record<string, string> => {
	const blocks = [
		...css.matchAll(
			new RegExp(`^${escapeRegExp(selector)} \\{\\n([^}]*)\\n\\}`, "gm"),
		),
	];
	if (blocks.length === 0) throw new Error(`rule not found: ${selector}`);
	const out: Record<string, string> = {};
	for (const block of blocks) {
		for (const line of block[1].split("\n")) {
			const colon = line.indexOf(":");
			if (colon === -1) continue;
			out[line.slice(0, colon).trim()] = line
				.slice(colon + 1)
				.trim()
				.replace(/;$/, "");
		}
	}
	return out;
};

describe("stylesheets read the named theme derivations", () => {
	it("window: collapsed heights, frame inset, header font", () => {
		const rule = (selector: string) => declarations(windowCss, selector);
		expect(rule(":where(.classicyWindow).collapsed").height).toBe(
			"var(--window-collapsed-height)",
		);
		expect(rule(".classicyWindowUtility.collapsed").height).toBe(
			"var(--window-utility-collapsed-height)",
		);
		expect(rule(".classicyWindow").padding).toBe("var(--window-frame-inset)");
		expect(rule(".classicyWindowHeader")["font-size"]).toBe(
			"var(--window-header-font-size)",
		);
	});

	it("menu: min width, icon size and gap", () => {
		const rule = (selector: string) => declarations(menu, selector);
		expect(rule(".classicyMenu")["min-width"]).toBe("var(--menu-min-width)");
		expect(rule(".classicyMenuItemCheck").width).toBe(
			"var(--menu-item-icon-size)",
		);
		expect(rule(".classicyMenuItemCheck")["margin-right"]).toBe(
			"var(--menu-item-icon-gap)",
		);
	});

	it("pop-up: height, mini size, arrow width", () => {
		const rule = (selector: string) => declarations(popUp, selector);
		expect(rule(".classicyPopUpMenu").height).toBe("var(--popup-height)");
		const mini = rule(".classicyPopUpMenu.classicyPopUpMenuSizeMini");
		expect(mini.width).toBe("var(--popup-mini-size)");
		expect(mini.height).toBe("var(--popup-mini-size)");
		expect(rule(".classicyPopUpMenuIndicator").width).toBe(
			"var(--popup-arrow-width)",
		);
	});

	it("typography steps", () => {
		const tabsSmallFontSize = declarations(
			tabs,
			".classicyTabsSizeSmall .classicyTabButton",
		)["font-size"];
		const tabsLargeFontSize = declarations(
			tabs,
			".classicyTabsSizeLarge .classicyTabButton",
		)["font-size"];
		expect(declarations(button, ".classicyButtonSmall")["font-size"]).toBe(
			"var(--ui-font-size-mini)",
		);
		expect(
			declarations(controlLabel, ".classicyControlLabelSizeSmall")["font-size"],
		).toBe("var(--ui-font-size-small)");
		expect(
			declarations(controlGroup, ".classicyControlGroupLegend")["font-size"],
		).toBe("var(--ui-font-size-caption)");
		expect(tabsSmallFontSize).toBe("var(--ui-font-size-compact)");
		expect(tabsLargeFontSize).toBe("var(--ui-font-size-large)");
	});

	it("tabs, slider, icon grid", () => {
		const sliderThumbWidthDeclaration = declarations(
			slider,
			".classicySlider::-webkit-slider-thumb",
		).width;
		expect(
			declarations(tabs, ".classicyTabsSizeSmall .classicyTabButton")[
				"min-width"
			],
		).toBe("var(--tab-min-width)");
		expect(sliderThumbWidthDeclaration).toContain("var(--slider-thumb-width)");
		expect(declarations(desktopIcon, ".classicyDesktopIcon").width).toBe(
			"var(--desktop-icon-cell)",
		);
	});

	it("no rewritten family still carries its multiplier", () => {
		for (const [file, re] of [
			[windowCss, /control-size\) \* 1\.25\)/],
			[menu, /control-size\) \* 15\)/],
			[popUp, /2\.125|1\.3125/],
			[tabs, /10 \/ 12|\* 9\)|4 \/ 2\.5/],
			[button, /\/ ?1\.5\)/],
		] as const) {
			expect(file).not.toMatch(re);
		}
	});
});
