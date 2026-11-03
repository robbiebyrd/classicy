import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `isClassicyAssetSource` refuses only a double quote, a backslash and line
 * breaks, because every emitter writes an asset into a double-quoted CSS
 * `url("…")`. An unquoted `url()` cannot hold whitespace, `'`, `(` or `)`,
 * which a `data:` SVG carries, and a single-quoted one cannot hold `'`: the
 * browser drops the declaration, so an icon's mask computes to `none`
 * (K-R13). jsdom accepts either form, so the emitters are pinned on source.
 */

const UNQUOTED_URL = [
	/url\(\$\{/, // `url(${…})`
	/url\('\$\{/, // `url('${…}')`
	/["'`]url\(["']?\s*["'`]\s*\+/, // "url(" + …
];

const isLibraryModule = (file: string): boolean =>
	!/\.(test|stories)\.tsx?$/.test(file) && !file.includes("__tests__");

describe("CSS url() emitters", () => {
	it("no src module writes an interpolated value into an unquoted url()", () => {
		const hits = globSync("src/**/*.{ts,tsx}")
			.filter(isLibraryModule)
			.flatMap((file) =>
				readFileSync(file, "utf8")
					.split("\n")
					.map((line, i) =>
						UNQUOTED_URL.some((pattern) => pattern.test(line))
							? `${file}:${i + 1}`
							: null,
					)
					.filter(Boolean),
			);
		expect(hits).toEqual([]);
	});
});
