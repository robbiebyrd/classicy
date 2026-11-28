// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { UserConfig } from "vite";
import { describe, expect, it } from "vitest";

// Windows 98's build and compiler configs started as copies of Platinum's
// (plan 0018-dbd §2.2) and carry nothing of Platinum's that Windows 98 lacks
// (as System 7's): no exclude of a folder it does not have, and no asset
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

describe("Windows 98's configs", () => {
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
		// ogg and m4a are Vite's own asset types: the config adds none.
		expect(config.assetsInclude).toBeUndefined();
		const files = filesUnder(path.join(packageDir, "src"));
		expect(files.some((file) => file.endsWith(".ac3"))).toBe(false);
	}, 60_000);
});
