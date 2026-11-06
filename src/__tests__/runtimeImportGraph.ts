// Test helper: the static runtime import graph of a source module, for tests
// that pin what a module may load. Type-only imports are skipped (the build
// erases them); `import()` calls count. `@classicy/classicy` is the core's
// barrel and `@classicy/appearance-platinum` Platinum's package entry, as the
// build and test configs alias them.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const PLATINUM_SRC = path.join(ROOT, "packages/appearance/platinum/src");

const resolveSpecifier = (from: string, specifier: string): string => {
	const bare = specifier.split("?")[0];
	let base: string;
	if (bare === "@classicy/classicy") base = path.join(SRC, "index.ts");
	else if (bare === "@classicy/appearance-platinum")
		base = path.join(PLATINUM_SRC, "index.ts");
	// Interim (plan 0015-kxa §3.2 retires it): Platinum's old in-core path.
	else if (/^@\/Appearance\/Platinum(?:\/|$)/.test(bare))
		base = path.join(PLATINUM_SRC, bare.slice("@/Appearance/Platinum".length));
	else if (bare.startsWith("@/")) base = path.join(SRC, bare.slice(2));
	else if (bare.startsWith("@img/"))
		base = path.join(ROOT, "assets/img", bare.slice(5));
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
export const runtimeImportGraph = (entry: string): string[] => {
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
