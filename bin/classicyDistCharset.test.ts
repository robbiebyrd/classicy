import { describe, expect, it } from "vitest";
import {
	CLASSICY_CSS_UTF8_CHARSET,
	findClassicyCssCharsetProblem,
} from "./classicyDistCharset";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("findClassicyCssCharsetProblem", () => {
	it("passes an ASCII-only stylesheet, escapes included", () =>
		expect(
			findClassicyCssCharsetProblem(
				"dist/x.css",
				bytes('.a::before{content:"\\2713"}'),
			),
		).toBeNull());

	it("passes a non-ASCII stylesheet that opens with @charset UTF-8", () =>
		expect(
			findClassicyCssCharsetProblem(
				"dist/x.css",
				bytes(`${CLASSICY_CSS_UTF8_CHARSET}.a::before{content:"✓"}`),
			),
		).toBeNull());

	it("fails a non-ASCII stylesheet without the declaration, naming the first offset", () =>
		expect(
			findClassicyCssCharsetProblem(
				"dist/x.css",
				bytes('.a::before{content:"✓"}'),
			),
		).toMatch(/^dist\/x\.css: non-ASCII byte at offset 20 and no leading/));

	it.each([
		[
			"a later @charset",
			`.a{}${CLASSICY_CSS_UTF8_CHARSET}.b::before{content:"✓"}`,
		],
		["another charset", '@charset "windows-1252";.a::before{content:"✓"}'],
		["a lowercase charset name", '@charset "utf-8";.a::before{content:"✓"}'],
	])("fails a non-ASCII stylesheet with %s", (_name, css) =>
		expect(
			findClassicyCssCharsetProblem("dist/x.css", bytes(css)),
		).not.toBeNull());
});
