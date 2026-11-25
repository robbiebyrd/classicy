import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Windows 98's source reaches the core only through its public API, as
// Platinum's and System 7's do: TypeScript imports `@classicy/classicy`,
// never a core path (`@/…`, or a relative path out of the package) and
// nothing of another Appearance Package (its screen savers are its own, so
// not even Platinum's saver module); SCSS uses the vocabulary as
// `pkg:@classicy/classicy/scss/<module>` and loads nothing outside the
// package. Tests may still import core internals and test helpers.

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

/** Whether a relative specifier from `file` (under src/) stays inside the package. */
const staysInPackage = (file: string, specifier: string) =>
	!path
		.relative(packageDir, path.resolve(srcDir, path.dirname(file), specifier))
		.startsWith("..");

const offendersIn = (file: string, specifiers: string[]) =>
	specifiers
		.filter((specifier) =>
			specifier.startsWith(".")
				? !staysInPackage(file, specifier.split("?")[0])
				: specifier.startsWith("@/") ||
					specifier.startsWith("@classicy/appearance-") ||
					(specifier.startsWith("@classicy/classicy") &&
						specifier !== "@classicy/classicy"),
		)
		.map((specifier) => `${file}: ${specifier}`);

describe("Windows 98's TypeScript", () => {
	const files = sourceFiles(/\.tsx?$/);

	it("covers the registering modules", () =>
		expect(files).toEqual(
			expect.arrayContaining([
				"index.ts",
				"windows98Apps.ts",
				"assets/windows98Assets.ts",
				"assets/windows98Icons.ts",
				"assets/sounds/windows98.ts",
			]),
		));

	it("imports the core only as @classicy/classicy, and nothing of another package", () =>
		expect(
			files.flatMap((file) => offendersIn(file, moduleSpecifiers(file))),
		).toEqual([]));

	it("does import the core as @classicy/classicy", () =>
		expect(moduleSpecifiers("index.ts")).toContain("@classicy/classicy"));

	// The rule itself, on specifiers a source file could hold.
	it("refuses a core path, another package or a file of another package", () =>
		expect(
			offendersIn("index.ts", [
				"@/Appearance/ClassicyAssetRegistry",
				"@classicy/classicy/scss/package",
				"@classicy/appearance-platinum",
				"@classicy/appearance-system7",
				"../../platinum/src/hooks",
				"../../platinum/src/screenSavers/platinumScreenSavers",
				"../../../../src/index",
				"./assets/sounds/windows98",
				"./styles/windows98.scss?inline",
				"@classicy/classicy",
			]),
		).toEqual([
			"index.ts: @/Appearance/ClassicyAssetRegistry",
			"index.ts: @classicy/classicy/scss/package",
			"index.ts: @classicy/appearance-platinum",
			"index.ts: @classicy/appearance-system7",
			"index.ts: ../../platinum/src/hooks",
			"index.ts: ../../platinum/src/screenSavers/platinumScreenSavers",
			"index.ts: ../../../../src/index",
		]));
});

describe("Windows 98's SCSS", () => {
	const files = sourceFiles(/\.scss$/);
	// `@use`, `@forward` and `@import` rules, and `meta.load-css()` calls.
	const uses = (file: string) =>
		[
			...readFileSync(path.join(srcDir, file), "utf8").matchAll(
				/@(?:use|forward|import)\s+["']([^"']+)["']|\bload-css\(\s*["']([^"']+)["']/g,
			),
		].map((match) => match[1] ?? match[2]);

	const offendersIn = (file: string, urls: string[]) =>
		urls
			.filter(
				(url) =>
					!url.startsWith("sass:") &&
					!/^pkg:@classicy\/classicy\/scss\/[a-z]+$/.test(url) &&
					(url.includes(":") || !staysInPackage(file, url)),
			)
			.map((url) => `${file}: ${url}`);

	it("uses the vocabulary as pkg:@classicy/classicy/scss/<module>, and nothing outside the package", () =>
		expect(files.flatMap((file) => offendersIn(file, uses(file)))).toEqual([]));

	// The rule itself, on URLs a stylesheet could hold.
	it("refuses another package's stylesheets and the savers' index", () =>
		expect(
			offendersIn("styles/windows98.scss", [
				"../../../platinum/src/styles/mixins",
				"../../../platinum/src/screenSavers/platinumScreenSavers",
				"../../../system7/src/styles/pixel",
				"pkg:@classicy/appearance-platinum/scss/mixins",
				"pkg:@classicy/classicy/scss/layout",
				"components/Window",
			]),
		).toEqual([
			"styles/windows98.scss: ../../../platinum/src/styles/mixins",
			"styles/windows98.scss: ../../../platinum/src/screenSavers/platinumScreenSavers",
			"styles/windows98.scss: ../../../system7/src/styles/pixel",
			"styles/windows98.scss: pkg:@classicy/appearance-platinum/scss/mixins",
		]));

	it("does use the vocabulary through pkg:", () =>
		expect(uses("styles/windows98.scss")).toContain(
			"pkg:@classicy/classicy/scss/package",
		));
});
