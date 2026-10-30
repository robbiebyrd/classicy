import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Platinum's asset modules are package data: importing them must not load a
 * component or a stylesheet. A component's SCSS alone costs a cold import of
 * a second or more, which `platinumAssets.warnings.test.ts` pays inside its
 * test body. The runtime import graph is walked statically (type-only imports
 * are erased by the build, so they are skipped).
 */

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const resolveSpecifier = (from: string, specifier: string): string => {
	const bare = specifier.split("?")[0];
	let base: string;
	if (bare.startsWith("@/")) base = path.join(SRC, bare.slice(2));
	else if (bare.startsWith(".")) base = path.resolve(path.dirname(from), bare);
	else return `package:${bare}`;
	for (const candidate of [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}/index.ts`,
	]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	throw new Error(`Cannot resolve ${specifier} from ${from}`);
};

const isTypeOnly = (node: ts.ImportDeclaration | ts.ExportDeclaration) => {
	if (ts.isExportDeclaration(node)) return node.isTypeOnly;
	const clause = node.importClause;
	if (!clause) return false;
	if (clause.isTypeOnly) return true;
	const bindings = clause.namedBindings;
	return (
		!clause.name &&
		bindings !== undefined &&
		ts.isNamedImports(bindings) &&
		bindings.elements.length > 0 &&
		bindings.elements.every((element) => element.isTypeOnly)
	);
};

/** The specifiers a module loads at runtime: static imports/re-exports and `import()`. */
const runtimeSpecifiers = (file: string): string[] => {
	const source = ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	const specifiers: string[] = [];
	const visit = (node: ts.Node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			if (!isTypeOnly(node)) specifiers.push(node.moduleSpecifier.text);
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments[0] &&
			ts.isStringLiteral(node.arguments[0])
		) {
			specifiers.push(node.arguments[0].text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specifiers;
};

/** Every module `entry` loads at runtime, as repo-relative paths or `package:<name>`. */
const runtimeImportGraph = (entry: string): string[] => {
	const seen = new Set<string>();
	const walk = (file: string) => {
		if (seen.has(file)) return;
		seen.add(file);
		if (file.startsWith("package:") || !/\.tsx?$/.test(file)) return;
		for (const specifier of runtimeSpecifiers(file)) {
			walk(resolveSpecifier(file, specifier));
		}
	};
	walk(path.join(ROOT, entry));
	return [...seen].map((file) =>
		file.startsWith("package:") ? file : path.relative(ROOT, file),
	);
};

const stylesheets = (graph: string[]) =>
	graph.filter((file) => /\.(s?css|sass)$/.test(file));
const components = (graph: string[]) =>
	graph.filter((file) => file.endsWith(".tsx"));

describe("the Platinum asset modules' import graph", () => {
	it("platinumPixelArt loads only the pixel-art codec, the log and its .txt files", () => {
		const graph = runtimeImportGraph(
			"src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts",
		);
		expect(stylesheets(graph)).toEqual([]);
		expect(components(graph)).toEqual([]);
		expect(graph).not.toContain("package:react");
		expect(graph.filter((file) => !file.endsWith(".txt")).sort()).toEqual([
			"src/Appearance/ClassicyPixelArtSource.internal.ts",
			"src/Appearance/ClassicyPixelArtSource.ts",
			"src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts",
			"src/SystemFolder/SystemResources/Log/ClassicyLog.ts",
		]);
	});

	it("platinumAssets loads no stylesheet and no component", () => {
		const graph = runtimeImportGraph(
			"src/Appearance/Platinum/assets/platinumAssets.ts",
		);
		expect(graph).toContain(
			"src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts",
		);
		expect(stylesheets(graph)).toEqual([]);
		expect(components(graph)).toEqual([]);
	});

	it("the asset registry reads the pixel-art rule from the codec, not the component", () => {
		const graph = runtimeImportGraph("src/Appearance/ClassicyAssetRegistry.ts");
		expect(graph).toContain(
			"src/Appearance/ClassicyPixelArtSource.internal.ts",
		);
		expect(stylesheets(graph)).toEqual([]);
		expect(components(graph)).toEqual([]);
	});
});
