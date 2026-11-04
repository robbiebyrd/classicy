import { globSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import * as sass from "sass";
import ts from "typescript";

/**
 * Which Classicy classes can sit on one element, read from the components'
 * JSX so it follows them as they change. Used by the cross-file cascade
 * guard (ClassicyCascade.repo.test.ts): two rules from different
 * stylesheets can only tie on an element whose classes include a subject
 * class of each.
 *
 * Every `className` attribute in src's .tsx modules is one element: the
 * `classicy[A-Z]…` tokens its expression names, through the names it reads
 * and the template prefixes it writes (all branches of a conditional count,
 * so this over-approximates, which only makes the guard stricter). An element whose tag is a Classicy component
 * (`<ClassicyBevelButton className=…>`) forwards its classes to that
 * component's root, so it also carries everything that root can carry: the
 * classes of the elements in the component's own module
 * (`ClassicyBevelButton.tsx`) that name its root class, themselves grown the
 * same way (a help button is a bevel button, square in a toolbar).
 */
export type ClassicyClassSets = string[][];

const TOKEN = /(?<![\w$])classicy[A-Z][\w-]*/g;
// A class written up to an interpolation (`classicyBevelButtonMode${…}`).
const PREFIX = /(?<![\w$])classicy[A-Z][\w-]*$/;
const SKIPPED =
	/(\.(test|stories)\.tsx?$|\.d\.ts$|__tests__|ScreenSaver\/savers\/)/;

type Element = { file: string; tokens: Set<string>; component?: string };

/**
 * The `className` elements of every component module under `src`. A prefix
 * stands for every `known` class it begins (itself included); a name the
 * expression reads (`bevelClass[bevelWidth]`, `sizeClass`) stands for the
 * classes its declaration in the same module names.
 */
/**
 * What a declaration a className expression reads can hand it: a literal
 * (string, template, object or array of them, a conditional), or a
 * function's returned values. Anything else (a hook's result, a portal) is
 * not a class source; reading it would pull in unrelated strings such as
 * the `"classicyDesktop"` element id.
 */
const classValues = (init: ts.Node): ts.Node[] => {
	if (
		ts.isStringLiteral(init) ||
		ts.isNoSubstitutionTemplateLiteral(init) ||
		ts.isTemplateExpression(init) ||
		ts.isObjectLiteralExpression(init) ||
		ts.isArrayLiteralExpression(init) ||
		ts.isConditionalExpression(init) ||
		ts.isBinaryExpression(init) ||
		ts.isParenthesizedExpression(init) ||
		ts.isAsExpression(init) ||
		ts.isSatisfiesExpression(init)
	)
		return [init];
	if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
		if (!ts.isBlock(init.body)) return [init.body];
		const returns: ts.Node[] = [];
		const visit = (n: ts.Node) => {
			if (ts.isReturnStatement(n) && n.expression) returns.push(n.expression);
			else if (!ts.isFunctionLike(n)) ts.forEachChild(n, visit);
		};
		ts.forEachChild(init.body, visit);
		return returns;
	}
	return [];
};

const readElements = (src: string, known: string[]): Element[] => {
	const elements: Element[] = [];
	const expand = (prefix: string, into: Set<string>) => {
		for (const k of known) if (k.startsWith(prefix)) into.add(k);
	};
	const tokensIn = (
		file: ts.SourceFile,
		declarations: Map<string, ts.Node[]>,
		node: ts.Node,
		into: Set<string>,
		seen = new Set<string>(),
	) => {
		const visit = (n: ts.Node) => {
			if (
				ts.isStringLiteral(n) ||
				ts.isNoSubstitutionTemplateLiteral(n) ||
				ts.isTemplateTail(n)
			)
				for (const m of n.text.matchAll(TOKEN)) into.add(m[0]);
			else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n)) {
				const prefix = PREFIX.exec(n.text)?.[0];
				for (const m of n.text.matchAll(TOKEN))
					if (m.index + m[0].length < n.text.length) into.add(m[0]);
				if (prefix) expand(prefix, into);
			} else if (ts.isIdentifier(n) && !seen.has(n.text)) {
				seen.add(n.text);
				for (const init of declarations.get(n.text) ?? [])
					for (const value of classValues(init))
						tokensIn(file, declarations, value, into, seen);
			}
			ts.forEachChild(n, visit);
		};
		visit(node);
	};
	for (const rel of readdirSync(src, { recursive: true }) as string[]) {
		if (!rel.endsWith(".tsx") || SKIPPED.test(rel)) continue;
		const file = ts.createSourceFile(
			rel,
			readFileSync(resolve(src, rel), "utf8"),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		const declarations = new Map<string, ts.Node[]>();
		const collect = (node: ts.Node) => {
			if (
				ts.isVariableDeclaration(node) &&
				ts.isIdentifier(node.name) &&
				node.initializer
			)
				declarations.set(node.name.text, [
					...(declarations.get(node.name.text) ?? []),
					node.initializer,
				]);
			ts.forEachChild(node, collect);
		};
		collect(file);
		const visit = (node: ts.Node) => {
			if (ts.isJsxAttribute(node) && node.name.getText(file) === "className") {
				const owner = node.parent.parent;
				const tag =
					ts.isJsxOpeningElement(owner) || ts.isJsxSelfClosingElement(owner)
						? owner.tagName.getText(file)
						: "";
				const tokens = new Set<string>();
				if (node.initializer)
					tokensIn(file, declarations, node.initializer, tokens);
				const component = /^Classicy[A-Z]\w*$/.test(tag)
					? tag.slice("Classicy".length)
					: undefined;
				if (tokens.size || component)
					elements.push({ file: rel, tokens, component });
			}
			ts.forEachChild(node, visit);
		};
		visit(file);
	}
	return elements;
};

/**
 * Every class a stylesheet under src names (`src/**\/*.scss`, partials
 * skipped, the Appearance Packages' included), compiled, and every class
 * the vocabulary declares: what a template prefix may expand to.
 */
export const classicyStylesheetClasses = (root = process.cwd()): string[] => {
	const known = new Set<string>();
	for (const rel of globSync("src/**/*.scss", { cwd: root })) {
		const file = rel.split(sep).join("/");
		if (basename(file).startsWith("_")) continue;
		const css = sass.compile(resolve(root, file), {
			style: "expanded",
			loadPaths: [resolve(root, "src")],
		}).css;
		for (const m of css.matchAll(/\.(classicy[A-Z][\w-]*)/g)) known.add(m[1]);
	}
	// And every class the vocabulary declares, styled or not.
	const vocabulary = JSON.parse(
		readFileSync(
			resolve(root, "src/Appearance/vocabulary/ClassicyVocabulary.json"),
			"utf8",
		),
	) as {
		roots?: Record<string, string>;
		components: Record<string, string[]>;
		extraClasses?: Record<string, string[]>;
	};
	for (const [name, parts] of Object.entries(vocabulary.components)) {
		const rootClass = vocabulary.roots?.[name] ?? `classicy${name}`;
		known.add(rootClass);
		for (const part of parts) known.add(`${rootClass}${part}`);
	}
	for (const extras of Object.values(vocabulary.extraClasses ?? {}))
		for (const extra of extras) known.add(extra);
	return [...known].sort();
};

/**
 * The class sets of the elements Classicy's components render, as described
 * above. `roots` maps a component name (`BevelButton`) to its root class.
 */
export const classicyClassSets = (
	roots: Record<string, string>,
	known: string[],
	src = resolve(process.cwd(), "src"),
): ClassicyClassSets => {
	const elements = readElements(src, known);
	const closures = new Map<string, Set<string>>();
	/** Every class the root of component `name` can carry. */
	const closure = (name: string, seen: Set<string>): Set<string> => {
		const cached = closures.get(name);
		if (cached) return cached;
		const root = roots[name];
		const out = new Set<string>(root ? [root] : []);
		if (!root || seen.has(name)) return out;
		seen.add(name);
		const own = new RegExp(`(^|[\\/])Classicy${name}\\.tsx$`);
		for (const element of elements)
			if (own.test(element.file) && element.tokens.has(root)) {
				for (const token of element.tokens) out.add(token);
				if (element.component)
					for (const token of closure(element.component, seen)) out.add(token);
			}
		seen.delete(name);
		closures.set(name, out);
		return out;
	};
	for (const element of elements)
		if (element.component)
			for (const token of closure(element.component, new Set()))
				element.tokens.add(token);
	return elements.map((e) => [...e.tokens].sort()).filter((s) => s.length);
};

/** `a` and `b` can sit on one element: equal, or together in some set. */
export const classicyClassesMeet = (
	sets: ClassicyClassSets,
): ((a: string, b: string) => boolean) => {
	const pairs = new Set<string>();
	for (const set of sets)
		for (const a of set) for (const b of set) pairs.add(`${a} ${b}`);
	return (a, b) => a === b || pairs.has(`${a} ${b}`);
};
