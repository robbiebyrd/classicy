import { describe, expect, it } from "vitest";
import { escapeClassicyRegExp } from "./classicyRegExpEscape";

// The helper the tests build path and URL patterns with (CodeQL alert 52,
// js/incomplete-sanitization: escaping the dots alone left the rest as
// syntax).
describe("escapeClassicyRegExp", () => {
	const texts = [
		"dist/classicy.umd.js",
		String.raw`C:\Users\a b\dist\classicy.css`,
		"file:///tmp/First Last/node_modules/mapped/dist/mapped.umd.js",
		"/tmp/a+b (1)/[x]{2}/^$|?*.js",
		"",
	];

	it.each(texts)("matches %j literally, and nothing else", (text) => {
		for (const flags of ["", "u"]) {
			const pattern = new RegExp(`^${escapeClassicyRegExp(text)}$`, flags);
			expect(pattern.test(text)).toBe(true);
			expect(pattern.test(`${text}x`)).toBe(false);
			expect(pattern.test(text.replaceAll(".", "x"))).toBe(!text.includes("."));
		}
	});

	it("escapes every syntax character, and only those", () =>
		expect(escapeClassicyRegExp("a.*+?^$" + "{}()|[]\\/b-c")).toBe(
			"a\\.\\*\\+\\?\\^\\$" + "\\{\\}\\(\\)\\|\\[\\]\\\\\\/b-c",
		));
});
