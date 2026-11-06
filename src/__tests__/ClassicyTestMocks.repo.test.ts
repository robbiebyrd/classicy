import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/**
 * No test mocks what does not exist (story 0159-tf5). A `vi.mock` of a module
 * path that no longer resolves tests nothing, and a mocked `ClassicyIcons`
 * object that names an icon path the real tree lost hides the break the real
 * tree would show.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");

const tracked = (): string[] =>
	execFileSync("git", ["ls-files", "-z", "--", "*.test.ts", "*.test.tsx"], {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\0")
		.filter((file) => Boolean(file) && !file.startsWith("docs/"));

type Mock = { file: string; target: string; factory?: ts.Expression };

const mocksIn = (file: string): Mock[] => {
	const text = readFileSync(path.join(ROOT, file), "utf8");
	if (!/\bvi\.(do)?[mM]ock\(/.test(text)) return [];
	const found: Mock[] = [];
	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			node.expression.expression.text === "vi" &&
			["mock", "doMock"].includes(node.expression.name.text) &&
			node.arguments[0] &&
			ts.isStringLiteralLike(node.arguments[0])
		)
			found.push({
				file,
				target: node.arguments[0].text,
				factory: node.arguments[1],
			});
		ts.forEachChild(node, visit);
	};
	visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
	return found;
};

const MOCKS = tracked().flatMap(mocksIn);

const ALIASES: ReadonlyArray<readonly [string, string]> = [
	["@classicy/classicy", "src/index.ts"],
	[
		"@classicy/appearance-platinum",
		"packages/appearance/platinum/src/index.ts",
	],
	["@/", "src/"],
	["@img/", "assets/img/"],
	["@vid/", "assets/vid/"],
];

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", ".json", ".d.ts"];

const isFile = (p: string): boolean => existsSync(p) && statSync(p).isFile();

/** Whether a mocked module path resolves to a file, folder index or package. */
const resolves = ({ file, target }: Mock): boolean => {
	const bare = target.replace(/\?.*$/, "");
	const alias = ALIASES.find(
		([from]) => bare === from || bare.startsWith(from),
	);
	let base: string;
	if (alias)
		base = path.join(
			ROOT,
			alias[1],
			bare === alias[0] ? "" : bare.slice(alias[0].length),
		);
	else if (bare.startsWith("."))
		base = path.resolve(ROOT, path.dirname(file), bare);
	else {
		// A bare package name (or `node:` builtin, or a subpath of a package).
		if (bare.startsWith("node:")) return true;
		const name = bare.startsWith("@")
			? bare.split("/").slice(0, 2).join("/")
			: bare.split("/")[0];
		return [
			path.join(ROOT, "node_modules", name),
			path.join(ROOT, "packages/appearance/platinum/node_modules", name),
		].some((dir) => existsSync(dir));
	}
	return (
		EXTENSIONS.some((ext) => isFile(base + ext)) ||
		["index.ts", "index.tsx", "index.js"].some((index) =>
			isFile(path.join(base, index)),
		)
	);
};

const leaf = (tree: unknown, dotted: string): unknown =>
	dotted
		.split(".")
		.reduce<unknown>(
			(node, key) =>
				node && typeof node === "object"
					? (node as Record<string, unknown>)[key]
					: undefined,
			tree,
		);

/** The dotted paths of an object literal's string leaves; non-literal parts end a path. */
const literalPaths = (node: ts.Expression, prefix = ""): string[] => {
	if (!ts.isObjectLiteralExpression(node)) return prefix ? [prefix] : [];
	return node.properties.flatMap((property) => {
		if (!ts.isPropertyAssignment(property)) return [];
		const name = property.name;
		const key =
			ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null;
		if (key === null) return [];
		return literalPaths(
			property.initializer,
			prefix ? `${prefix}.${key}` : key,
		);
	});
};

/** The `ClassicyIcons: { … }` literal a factory returns, if it is one. */
const mockedIconTree = (factory?: ts.Expression): ts.Expression | undefined => {
	if (!factory) return undefined;
	let tree: ts.Expression | undefined;
	const visit = (node: ts.Node): void => {
		if (
			ts.isPropertyAssignment(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === "ClassicyIcons" &&
			ts.isObjectLiteralExpression(node.initializer)
		)
			tree = node.initializer;
		ts.forEachChild(node, visit);
	};
	visit(factory);
	return tree;
};

describe("no test mocks what does not exist", () => {
	it("finds the mocks it checks", () => {
		expect(MOCKS.length).toBeGreaterThan(400);
	});

	it.each(
		[...new Set(MOCKS.map(({ file }) => file))].sort(),
	)("%s mocks only modules that resolve", (file) => {
		const dead = MOCKS.filter((mock) => mock.file === file && !resolves(mock));
		expect(dead.map(({ target }) => target)).toEqual([]);
	});

	it.each(
		MOCKS.filter(
			({ target, factory }) =>
				/ClassicyIcons$/.test(target) && mockedIconTree(factory),
		).map(({ file, target, factory }) => [file, target, factory] as const),
	)("%s mocks only icon paths the real tree has", (file, _target, factory) => {
		const tree = mockedIconTree(factory);
		const missing = tree
			? literalPaths(tree).filter(
					(dotted) => leaf(ClassicyIcons, dotted) === undefined,
				)
			: [];
		expect(missing, `${file} mocks icon paths ClassicyIcons lacks`).toEqual([]);
	});
});
