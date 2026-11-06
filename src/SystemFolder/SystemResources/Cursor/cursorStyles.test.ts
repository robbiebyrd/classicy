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
				expect(declaration, name).toMatch(
					/^cursor: var\(--classicy-[a-z-]+, url\("data:,"\)\) \d+ \d+, [a-z-]+;$/,
				);
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
