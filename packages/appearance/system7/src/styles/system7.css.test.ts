import { readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The System 7 package stylesheet as Sass compiles it: one
// `@layer classicy.package` block, every rule scoped under the System 7
// desktop root, so its look applies only while it is the active package
// (design 0014-ahm; the core's _package.scss), as Platinum's does
// (platinum.css.test.ts).

const STYLESHEET = path.join(import.meta.dirname, "system7.scss");
const SYSTEM7_SCOPE =
	/^\.classicyDesktop\[data-classicy-appearance=("?)system7\1\](?=$|[\s.:#[>+~])/;

/**
 * Every style-rule selector in Sass's expanded output (through at-rules, not
 * into `@keyframes` steps), a multi-line selector list included.
 */
const selectorsOf = (css: string) => {
	const selectors: string[] = [];
	const stack: ("at" | "keyframes" | "rule")[] = [];
	let pending = "";
	for (const raw of css.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("/*")) continue;
		if (line === "}") {
			stack.pop();
			continue;
		}
		if (stack.at(-1) !== "rule" && line.endsWith(",")) {
			pending += `${line} `;
			continue;
		}
		if (line.endsWith("{")) {
			const header = `${pending}${line.slice(0, -1)}`.trim();
			pending = "";
			if (header.startsWith("@keyframes")) stack.push("keyframes");
			else if (header.startsWith("@")) stack.push("at");
			else {
				if (stack.at(-1) !== "keyframes")
					selectors.push(...header.split(",").map((s) => s.trim()));
				stack.push("rule");
			}
		}
	}
	return selectors;
};

describe("system7.scss (compiled)", () => {
	const css = compile(STYLESHEET, {
		importers: [new NodePackageImporter()],
	}).css;

	it("is one @layer classicy.package block", () => {
		expect(css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
	});

	it("holds rules, every one scoped under the system7 root", () => {
		const selectors = selectorsOf(css);
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.filter((s) => !SYSTEM7_SCOPE.test(s))).toEqual([]);
	});

	// The selector scan itself, so "every one scoped" cannot hold vacuously.
	it("the scan catches an unscoped rule in a multi-line list", () =>
		expect(
			selectorsOf(
				".classicyDesktop[data-classicy-appearance=system7] .a,\n.b {\n  color: red;\n}\n",
			).filter((s) => !SYSTEM7_SCOPE.test(s)),
		).toEqual([".b"]));

	it("hides the collapse box, which System 7 windows lack", () =>
		expect(css).toMatch(
			/\.classicyDesktop\[data-classicy-appearance=system7\] \.classicyWindowTitleBar \[data-classicy-control=collapse\] \{\s*display: none;\s*\}/,
		));

	// The declarations of every rule whose selector list holds exactly
	// `<system7 root> <rest>` (expanded output: one selector per line).
	const rule = (rest: string) => {
		const selector = `.classicyDesktop[data-classicy-appearance=system7] ${rest}`;
		return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
			.filter(([, header]) =>
				header
					.split(",")
					.map((part) => part.trim())
					.includes(selector),
			)
			.map(([, , declarations]) => declarations)
			.join("\n");
	};
	const layersOf = (declarations: string, ink: string) =>
		declarations.split(`linear-gradient(${ink}, ${ink})`).length - 1;

	// Plan 0018-dbd §3.2: the window chrome, from the 7.5 captures.
	describe("windows", () => {
		it("frames a window in one pixel with a one-pixel drop shadow and no frame ring", () => {
			const frame = rule(".classicyWindow");
			expect(frame).toMatch(/padding: 0;/);
			expect(frame).toMatch(
				/border: var\(--window-border-size\) solid var\(--color-window-border\);/,
			);
			expect(frame).toMatch(
				/box-shadow: var\(--window-border-size\) var\(--window-border-size\) 0 0 var\(--color-black\);/,
			);
		});

		it("draws the racing stripes on the active title bar only", () => {
			expect(rule(".classicyWindow.active .classicyWindowTitleBar")).toMatch(
				/repeating-linear-gradient\(var\(--color-system-06\) 0 var\(--title-bar-stripe-height\)/,
			);
			const bar = rule(".classicyWindow .classicyWindowTitleBar");
			expect(bar).toMatch(/border-bottom: var\(--window-border-size\) solid/);
			expect(bar).not.toContain("gradient");
		});

		it("grays an inactive window's frame and drops the base sheet's dimming filter", () => {
			const inactive = rule(".classicyWindow.inactive");
			expect(inactive).toMatch(/border-color: var\(--color-system-07\);/);
			expect(inactive).toMatch(/filter: none;/);
		});

		it("draws the pressed boxes' starburst and the windoid box's cross in one-pixel rectangles", () => {
			expect(
				layersOf(
					rule(
						".classicyWindow .classicyWindowTitleBar .classicyWindowCloseBox:active",
					),
					"var(--color-black)",
				),
			).toBe(12);
			expect(
				layersOf(
					rule(
						".classicyWindow.classicyWindowUtility .classicyWindowTitleBar .classicyWindowCloseBox:active",
					),
					"var(--color-black)",
				),
			).toBe(8);
		});

		it("draws the size box's two squares on its cell, glyph-less when inactive", () => {
			expect(
				layersOf(
					rule(".classicyWindow .classicyWindowResizer"),
					"var(--color-theme-07)",
				),
			).toBe(2);
			expect(rule(".classicyWindow .classicyWindowResizerDimmed")).toMatch(
				/background: var\(--color-window-document\);/,
			);
		});

		it("hides the proxy icon, which System 7 titles lack", () =>
			expect(
				rule(".classicyWindow .classicyWindowTitleBar .classicyWindowIcon"),
			).toMatch(/display: none;/));

		// The frame-edge drag handles are shared behavior: System 7 keeps them,
		// on its one-pixel frame, never over the contents or the scroll bars.
		it("keeps the frame-edge drag handles, on the frame and no deeper than it", () => {
			expect(css).not.toMatch(
				/classicyWindowFrameEdge[^{]*\{[^}]*display: none/,
			);
			for (const [edge, depth, side] of [
				["top", "height", "top"],
				["bottom", "height", "bottom"],
				["left", "width", "left"],
				["right", "width", "right"],
			]) {
				const sized = rule(`.classicyWindow .classicyWindowFrameEdge-${edge}`);
				expect(sized, edge).toMatch(
					new RegExp(`${depth}: var\\(--window-border-size\\);`),
				);
				expect(sized, edge).toMatch(
					new RegExp(
						`${side}: calc\\(var\\(--window-border-size\\) \\* -1\\);`,
					),
				);
			}
		});

		it("gives up the header's row under a window header", () =>
			expect(
				rule(
					".classicyWindow .classicyWindowContents.classicyWindowContentsWithHeader",
				),
			).toMatch(
				/height: calc\(100% - var\(--window-title-bar-height\) \+ var\(--window-border-size\) - var\(--control-row-height\)\);/,
			));

		it("draws a resizable windoid's size box", () =>
			expect(
				layersOf(
					rule(".classicyWindow.classicyWindowUtility .classicyWindowResizer"),
					"var(--color-theme-07)",
				),
			).toBe(1));

		it("lays the window's scroll bars over the frame by one pixel", () =>
			expect(
				rule(
					".classicyWindow .classicyWindowContents > .classicyScrollAreaBody > .classicyScrollBarVertical",
				),
			).toMatch(/margin: calc\(var\(--window-border-size\) \* -1\)/));
	});

	it("uses no !important (the cascade layers decide)", () =>
		expect(readFileSync(STYLESHEET, "utf8")).not.toContain("!important"));
});
