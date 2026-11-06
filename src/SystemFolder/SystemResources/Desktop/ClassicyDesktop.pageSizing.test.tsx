import "@/__tests__/withPlatinum";
import path from "node:path";
import { render } from "@testing-library/react";
import * as sass from "sass";
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyNoAppearancePackage } from "@/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage";
import {
	type ClassicyCssRule,
	classicyCssRules,
	classicySelectorSpecificity,
	splitClassicySelectorList,
} from "../../../../bin/classicyCssCascade";
import { classicyCssLayerPlugin } from "../../../../bin/classicyCssLayerPlugin";

/**
 * The desktop sizes its page (0158): ClassicyDesktop.scss gives html, body,
 * the mount element and its only-child wrappers `height: 100%` (and body
 * `margin: 0`) when the desktop is the page, from `classicy.base` at zero
 * specificity, so any host rule wins. The stylesheet is compiled and layered
 * the way the build does it (Sass, then classicyCssLayerPlugin's transform);
 * jsdom does no layout, so which elements the rules reach is checked with
 * `Element.matches`, and the real host is measured in a browser (the 0158
 * report).
 */

const FILE = path.resolve(
	process.cwd(),
	"src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.scss",
);

const layered = (() => {
	const css = sass.compile(FILE, { style: "expanded" }).css;
	const transform = classicyCssLayerPlugin().transform as (
		code: string,
		id: string,
	) => { code: string } | null;
	return transform(css, FILE)?.code ?? css;
})();

const BASE = "@layer classicy.base";
const NO_HAS = "@supports not selector(:has(*))";

// The page-sizing rules are the ones keyed on the desktop root's
// data-classicy-menu-bar.
const pageRules = classicyCssRules(layered).filter((r) =>
	r.selector.includes("data-classicy-menu-bar"),
);
const ancestorRules = pageRules.filter(
	(r) => r.context.length === 1 && r.context[0] === BASE,
);
const fallbackRules = pageRules.filter(
	(r) =>
		r.context.length === 2 && r.context[0] === BASE && r.context[1] === NO_HAS,
);

const ruleFor = (subject: string): ClassicyCssRule => {
	const found = ancestorRules.filter((r) =>
		r.selector.startsWith(`:where(${subject}`),
	);
	expect(found, subject).toHaveLength(1);
	return found[0];
};

const sized = (el: Element): boolean =>
	ancestorRules.some((r) => el.matches(r.selector));

const fallbackSized = (el: Element): boolean =>
	fallbackRules.some((r) => el.matches(r.selector));

const DESKTOP = `<div class="classicyDesktop" data-classicy-menu-bar="screen" id="d"></div>`;

const page = (bodyHtml: string): ((id: string) => Element) => {
	document.body.innerHTML = bodyHtml;
	return (id) => {
		const el =
			id === "html"
				? document.documentElement
				: id === "body"
					? document.body
					: document.getElementById(id);
		if (!el) throw new Error(`no #${id}`);
		return el;
	};
};

afterEach(() => {
	document.body.innerHTML = "";
	document.body.removeAttribute("style");
});

describe("ClassicyDesktop.scss sizes the page", () => {
	it("has the html, body and ancestor rules, all in classicy.base", () => {
		expect(ancestorRules).toHaveLength(3);
		expect(pageRules.every((r) => r.context[0] === BASE)).toBe(true);
		expect(
			pageRules.every(
				(r) => ancestorRules.includes(r) || fallbackRules.includes(r),
			),
		).toBe(true);
	});

	it("keeps every ancestor rule at zero specificity", () => {
		for (const rule of ancestorRules)
			for (const selector of splitClassicySelectorList(rule.selector))
				expect(classicySelectorSpecificity(selector), selector).toEqual([
					0, 0, 0,
				]);
	});

	it("gives html, the mount chain and body a full height, and body no margin", () => {
		expect(ruleFor("html").declarations).toEqual([["height", "100%"]]);
		expect(ruleFor("body >").declarations).toEqual([["height", "100%"]]);
		expect(ruleFor("body:has").declarations).toEqual([
			["height", "100%"],
			["margin", "0"],
		]);
		expect(layered).not.toContain("!important");
	});

	it("sizes html, body and the mount element of a bare host", () => {
		const $ = page(`<div id="root">${DESKTOP}</div><script></script>`);
		expect(["html", "body", "root"].map((id) => sized($(id)))).toEqual([
			true,
			true,
			true,
		]);
		expect(sized($("d"))).toBe(false);
	});

	it("sizes a desktop mounted on body itself", () => {
		const $ = page(DESKTOP);
		expect(sized($("html"))).toBe(true);
		expect(sized($("body"))).toBe(true);
	});

	it("sizes up to four only-child wrappers below the mount, not five", () => {
		const nest = (n: number): string =>
			n === 0 ? DESKTOP : `<div id="w${n}">${nest(n - 1)}</div>`;
		let $ = page(`<div id="root">${nest(4)}</div><p>sibling of the mount</p>`);
		for (const id of ["html", "body", "root", "w4", "w3", "w2", "w1"])
			expect(sized($(id)), id).toBe(true);
		expect(fallbackSized($("d"))).toBe(true);

		$ = page(`<div id="root">${nest(5)}</div>`);
		for (const id of ["html", "body", "root", "w5", "w1"])
			expect(sized($(id)), id).toBe(false);
		expect(fallbackSized($("d"))).toBe(false);
	});

	it("leaves a page alone when a wrapper also holds other content", () => {
		const $ = page(
			`<main id="main"><h1>Host</h1><div id="root">${DESKTOP}</div></main>`,
		);
		for (const id of ["html", "body", "main", "root"])
			expect(sized($(id)), id).toBe(false);
		expect(fallbackSized($("d"))).toBe(false);
	});

	it("ignores a .classicyDesktop that ClassicyDesktop did not draw (a Storybook frame)", () => {
		const $ = page(
			`<div id="root"><div id="frame" class="classicyDesktop classicyStorybookFrame"><p>story</p></div></div>`,
		);
		for (const id of ["html", "body", "root"])
			expect(sized($(id)), id).toBe(false);
	});

	it("ignores a desktop inside another desktop", () => {
		const $ = page(
			`<div id="root"><div id="frame" class="classicyDesktop">${DESKTOP}</div></div>`,
		);
		for (const id of ["html", "body", "root", "frame"])
			expect(sized($(id)), id).toBe(false);
		expect(fallbackSized($("d"))).toBe(false);
	});

	it("sizes the page for the no-package screen too", () => {
		const $ = page(
			`<div id="root"><div class="classicyNoAppearancePackage" id="n"></div></div>`,
		);
		for (const id of ["html", "body", "root"])
			expect(sized($(id)), id).toBe(true);
		expect(fallbackSized($("n"))).toBe(true);
	});

	it("falls back to a window-high desktop, capped at its parent, without :has()", () => {
		expect(fallbackRules).toHaveLength(1);
		const [rule] = fallbackRules;
		expect(rule.declarations).toEqual([
			["height", "100vh"],
			["height", "100dvh"],
			["max-height", "100%"],
		]);
		// It must beat .classicyDesktop's own height: 100% in the same layer.
		for (const selector of splitClassicySelectorList(rule.selector))
			expect(classicySelectorSpecificity(selector)[1]).toBeGreaterThan(1);
		const bodyMargin = classicyCssRules(layered).filter(
			(r) => r.selector === ":where(body)",
		);
		expect(bodyMargin.map((r) => [r.context, r.declarations])).toEqual([
			[[BASE, NO_HAS], [["margin", "0"]]],
		]);
	});
});

describe("the rendered desktop matches the page rules", () => {
	it("ClassicyDesktop's root is the page root the rules look for", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		// render() mounts into a div appended to body: the mount element.
		expect(sized(document.documentElement)).toBe(true);
		expect(sized(document.body)).toBe(true);
		expect(sized(container)).toBe(true);
	});

	it("so is the no-package screen's root", () => {
		const { container } = render(<ClassicyNoAppearancePackage />);
		expect(sized(container)).toBe(true);
	});
});
