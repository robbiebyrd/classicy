import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

const css = sass.compile(
	path.resolve(import.meta.dirname, "ClassicyApplicationSwitcher.scss"),
	{ style: "expanded" },
).css;

/** The declarations of the block `selector` heads. */
const declarations = (selector: string): Record<string, string> => {
	const at = css.indexOf(`\n${selector} {\n`);
	if (at < 0) throw new Error(`rule not found: ${selector}`);
	const body = css.slice(at + selector.length + 4, css.indexOf("}", at));
	return Object.fromEntries(
		body
			.split("\n")
			.map((line) => line.trim().replace(/;$/, ""))
			.filter((line) => line.includes(":"))
			.map((line) => {
				const colon = line.indexOf(":");
				return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
			}),
	);
};

describe("the Application Switcher's stylesheet", () => {
	// Mac OS 8.5 draws the palette's names as small text: "Calculator" is 8
	// rows tall in `platinum-85-switcher-palette.png`, as Geneva is at the
	// small UI size (review M1 of story 0231-8c6).
	it("draws the palette's names at the small UI size, in the small UI family, else the body font", () => {
		const name = declarations(".classicyApplicationSwitcherName");
		expect(name["font-size"]).toBe("var(--ui-font-size-small)");
		expect(name["font-family"]).toBe(
			"var(--ui-font-small, var(--body-font)), sans-serif",
		);
	});

	// More applications than the desktop has room for wrap into another
	// column (another row, horizontal), the palette's measured line length.
	it("wraps its buttons at the measured line length", () => {
		const wrapped = declarations(
			".classicyApplicationSwitcherButtons.classicyApplicationSwitcherWrapped",
		);
		expect(wrapped.display).toBe("grid");
		expect(wrapped["grid-auto-flow"]).toBe("column");
		expect(wrapped["grid-template-rows"]).toBe(
			"repeat(var(--application-switcher-lines), auto)",
		);
		const across = declarations(
			".classicyApplicationSwitcherHorizontal .classicyApplicationSwitcherButtons.classicyApplicationSwitcherWrapped",
		);
		expect(across["grid-auto-flow"]).toBe("row");
	});

	// Integration review IG-C1: `auto` tracks over buttons with `min-width: 0`
	// let the grid shrink to the room the window has where it sits, so a
	// wrapped palette squeezed its names and changed shape when moved. Each
	// track is as large as its largest button wherever the palette is, which
	// is the extent the line count reads.
	it("sizes a wrapped palette's tracks to their buttons, wherever it sits", () => {
		const wrapped = declarations(
			".classicyApplicationSwitcherButtons.classicyApplicationSwitcherWrapped",
		);
		expect(wrapped["grid-auto-columns"]).toBe("max-content");
		expect(wrapped["grid-template-rows"]).toBe(
			"repeat(var(--application-switcher-lines), auto)",
		);
		const across = declarations(
			".classicyApplicationSwitcherHorizontal .classicyApplicationSwitcherButtons.classicyApplicationSwitcherWrapped",
		);
		expect(across["grid-template-columns"]).toBe(
			"repeat(var(--application-switcher-lines), max-content)",
		);
	});

	// Review F3: `height: 100%` on the horizontal list made its content box
	// as tall as the window's contents, so the margin and border a package
	// draws its well with (Platinum: a pixel each) overflowed the window by 4
	// pixels and the well's bottom line was clipped. The contents lay the
	// list out as a stretched flex item instead: its whole box fits.
	it("fits the horizontal list, margin and border included, to the window's contents", () => {
		const inner = declarations(
			".classicyApplicationSwitcherHorizontal .classicyWindowContentsInner",
		);
		expect(inner.display).toBe("flex");
		expect(inner["flex-direction"]).toBe("row");
		expect(inner["align-items"]).toBe("stretch");
		const across = declarations(
			".classicyApplicationSwitcherHorizontal .classicyApplicationSwitcherButtons",
		);
		expect(across["flex-direction"]).toBe("row");
		// As wide as its buttons, and no percentage height of its own.
		expect(across.flex).toBe("none");
		expect(across.height).toBeUndefined();
	});

	// Integration review G round 3, F2: collapsed across, the palette took a
	// utility window's collapsed height, a bar across the top, which cut off
	// the zoom and collapse boxes at its side bar's bottom: it could not be
	// expanded from them. It keeps its height and shows its side bar alone.
	it("keeps a collapsed horizontal palette's height and shows its side bar alone", () => {
		const collapsed = declarations(
			".classicyWindow.classicyWindowUtility.classicyApplicationSwitcherHorizontal.collapsed",
		);
		expect(collapsed.height).toBe("auto");
		const contents = declarations(
			".classicyWindow.classicyWindowUtility.classicyApplicationSwitcherHorizontal.collapsed > .classicyWindowContents",
		);
		expect(contents["max-width"]).toBe("0");
	});
});
