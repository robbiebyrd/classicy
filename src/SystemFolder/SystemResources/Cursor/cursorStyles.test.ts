import { join } from "node:path";
import { compile } from "sass";
import { describe, expect, it } from "vitest";

const compiled = (relative: string): string =>
	compile(join(process.cwd(), "src", relative)).css;

const stylesheets = {
	"ClassicySplitView.scss": compiled(
		"SystemFolder/SystemResources/SplitView/ClassicySplitView.scss",
	),
	"PDFViewerDocument.scss": compiled(
		"SystemFolder/PDFViewer/PDFViewerDocument.scss",
	),
};

const cursorDeclarations = (css: string): string[] =>
	css.match(/cursor:[^;]*;/g) ?? [];

describe("cursor stylesheets", () => {
	it("read cursors from the registry variables, not bundled files", () => {
		for (const [name, css] of Object.entries(stylesheets)) {
			expect(css, name).not.toMatch(/assets\/img\/[^'")]*cursor/);
		}
	});

	it("give every cursor variable an image fallback and a keyword cursor", () => {
		// A bare var() with no fallback, undefined outside a desktop, would void
		// the whole declaration; an image that never loads lets the browser fall
		// through to the keyword cursor instead.
		for (const [name, css] of Object.entries(stylesheets)) {
			const declarations = cursorDeclarations(css).filter((d) =>
				d.includes("var(--classicy-"),
			);
			expect(declarations.length, name).toBeGreaterThan(0);
			for (const declaration of declarations) {
				if (!declaration.includes("var(--classicy-cursor-")) {
					expect(declaration, name).toMatch(
						/^cursor: var\(--classicy-[a-z-]+, url\("data:,"\)\) \d+ \d+, [a-z-]+;$/,
					);
					continue;
				}
				// A registry cursor's hotspot is the registered one (`{ src,
				// hotspot }`), read from the role's own -hotspot variable, with a
				// numeric fallback.
				const match =
					/^cursor: var\(--classicy-cursor-([a-z-]+), url\("data:,"\)\) var\(--classicy-cursor-([a-z-]+)-hotspot, \d+ \d+\), [a-z-]+;$/.exec(
						declaration,
					);
				expect(match, `${name}: ${declaration}`).not.toBeNull();
				expect(match?.[2], declaration).toBe(match?.[1]);
			}
		}
	});

	it("SplitView covers the two hover cursors and the four drag directions", () => {
		const css = stylesheets["ClassicySplitView.scss"];
		for (const role of [
			"resize-lr",
			"resize-ud",
			"resize-u",
			"resize-d",
			"resize-l",
			"resize-r",
		]) {
			expect(css).toContain(`var(--classicy-cursor-${role},`);
		}
	});
});
