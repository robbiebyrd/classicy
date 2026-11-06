import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// The core project resolves Platinum's `@classicy/classicy` import to
// platinumCoreImports.ts (vitest.config.ts). A value missing there would
// arrive as `undefined` rather than fail the import, so every value Platinum's
// source takes from the core is checked here, against the barrel. Only named
// forms can be checked name by name: a namespace, default or side-effect
// import, an `export *` or a dynamic `import()` of the core is refused, so it
// cannot slip past the shim unchecked.

const PLATINUM_SRC = path.resolve(
	process.cwd(),
	"packages/appearance/platinum/src",
);
const CORE = "@classicy/classicy";

/**
 * The values (not types) one source takes from the core by name, through
 * `import { x }` or `export { x } from`, and every other form it reaches the
 * core by (`refused`), as `<form>` labels.
 */
const platinumCoreReferences = (
	fileName: string,
	text: string,
): { values: string[]; refused: string[] } => {
	const source = ts.createSourceFile(
		fileName,
		text,
		ts.ScriptTarget.Latest,
		true,
	);
	const values: string[] = [];
	const refused: string[] = [];
	const named = (
		elements: ts.NodeArray<ts.ImportSpecifier | ts.ExportSpecifier>,
	) => {
		for (const element of elements)
			if (!element.isTypeOnly)
				values.push((element.propertyName ?? element.name).text);
	};
	const visit = (node: ts.Node) => {
		if (
			ts.isImportDeclaration(node) &&
			ts.isStringLiteral(node.moduleSpecifier) &&
			node.moduleSpecifier.text === CORE
		) {
			const clause = node.importClause;
			if (!clause) refused.push("side-effect import");
			else if (!clause.isTypeOnly) {
				if (clause.name) refused.push("default import");
				const bindings = clause.namedBindings;
				if (bindings && ts.isNamespaceImport(bindings))
					refused.push("namespace import");
				else if (bindings) named(bindings.elements);
			}
		} else if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier) &&
			node.moduleSpecifier.text === CORE
		) {
			if (!node.isTypeOnly) {
				const clause = node.exportClause;
				if (!clause) refused.push("export *");
				else if (ts.isNamespaceExport(clause)) refused.push("export * as");
				else named(clause.elements);
			}
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword
		) {
			const [specifier] = node.arguments;
			if (
				!specifier ||
				!ts.isStringLiteral(specifier) ||
				specifier.text === CORE
			)
				refused.push("dynamic import()");
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return { values, refused };
};

const platinumSources = (): string[] =>
	readdirSync(PLATINUM_SRC, { recursive: true })
		.map(String)
		.filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

describe("platinumCoreReferences", () => {
	it("takes named imports and named re-exports, values only", () =>
		expect(
			platinumCoreReferences(
				"a.ts",
				[
					'import { a, type B, c as d } from "@classicy/classicy";',
					'import type { E } from "@classicy/classicy";',
					'export { f } from "@classicy/classicy";',
					'export type { G } from "@classicy/classicy";',
					'import { h } from "./local";',
				].join("\n"),
			),
		).toEqual({ values: ["a", "c", "f"], refused: [] }));

	it("refuses every form it cannot check by name", () =>
		expect(
			platinumCoreReferences(
				"a.ts",
				[
					'import "@classicy/classicy";',
					'import core from "@classicy/classicy";',
					'import * as all from "@classicy/classicy";',
					'export * from "@classicy/classicy";',
					'export * as again from "@classicy/classicy";',
					'const later = () => import("@classicy/classicy");',
					"const unknown = (name: string) => import(name);",
					'const local = () => import("./local");',
				].join("\n"),
			).refused,
		).toEqual([
			"side-effect import",
			"default import",
			"namespace import",
			"export *",
			"export * as",
			"dynamic import()",
			"dynamic import()",
		]));
});

describe("platinumCoreImports", () => {
	it("Platinum's source reaches the core only in forms the shim can check", () =>
		expect(
			platinumSources().flatMap((file) =>
				platinumCoreReferences(
					file,
					readFileSync(path.join(PLATINUM_SRC, file), "utf8"),
				).refused.map((form) => `${file}: ${form}`),
			),
		).toEqual([]));

	it("re-exports, as the barrel's own, every value Platinum takes from the core", async () => {
		const values = [
			...new Set(
				platinumSources().flatMap(
					(file) =>
						platinumCoreReferences(
							file,
							readFileSync(path.join(PLATINUM_SRC, file), "utf8"),
						).values,
				),
			),
		].sort();
		expect(values).toContain("registerClassicyAppearancePackage");
		const shim: Record<string, unknown> = await import("./platinumCoreImports");
		const barrel: Record<string, unknown> = await import("@/index");
		for (const name of values) {
			expect(shim[name], name).toBeDefined();
			expect(shim[name], name).toBe(barrel[name]);
		}
	}, 60_000);
});
