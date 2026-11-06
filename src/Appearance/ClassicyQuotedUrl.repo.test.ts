import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

// The repo root, resolved from this file (`src/Appearance/`), so the scan
// covers src whatever directory vitest was started from.
const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

const isLibraryModule = (file: string): boolean =>
	!/\.(test|stories)\.tsx?$/.test(file) && !file.includes("__tests__");

describe("CSS url() emitters", () => {
	// The core's src and each workspace Appearance Package's (Platinum's,
	// plan 0015-kxa §3.1).
	it("no src module writes an interpolated value into an unquoted url()", () => {
		const files = globSync(
			["src/**/*.{ts,tsx}", "packages/appearance/*/src/**/*.{ts,tsx}"],
			{ cwd: REPO_ROOT },
		).filter(isLibraryModule);
		expect(files.length).toBeGreaterThan(0);
		expect(files).toContain("packages/appearance/platinum/src/hooks.ts");
		const hits = files.flatMap((file) =>
			readFileSync(path.join(REPO_ROOT, file), "utf8")
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
