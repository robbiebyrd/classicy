// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { UserConfig } from "vite";
import { describe, expect, it } from "vitest";

// System 7's build and compiler configs started as copies of Platinum's
// (plan 0018-dbd §2.2) and carry nothing of Platinum's that System 7 lacks
// (story 0210-aal): no exclude of a folder it does not have, and no asset
// type Vite already knows.

const packageDir = path.resolve(import.meta.dirname, "..");

/** A tsconfig's `exclude` list (tsconfig files may hold comments). */
const excludes = (file: string): string[] => {
	const { config, error } = ts.parseConfigFileTextToJson(
		file,
		readFileSync(path.join(packageDir, file), "utf8"),
	);
	expect(error).toBeUndefined();
	return (config as { exclude?: string[] }).exclude ?? [];
};

/** Every file under `dir`, relative to it. */
const filesUnder = (dir: string): string[] =>
	readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) =>
			path.relative(dir, path.join(entry.parentPath, entry.name)),
		);

describe("System 7's configs", () => {
	it.each([
		"tsconfig.json",
		"tsconfig.build.json",
	])("%s excludes only what exists or is built", (file) => {
		// Globs and the build's own output folders are always fine.
		const literal = excludes(file).filter(
			(entry) =>
				!/[*?]/.test(entry) && !["dist", "node_modules"].includes(entry),
		);
		for (const entry of literal)
			expect(existsSync(path.join(packageDir, entry)), entry).toBe(true);
		expect(excludes(file)).not.toContain("resources");
	});

	it("adds only the asset types Vite does not know and the package imports", async () => {
		const { default: configFn } = (await import("../vite.config")) as {
			default: (env: {
				command: "serve";
				mode: string;
				isSsrBuild: boolean;
				isPreview: boolean;
			}) => UserConfig;
		};
		const config = configFn({
			command: "serve",
			mode: "bundle-test",
			isSsrBuild: false,
			isPreview: false,
		});
		// ogg, m4a, mp3 and wav are Vite's own asset types; ac3 is not, and
		// the sound sheet ships one (assets/sounds/system7/system7.ac3).
		expect(config.assetsInclude).toEqual(["**/*.ac3"]);
		const files = filesUnder(path.join(packageDir, "src"));
		expect(files.some((file) => file.endsWith(".ac3"))).toBe(true);
	}, 60_000);
});
