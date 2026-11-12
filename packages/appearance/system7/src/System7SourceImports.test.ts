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
// The one module outside the package it may import is Platinum's screen-saver
// registration module, bundled by relative import (design 0017-6me, "Screen
// savers"; plan 0018-dbd §3.8), and only from index.ts. Nothing else of
// Platinum's TypeScript, so System 7's declarations never reference
// Platinum's files. Its stylesheet may load one Platinum stylesheet, the
// savers' index beside that module (screenSavers/_platinumScreenSavers.scss),
// only from styles/_screenSavers.scss: it loads the savers' own partials, the
// same savers' source, the styles that module's components draw with, and a
// host loading only System 7 needs them in System 7's sheet. Nothing else of
// Platinum's SCSS, a saver partial on its own included.

const srcDir = path.resolve(import.meta.dirname);
const packageDir = path.dirname(srcDir);
const platinumSrc = path.resolve(packageDir, "../platinum/src");

/** The Platinum modules System 7 may import, relative to Platinum's src/. */
const PLATINUM_PATHS: readonly string[] = ["screenSavers/platinumScreenSavers"];

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

/** A relative specifier from `file`, as a path under Platinum's src/. */
const platinumPath = (file: string, specifier: string) =>
	path
		.relative(platinumSrc, resolved(file, specifier))
		.split(path.sep)
		.join("/");

/** Whether a relative specifier from `file` names an allowed Platinum module. */
const isAllowedPlatinumPath = (file: string, specifier: string) =>
	file === "index.ts" &&
	PLATINUM_PATHS.includes(platinumPath(file, specifier).replace(/\.tsx?$/, ""));

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

	it("imports the core only as @classicy/classicy, and nothing of Platinum's but the saver registration module", () =>
		expect(
			files.flatMap((file) => offendersIn(file, moduleSpecifiers(file))),
		).toEqual([]));

	// The savers reach a System 7-only host through this one import.
	it("does import the saver registration module, from index.ts, for its side effect", () => {
		const outside = files.flatMap((file) =>
			moduleSpecifiers(file)
				.filter(
					(specifier) =>
						specifier.startsWith(".") &&
						!staysInPackage(file, specifier.split("?")[0]),
				)
				.map((specifier) => `${file}: ${platinumPath(file, specifier)}`),
		);
		expect(outside).toEqual(["index.ts: screenSavers/platinumScreenSavers"]);
		const index = readFileSync(path.join(srcDir, "index.ts"), "utf8");
		expect(index).toMatch(
			/^import "\.\.\/\.\.\/platinum\/src\/screenSavers\/platinumScreenSavers";$/m,
		);
	});

	it("does import the core as @classicy/classicy", () =>
		expect(moduleSpecifiers("index.ts")).toContain("@classicy/classicy"));

	// The rule itself, on specifiers a source file could hold.
	it("refuses a core path, Platinum's package or a Platinum file but the saver module", () =>
		expect(
			offendersIn("index.ts", [
				"@/Appearance/ClassicyAssetRegistry",
				"@classicy/classicy/scss/package",
				"@classicy/appearance-platinum",
				"../../platinum/src/hooks",
				"../../../../src/index",
				// The savers' other modules: their components and the logo
				// registry come with the module, never imported on their own.
				"../../platinum/src/screenSavers/Logo/ClassicyScreenSaverLogoRegistry",
				"../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish",
				"../../platinum/src/screenSavers/platinumScreenSavers",
				"../../platinum/src/screenSavers/platinumScreenSavers.ts",
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
			"index.ts: ../../platinum/src/screenSavers/Logo/ClassicyScreenSaverLogoRegistry",
			"index.ts: ../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish",
		]));

	// Only index.ts registers the savers.
	it("refuses the saver module from any other file", () =>
		expect(
			offendersIn("hooks.ts", [
				"../../platinum/src/screenSavers/platinumScreenSavers",
			]),
		).toEqual([
			"hooks.ts: ../../platinum/src/screenSavers/platinumScreenSavers",
		]));
});

describe("System 7's SCSS", () => {
	const files = sourceFiles(/\.scss$/);
	// `@use`, `@forward` and `@import` rules, and `meta.load-css()` calls.
	const uses = (file: string) =>
		[
			...readFileSync(path.join(srcDir, file), "utf8").matchAll(
				/@(?:use|forward|import)\s+["']([^"']+)["']|\bload-css\(\s*["']([^"']+)["']/g,
			),
		].map((match) => match[1] ?? match[2]);

	// The one Platinum stylesheet System 7 may load: the savers' index beside
	// their registration module, screenSavers/_platinumScreenSavers.scss,
	// which loads every saver's partial, and only from styles/_screenSavers.scss.
	const PLATINUM_SCSS_PATHS: readonly string[] = [
		"screenSavers/platinumScreenSavers",
	];

	/** A Sass URL under Platinum's src/, its partial `_` and `.scss` dropped. */
	const platinumSassPath = (file: string, url: string) =>
		platinumPath(file, url)
			.replace(/(^|\/)_([^/]+)$/, "$1$2")
			.replace(/\.scss$/, "");

	/** Whether `url`, from `file`, loads the savers' index. */
	const isAllowedPlatinumSass = (file: string, url: string) =>
		file === "styles/_screenSavers.scss" &&
		PLATINUM_SCSS_PATHS.includes(platinumSassPath(file, url));

	const offendersIn = (file: string, urls: string[]) =>
		urls
			.filter(
				(url) =>
					!url.startsWith("sass:") &&
					!/^pkg:@classicy\/classicy\/scss\/[a-z]+$/.test(url) &&
					(url.includes(":") ||
						(!staysInPackage(file, url) && !isAllowedPlatinumSass(file, url))),
			)
			.map((url) => `${file}: ${url}`);

	it("uses the vocabulary as pkg:@classicy/classicy/scss/<module>, and nothing of Platinum's but the savers' index", () =>
		expect(files.flatMap((file) => offendersIn(file, uses(file)))).toEqual([]));

	it("loads the savers' index, from _screenSavers.scss alone, and nothing else outside the package", () => {
		const outside = files.flatMap((file) =>
			uses(file)
				.filter((url) => !url.includes(":") && !staysInPackage(file, url))
				.map((url) => `${file}: ${platinumSassPath(file, url)}`),
		);
		expect(outside).toEqual([
			"styles/_screenSavers.scss: screenSavers/platinumScreenSavers",
		]);
		// The index exists, as a stylesheet.
		expect(
			readFileSync(
				path.join(platinumSrc, "screenSavers/_platinumScreenSavers.scss"),
				"utf8",
			),
		).toMatch(/load-css\("BouncingBall\/ClassicyScreenSaverBouncingBall"\)/);
	});

	// The rule itself, on URLs a stylesheet could hold.
	it("refuses Platinum's other stylesheets, a saver partial on its own, and the index from another file", () =>
		expect([
			...offendersIn("styles/_screenSavers.scss", [
				"../../../platinum/src/styles/mixins",
				"../../../platinum/src/styles/screenSavers",
				"../../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish",
				"pkg:@classicy/appearance-platinum/scss/mixins",
				// The index, however it is spelled.
				"../../../platinum/src/screenSavers/platinumScreenSavers",
				"../../../platinum/src/screenSavers/_platinumScreenSavers.scss",
			]),
			...offendersIn("styles/system7.scss", [
				"../../../platinum/src/screenSavers/platinumScreenSavers",
			]),
		]).toEqual([
			"styles/_screenSavers.scss: ../../../platinum/src/styles/mixins",
			"styles/_screenSavers.scss: ../../../platinum/src/styles/screenSavers",
			"styles/_screenSavers.scss: ../../../platinum/src/screenSavers/Fish/ClassicyScreenSaverFish",
			"styles/_screenSavers.scss: pkg:@classicy/appearance-platinum/scss/mixins",
			"styles/system7.scss: ../../../platinum/src/screenSavers/platinumScreenSavers",
		]));

	it("does use the vocabulary through pkg:", () =>
		expect(uses("styles/system7.scss")).toContain(
			"pkg:@classicy/classicy/scss/package",
		));
});
