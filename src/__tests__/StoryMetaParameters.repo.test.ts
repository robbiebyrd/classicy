import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * A story file's meta keeps its `parameters` (integration review G round 3).
 *
 * Storybook writes a JSDoc comment above the meta into
 * `parameters.docs.description.component` when it compiles the file
 * (`enrichCsfMeta`). It merges only into object literals: where `parameters`
 * is anything else (`parameters: desktopParameters`) it appends a second
 * `parameters` key holding the description alone, and the last key wins, so
 * the story loses `layout: "fullscreen"` and `classicy: { desktop: true }`
 * and draws on Storybook's plain frame, with no desktop around it. The
 * Application Switcher's and the Notification Manager's stories drew
 * nothing that way. One level down, a `parameters` literal that spreads a
 * helper and has no `docs` literal gets a new `docs` key that replaces the
 * helper's.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");

const STORIES = execFileSync(
	"git",
	[
		"ls-files",
		"-z",
		"--cached",
		"--others",
		"--exclude-standard",
		"--",
		"*.stories.tsx",
		"*.stories.ts",
	],
	{ cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
)
	.split("\0")
	.filter(Boolean);

/** An expression without its `satisfies`, `as` or parentheses. */
const unwrap = (node: ts.Expression): ts.Expression =>
	ts.isSatisfiesExpression(node) ||
	ts.isAsExpression(node) ||
	ts.isParenthesizedExpression(node)
		? unwrap(node.expression)
		: node;

const named = (object: ts.ObjectLiteralExpression, name: string) =>
	object.properties.find(
		(property) =>
			(ts.isPropertyAssignment(property) ||
				ts.isShorthandPropertyAssignment(property)) &&
			(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
			property.name.text === name,
	);

const hasSpread = (object: ts.ObjectLiteralExpression) =>
	object.properties.some(ts.isSpreadAssignment);

/**
 * What Storybook's description would replace in `file`'s meta, or
 * `undefined`: the statement that declares the meta (or exports it by
 * default) has a JSDoc comment above it, and `parameters`, or `docs` under
 * it, is not an object literal the description can be merged into.
 */
const storyMetaParametersProblem = (
	file: string,
	text: string,
): string | undefined => {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
	const exported = source.statements.find(ts.isExportAssignment);
	if (!exported) return undefined;
	let statement: ts.Statement = exported;
	let value = unwrap(exported.expression);
	if (ts.isIdentifier(value)) {
		const name = value.text;
		for (const candidate of source.statements) {
			if (!ts.isVariableStatement(candidate)) continue;
			const declaration = candidate.declarationList.declarations.find(
				(d) => ts.isIdentifier(d.name) && d.name.text === name,
			);
			if (!declaration?.initializer) continue;
			statement = candidate;
			value = unwrap(declaration.initializer);
		}
	}
	if (!ts.isObjectLiteralExpression(value)) return undefined;
	const described = (
		ts.getLeadingCommentRanges(text, statement.getFullStart()) ?? []
	).some(
		(range) =>
			range.kind === ts.SyntaxKind.MultiLineCommentTrivia &&
			text.startsWith("/**", range.pos),
	);
	if (!described) return undefined;
	const parameters = named(value, "parameters");
	if (!parameters)
		return hasSpread(value)
			? "the meta spreads another object and has no `parameters` literal: the description's `parameters` replaces the spread's"
			: undefined;
	if (
		!ts.isPropertyAssignment(parameters) ||
		!ts.isObjectLiteralExpression(unwrap(parameters.initializer))
	)
		return "`parameters` is not an object literal: the description's `parameters` replaces it";
	const literal = unwrap(parameters.initializer) as ts.ObjectLiteralExpression;
	const docs = named(literal, "docs");
	if (!docs)
		return hasSpread(literal)
			? "`parameters` spreads another object and has no `docs` literal: the description's `docs` replaces the spread's"
			: undefined;
	if (
		!ts.isPropertyAssignment(docs) ||
		!ts.isObjectLiteralExpression(unwrap(docs.initializer))
	)
		return "`parameters.docs` is not an object literal: the description's `docs` replaces it";
	return undefined;
};

describe("a story file's meta parameters", () => {
	it("finds story files", () => {
		expect(STORIES.length).toBeGreaterThan(50);
		expect(STORIES).toContain(
			"src/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcher.stories.tsx",
		);
	});

	it("are never replaced by the description Storybook writes from the meta's comment", () => {
		const problems = STORIES.flatMap((file) => {
			const problem = storyMetaParametersProblem(
				file,
				readFileSync(path.join(ROOT, file), "utf8"),
			);
			return problem ? [`${file}: ${problem}`] : [];
		});
		expect(problems).toEqual([]);
	});

	it("tells a meta whose parameters would be replaced from one that keeps them", () => {
		const meta = (comment: string, body: string) =>
			`import { desktopParameters } from "@sb/helpers";\n${comment}\nconst meta = ${body} satisfies Meta;\nexport default meta;\n`;
		const doc = "/** The component, described. */";
		const problem = (comment: string, body: string) =>
			storyMetaParametersProblem("x.stories.tsx", meta(comment, body));
		// The defect: a described meta whose parameters are a reference.
		expect(
			problem(doc, '{ title: "A", parameters: desktopParameters }'),
		).toMatch(/`parameters` is not an object literal/);
		expect(problem(doc, '{ title: "A", parameters }')).toMatch(
			/`parameters` is not an object literal/,
		);
		// One level down: the description's `docs` replaces a spread's.
		expect(
			problem(doc, '{ title: "A", parameters: { ...desktopParameters } }'),
		).toMatch(/no `docs` literal/);
		expect(
			problem(
				doc,
				'{ title: "A", parameters: { ...desktopParameters, docs: desktopParameters.docs } }',
			),
		).toMatch(/`parameters.docs` is not an object literal/);
		expect(problem(doc, '{ ...base, title: "A" }')).toMatch(
			/no `parameters` literal/,
		);
		// Kept: literals all the way down, or nothing to merge a description into.
		expect(
			problem(
				doc,
				'{ title: "A", parameters: { ...desktopParameters, docs: { ...desktopParameters.docs } } }',
			),
		).toBeUndefined();
		expect(
			problem(doc, '{ title: "A", parameters: { layout: "fullscreen" } }'),
		).toBeUndefined();
		expect(problem(doc, '{ title: "A" }')).toBeUndefined();
		// No description to write: a line comment, or none.
		expect(
			problem(
				"// Not a description.",
				'{ title: "A", parameters: desktopParameters }',
			),
		).toBeUndefined();
		expect(
			problem("", '{ title: "A", parameters: desktopParameters }'),
		).toBeUndefined();
		// A default export of the literal itself.
		expect(
			storyMetaParametersProblem(
				"x.stories.tsx",
				`${doc}\nexport default { title: "A", parameters: desktopParameters };\n`,
			),
		).toMatch(/`parameters` is not an object literal/);
	});
});
