import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// System 7's source reaches the core only through its public API, as
// Platinum's does (PlatinumSourceImports.test.ts): TypeScript imports
// `@classicy/classicy`, never a core path (`@/…`, or a relative path out of
// the package), so its build externalizes the core and shares its registries;
// SCSS uses the vocabulary as `pkg:@classicy/classicy/scss/<module>`. Tests
// may still import core internals and test helpers.
//
// The one path outside the package it may import is Platinum's screen-saver
// registration module, bundled by relative import (design 0017-6me, "Screen
// savers"; plan 0018-dbd §3.8 adds it to PLATINUM_PATHS). Nothing else of
// Platinum's, so System 7's declarations never reference Platinum's files.

const srcDir = path.resolve(import.meta.dirname);
const packageDir = path.dirname(srcDir);
const platinumSrc = path.resolve(packageDir, "../platinum/src");

/** The Platinum modules System 7 may import, relative to Platinum's src/. */
const PLATINUM_PATHS: readonly string[] = [];

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

/** Where a relative specifier from `file` (under src/) resolves. */
const resolved = (file: string, specifier: string) =>
	path.resolve(srcDir, path.dirname(file), specifier);

/** Whether a relative specifier from `file` stays inside the package. */
const staysInPackage = (file: string, specifier: string) =>
	!path.relative(packageDir, resolved(file, specifier)).startsWith("..");

/** Whether a relative specifier from `file` names an allowed Platinum module. */
const isAllowedPlatinumPath = (file: string, specifier: string) =>
	PLATINUM_PATHS.includes(
		path
			.relative(platinumSrc, resolved(file, specifier))
			.split(path.sep)
			.join("/")
			.replace(/\.tsx?$/, ""),
	);

const offendersIn = (file: string, specifiers: string[]) =>
	specifiers
		.filter((specifier) =>
			specifier.startsWith(".")
				? !staysInPackage(file, specifier.split("?")[0]) &&
					!isAllowedPlatinumPath(file, specifier.split("?")[0])
				: specifier.startsWith("@/") ||
					specifier.startsWith("@classicy/appearance-") ||
					(specifier.startsWith("@classicy/classicy") &&
						specifier !== "@classicy/classicy"),
		)
		.map((specifier) => `${file}: ${specifier}`);

describe("System 7's TypeScript", () => {
	const files = sourceFiles(/\.tsx?$/);

	it("covers the registering modules", () =>
		expect(files).toEqual(
			expect.arrayContaining([
				"index.ts",
				"assets/system7Assets.ts",
				"assets/sounds/system7.ts",
			]),
		));

	it("imports the core only as @classicy/classicy, and nothing of Platinum's", () =>
		expect(
			files.flatMap((file) => offendersIn(file, moduleSpecifiers(file))),
		).toEqual([]));

	it("does import the core as @classicy/classicy", () =>
		expect(moduleSpecifiers("index.ts")).toContain("@classicy/classicy"));

	// The rule itself, on specifiers a source file could hold.
	it("refuses a core path, Platinum's package or a Platinum file", () =>
		expect(
			offendersIn("index.ts", [
				"@/Appearance/ClassicyAssetRegistry",
				"@classicy/classicy/scss/package",
				"@classicy/appearance-platinum",
				"../../platinum/src/hooks",
				"../../../../src/index",
				"./assets/system7Assets",
				"./styles/system7.scss?inline",
				"@classicy/classicy",
			]),
		).toEqual([
			"index.ts: @/Appearance/ClassicyAssetRegistry",
			"index.ts: @classicy/classicy/scss/package",
			"index.ts: @classicy/appearance-platinum",
			"index.ts: ../../platinum/src/hooks",
			"index.ts: ../../../../src/index",
		]));
});

describe("System 7's SCSS", () => {
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
		expect(uses("styles/system7.scss")).toContain(
			"pkg:@classicy/classicy/scss/package",
		));
});
