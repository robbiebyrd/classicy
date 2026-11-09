import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Platinum's source reaches the core only through its public API (plan
// 0015-kxa §3.1, design 0014-ahm "Build and outputs"): TypeScript imports
// `@classicy/classicy`, never a core path (`@/…`, or a relative path out of
// the package), so its build externalizes the core and shares its registries;
// SCSS uses the vocabulary as `pkg:@classicy/classicy/scss/<module>`.
// Tests may still import core internals and test helpers.

const srcDir = path.resolve(import.meta.dirname);
const packageDir = path.dirname(srcDir);
const sourceFiles = (pattern: RegExp) =>
	readdirSync(srcDir, { recursive: true })
		.map((file) => String(file).split(path.sep).join("/"))
		.filter((file) => pattern.test(file) && !/\.test\.tsx?$/.test(file));

const moduleSpecifiers = (file: string): string[] => {
	const source = ts.createSourceFile(
		file,
		readFileSync(path.join(srcDir, file), "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	const specifiers: string[] = [];
	const visit = (node: ts.Node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		)
			specifiers.push(node.moduleSpecifier.text);
		else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments[0] &&
			ts.isStringLiteral(node.arguments[0])
		)
			specifiers.push(node.arguments[0].text);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specifiers;
};

/**
 * Whether a relative specifier from `file` stays inside the package: its
 * src/, or the files in its assets/ (the sprites, wallpapers, art and cursors
 * that left the core's assets/, plan 0015-kxa §3.3).
 */
const staysInPackage = (file: string, specifier: string) =>
	!path
		.relative(packageDir, path.resolve(srcDir, path.dirname(file), specifier))
		.startsWith("..");

describe("Platinum's TypeScript", () => {
	const files = sourceFiles(/\.tsx?$/);

	it("covers the registering modules", () =>
		expect(files).toEqual(
			expect.arrayContaining([
				"index.ts",
				"hooks.ts",
				"assets/platinumAssets.ts",
				"assets/sounds/platinum.ts",
				"screenSavers/platinumScreenSavers.ts",
				"screenSavers/Logo/ClassicyScreenSaverLogoRegistry.ts",
			]),
		));

	it("imports the core only as @classicy/classicy", () => {
		const offenders = files.flatMap((file) =>
			moduleSpecifiers(file)
				.filter((specifier) =>
					specifier.startsWith(".")
						? !staysInPackage(file, specifier.split("?")[0])
						: specifier.startsWith("@/") ||
							(specifier.startsWith("@classicy/classicy") &&
								specifier !== "@classicy/classicy"),
				)
				.map((specifier) => `${file}: ${specifier}`),
		);
		expect(offenders).toEqual([]);
	});

	it("does import the core as @classicy/classicy", () =>
		expect(moduleSpecifiers("index.ts")).toContain("@classicy/classicy"));
});

describe("Platinum's SCSS", () => {
	const files = sourceFiles(/\.scss$/);
	const uses = (file: string) =>
		[
			...readFileSync(path.join(srcDir, file), "utf8").matchAll(
				/@(?:use|forward|import)\s+["']([^"']+)["']/g,
			),
		].map((match) => match[1]);

	it("uses the vocabulary as pkg:@classicy/classicy/scss/<module>", () => {
		const offenders = files.flatMap((file) =>
			uses(file)
				.filter(
					(url) =>
						!url.startsWith("sass:") &&
						!/^pkg:@classicy\/classicy\/scss\/[a-z]+$/.test(url) &&
						(url.includes(":") || !staysInPackage(file, url)),
				)
				.map((url) => `${file}: ${url}`),
		);
		expect(offenders).toEqual([]);
	});

	it("does use the vocabulary through pkg:", () =>
		expect(uses("styles/_mixins.scss")).toEqual(
			expect.arrayContaining([
				"pkg:@classicy/classicy/scss/color",
				"pkg:@classicy/classicy/scss/layout",
			]),
		));
});
