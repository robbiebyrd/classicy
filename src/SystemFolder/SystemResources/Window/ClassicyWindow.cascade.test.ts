import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * ClassicyWindow.scss resolves its window states by source order alone: the
 * base `.classicyWindow` rule comes first and every state rule follows it, so
 * a state wins because it is later, never because it is `!important`. jsdom
 * does no cascade, so this pins that order on the compiled stylesheet.
 *
 * The state selectors are written `:where(.classicyWindow).state`, which keeps
 * them at the specificity of the single legacy class they replaced.
 */

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;

const css = compile(
	"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
);

const rule = (selector: string): Record<string, string> => {
	const match = css.match(
		new RegExp(
			`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
			"m",
		),
	);
	if (!match) throw new Error(`no rule for ${selector}`);
	return Object.fromEntries(
		match[1]
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("/"))
			.map((line) => {
				const [prop, ...rest] = line.replace(/;$/, "").split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

// Prefixed with a newline so the file's first rule is found like any other.
const at = (sel: string) => {
	const i = `\n${css}`.indexOf(`\n${sel} {`);
	if (i < 0) throw new Error(sel);
	return i;
};

describe("ClassicyWindow.scss cascade", () => {
	it("contains no !important", () => expect(css).not.toContain("!important"));

	it("base rule precedes every state rule", () => {
		const base = at(".classicyWindow");
		for (const s of [
			":where(.classicyWindow).inactive",
			":where(.classicyWindow).active",
			":where(.classicyWindow).collapsed",
			".classicyWindowUtility.collapsed",
			":where(.classicyWindow).dragging",
			".classicyWindowResizing",
			".classicyWindowRed",
			".classicyWindowActiveApp",
			".classicyWindowFloating",
			".classicyWindowBackgrounded",
			".classicyWindowModalFront",
			".classicyWindowNoScroll",
			".classicyWindowHeaderDimmed",
			".classicyWindowContentsDimmed",
			".classicyWindowContentsNotDimmed",
			".classicyWindowPlacardBarDimmed",
			".classicyWindowContentsFramedDimmed",
		])
			expect(at(s)).toBeGreaterThan(base);
	});

	// A window can carry two of these at once, so the one that must win
	// comes later (they tie at one class).
	it.each([
		// a focused app's inactive palette floats over its documents
		[".classicyWindowFloating", ".classicyWindowActiveApp"],
		// the focused palette floats over the active band
		[".classicyWindowFloating", ":where(.classicyWindow).active"],
		// a focused modal keeps the modal band, an alert the red band
		[".classicyWindowModalFront", ":where(.classicyWindow).active"],
		[".classicyWindowRed", ":where(.classicyWindow).active"],
		// a dimmed part keeps its base look's other declarations
		[".classicyWindowHeaderDimmed", ".classicyWindowHeader"],
		// dragging and resizing hide the dimmed header and contents too
		[":where(.classicyWindow).dragging", ".classicyWindowHeaderDimmed"],
		[":where(.classicyWindow).dragging", ".classicyWindowContentsDimmed"],
		[".classicyWindowResizing", ".classicyWindowContentsDimmed"],
		// a dimmed placard bar keeps its own opacity while dragged
		[".classicyWindowPlacardBarDimmed", ".classicyWindowResizing"],
	])("%s follows %s", (later, earlier) =>
		expect(at(later)).toBeGreaterThan(at(earlier)));

	it("the state rules keep their values", () => {
		expect(rule(".classicyWindowBackgrounded")["z-index"]).toBe("20");
		expect(rule(".classicyWindowNoScroll").overflow).toBe("hidden");
		expect(rule(".classicyWindowHeaderDimmed").opacity).toBe("0.5");
		expect(rule(".classicyWindowContentsDimmed").opacity).toBe("0.8");
		expect(rule(".classicyWindowPlacardBarDimmed").opacity).toBe("0.6");
	});

	it("utility collapsed height follows document collapsed height", () =>
		expect(at(".classicyWindowUtility.collapsed")).toBeGreaterThan(
			at(":where(.classicyWindow).collapsed"),
		));

	it("collapsed height reads the theme derivations (control × 1.25 / × .5)", () => {
		expect(rule(":where(.classicyWindow).collapsed").height).toBe(
			"var(--window-collapsed-height)",
		);
		expect(rule(".classicyWindowUtility.collapsed").height).toBe(
			"var(--window-utility-collapsed-height)",
		);
	});

	it("z-index bands are intact", () => {
		expect(rule(":where(.classicyWindow).active")["z-index"]).toBe("300");
		expect(rule(".classicyWindowFloating")["z-index"]).toBe("350");
		expect(rule(".classicyWindowModalFront")["z-index"]).toBe("370");
		expect(rule(".classicyWindowRed")["z-index"]).toBe("99999");
		expect(rule(".classicyWindowActiveApp")["z-index"]).toBe("150");
	});

	it("no phantom tokens anywhere", () => {
		for (const file of [
			"src/SystemFolder/ControlPanels/DriveSetup/DriveSetupList.scss",
			"src/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss",
			"src/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss",
		])
			expect(compile(file)).not.toMatch(
				/--color-theme-1\b|--box-border-size|--color-theme-hover|--color-theme-selection/,
			);
	});

	// The control-box size is structure, in the title bar's base rules (story
	// 0088-sz9); Platinum's control-box mixin draws only the look.
	it("the control-box size is base structure, not a !important package size", () => {
		const mixin = sass.compileString(
			'@use "mixins";\n.box { @include mixins.platinum-window-control-box; }',
			{
				style: "expanded",
				loadPaths: [
					path.resolve(process.cwd(), "src/Appearance/Platinum/styles"),
				],
			},
		).css;
		expect(mixin).not.toMatch(/(^|\s)(width|height):/);
		expect(mixin).not.toContain("!important");
		expect(css).toContain(
			".classicyWindow .classicyWindowTitleBar .classicyWindowCollapseBox {\n  width: var(--window-control-size);\n  height: var(--window-control-size);\n}",
		);
	});
});
