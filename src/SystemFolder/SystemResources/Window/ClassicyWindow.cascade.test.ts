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
			".classicyWindowInvisible",
		])
			expect(at(s)).toBeGreaterThan(base);
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

	it("platinum-window-control-box sizes are not !important", () => {
		const mixin = sass.compileString(
			'@use "mixins";\n.box { @include mixins.platinum-window-control-box; }',
			{
				style: "expanded",
				loadPaths: [
					path.resolve(process.cwd(), "src/Appearance/Platinum/styles"),
				],
			},
		).css;
		expect(mixin).toContain("width: var(--window-control-size)");
		expect(mixin).not.toContain("!important");
	});
});
