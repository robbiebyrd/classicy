import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
	CLASSICY_COMPONENT,
	CLASSICY_STATE,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import { generateVocabulary } from "../../../bin/generate-vocabulary.ts";

const dir = resolve(process.cwd(), "src/Appearance/vocabulary");
const read = (file: string) => readFileSync(resolve(dir, file), "utf8");
const json = JSON.parse(read("ClassicyVocabulary.json"));

/** `classicy[A-Z]…` tokens in literals that are not class names, with why. */
const NOT_CLASSES: Record<string, string> = {
	classicyDateTimeManagerEventHandler:
		"classicyLog subsystem name (ClassicyDateAndTimeEventHandler.ts)",
	classicyPath:
		"metadata key on a file-dialog item, not a class (ClassicyFileDialogVolume.ts)",
	classicyStartupScreenShown:
		"sessionStorage key (ClassicyStartupScreenSession.ts)",
};

/**
 * The string literals of a union type, read from the source: the type alias
 * `name` in `file`, or `Owner.prop` for a property of the type `Owner`
 * declares. A member naming another alias is followed, in the same file or
 * through an `@/…` import.
 */
function stringUnion(file: string, name: string): string[] {
	const parse = (rel: string) => {
		const full = [".tsx", ".ts"]
			.map((ext) => resolve(process.cwd(), "src", `${rel}${ext}`))
			.find((f) => existsSync(f));
		if (!full) throw new Error(`no module src/${rel}`);
		return ts.createSourceFile(
			full,
			readFileSync(full, "utf8"),
			ts.ScriptTarget.Latest,
			true,
		);
	};
	const declaration = (source: ts.SourceFile, alias: string) => {
		const found = source.statements.find(
			(st): st is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
				(ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) &&
				st.name.text === alias,
		);
		if (found) return { source, node: found as ts.Node };
		for (const st of source.statements) {
			if (!ts.isImportDeclaration(st)) continue;
			const bindings = st.importClause?.namedBindings;
			const specifier = (st.moduleSpecifier as ts.StringLiteral).text;
			if (
				bindings &&
				ts.isNamedImports(bindings) &&
				bindings.elements.some((e) => e.name.text === alias) &&
				specifier.startsWith("@/")
			)
				return declaration(parse(specifier.slice(2)), alias);
		}
		throw new Error(`no type ${alias} in ${source.fileName}`);
	};
	const literals = (source: ts.SourceFile, node: ts.TypeNode): string[] => {
		if (ts.isUnionTypeNode(node))
			return node.types.flatMap((t) => literals(source, t));
		if (ts.isParenthesizedTypeNode(node)) return literals(source, node.type);
		if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal))
			return [node.literal.text];
		if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
			const found = declaration(source, node.typeName.text);
			if (ts.isTypeAliasDeclaration(found.node))
				return literals(found.source, found.node.type);
		}
		throw new Error(`not a string-literal union: ${node.getText(source)}`);
	};
	const [alias, prop] = name.split(".");
	const { source, node } = declaration(parse(file), alias);
	if (!prop) {
		if (!ts.isTypeAliasDeclaration(node))
			throw new Error(`${alias} is not a type alias`);
		return literals(source, node.type);
	}
	let property: ts.PropertySignature | undefined;
	const visit = (n: ts.Node) => {
		if (ts.isPropertySignature(n) && n.name.getText(source) === prop)
			property ??= n;
		ts.forEachChild(n, visit);
	};
	visit(node);
	if (!property?.type) throw new Error(`no property ${name}`);
	return literals(source, property.type);
}

/** `small` → `Small`, as the class names spell a union's members. */
const capitalized = (values: string[]): string[] =>
	values.map((v) => `${v.charAt(0).toUpperCase()}${v.slice(1)}`).sort();

/** The palette tokens ClassicyPixelArt.scss declares classes for. */
const pixelArtTokens = (): string[] =>
	[
		...readFileSync(
			resolve(
				process.cwd(),
				"src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.scss",
			),
			"utf8",
		).matchAll(/^\.classicyPixel(\w)\s*\{/gm),
	]
		.map((m) => m[1])
		.sort();

const BEVEL = "SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
const POPUP = "SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

/**
 * Class prefixes completed by a template interpolation, with every suffix the
 * code can produce, derived from what the code interpolates (a union type,
 * the palette) so a new member is checked without editing this list. `""`
 * means the token is a whole class and the interpolation appends a
 * space-separated one.
 */
const TEMPLATE_FAMILIES: Record<string, string[]> = {
	// `classicyBevelButtonArrow${popupArrow === "large" ? "Large" : "Small"}`
	classicyBevelButtonArrow: capitalized(
		stringUnion(BEVEL, "ClassicyBevelButtonProps.popupArrow"),
	),
	// `classicyBevelButtonMode${capitalized mode}`
	classicyBevelButtonMode: capitalized(
		stringUnion(BEVEL, "ClassicyBevelButtonMode"),
	),
	// `classicyPixel${token}`, one class per palette token
	classicyPixel: pixelArtTokens(),
	// `classicyPopUpMenuSize${capitalized size}`
	classicyPopUpMenuSize: capitalized(
		stringUnion(POPUP, "ClassicyPopUpMenuSize"),
	),
	// `classicyScreenSaverOverlay${transparent ? " …Transparent" : ""}`
	classicyScreenSaverOverlay: [""],
};

const TOKEN = /(?<![\w$])classicy[A-Z]\w*/g;
// The screen savers Platinum ships (its src/screenSavers/, plan 0016-vbq
// §2.1): ported After Dark markup, outside the vocabulary.
const SKIPPED = /(\.(test|stories)\.tsx?$|\.d\.ts$|__tests__|^screenSavers\/)/;

function declaredClasses(vocabulary: typeof json): Set<string> {
	const known = new Set<string>();
	for (const [name, parts] of Object.entries<string[]>(vocabulary.components)) {
		const root: string = vocabulary.roots?.[name] ?? `classicy${name}`;
		known.add(root);
		for (const part of parts) known.add(`${root}${part}`);
	}
	for (const extras of Object.values<string[]>(vocabulary.extraClasses ?? {})) {
		for (const extra of extras) known.add(extra);
	}
	return known;
}

/**
 * Every `classicy[A-Z]…` token in the string and template literals and the
 * object-literal keys (classNames maps) of src's .ts/.tsx modules. A token
 * that ends a template chunk right before `${…}` is reported as a prefix.
 */
function scanClassicyTokens(): { tokens: Set<string>; prefixes: Set<string> } {
	scanCache ??= scanSourceTree();
	return scanCache;
}

// The scan parses every src module (1.4–2.9 s alone), so the two tests that
// need it share one result and get a timeout sized for a loaded machine;
// vitest's 5 s default timed out at load averages of 33–43 on 16 cores.
const SCAN_TIMEOUT_MS = 60_000;
let scanCache: ReturnType<typeof scanSourceTree> | undefined;

function scanSourceTree(): { tokens: Set<string>; prefixes: Set<string> } {
	const tokens = new Set<string>();
	const prefixes = new Set<string>();
	const collect = (text: string, beforeInterpolation: boolean) => {
		for (const match of text.matchAll(TOKEN)) {
			const atEnd = match.index + match[0].length === text.length;
			(beforeInterpolation && atEnd ? prefixes : tokens).add(match[0]);
		}
	};
	const visit = (node: ts.Node) => {
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
			collect(node.text, false);
		} else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) {
			collect(node.text, true);
		} else if (ts.isTemplateTail(node)) {
			collect(node.text, false);
		} else if (
			ts.isPropertyAssignment(node) &&
			ts.isObjectLiteralExpression(node.parent) &&
			ts.isIdentifier(node.name)
		) {
			collect(node.name.text, false);
		}
		ts.forEachChild(node, visit);
	};
	// The core's src and each workspace Appearance Package's (Platinum's,
	// plan 0015-kxa §3.1).
	const packages = resolve(process.cwd(), "packages/appearance");
	const roots = [
		resolve(process.cwd(), "src"),
		...readdirSync(packages)
			.sort()
			.map((id) => resolve(packages, id, "src"))
			.filter((dir) => existsSync(dir)),
	];
	for (const src of roots)
		for (const rel of readdirSync(src, { recursive: true }) as string[]) {
			if (!/\.tsx?$/.test(rel) || SKIPPED.test(rel)) continue;
			const file = ts.createSourceFile(
				rel,
				readFileSync(resolve(src, rel), "utf8"),
				ts.ScriptTarget.Latest,
				true,
				rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
			);
			visit(file);
		}
	return { tokens, prefixes };
}

describe("ClassicyVocabulary", () => {
	it("CLASSICY_STATE has the 15 contract states", () => {
		expect(Object.keys(CLASSICY_STATE)).toEqual([
			"active",
			"inactive",
			"disabled",
			"selected",
			"pressed",
			"focused",
			"hover",
			"collapsed",
			"open",
			"dragging",
			"error",
			"default",
			"checked",
			"mixed",
			"expanded",
		]);
	});

	it("CLASSICY_STATE.pressed === 'pressed'", () => {
		expect(CLASSICY_STATE.pressed).toBe("pressed");
	});

	it("classicyStateClasses joins truthy states in vocabulary order", () => {
		expect(
			classicyStateClasses({ pressed: true, disabled: false, active: true }),
		).toBe("active pressed");
	});

	it("classicyStateClasses returns '' for no states", () => {
		expect(classicyStateClasses({})).toBe("");
	});

	it("CLASSICY_COMPONENT contains Window, Button, Alert, DesktopMenuBar", () => {
		for (const name of ["Window", "Button", "Alert", "DesktopMenuBar"]) {
			expect(CLASSICY_COMPONENT).toHaveProperty(name);
		}
	});

	it("CLASSICY_COMPONENT values are root classes", () => {
		expect(CLASSICY_COMPONENT.Button).toBe("classicyButton");
		expect(CLASSICY_COMPONENT.Tabs).toBe("classicyTabContainer");
	});

	it(
		"every classicy class literal in src resolves to the vocabulary",
		() => {
			const known = declaredClasses(json);
			const { tokens, prefixes } = scanClassicyTokens();
			const unknown = [...tokens].filter(
				(token) => !known.has(token) && !(token in NOT_CLASSES),
			);
			expect(unknown.sort()).toEqual([]);
			// A token that runs into a `${…}` is a class prefix: its family must be
			// listed below, and every class it can produce must be declared.
			expect([...prefixes].sort()).toEqual(
				Object.keys(TEMPLATE_FAMILIES).sort(),
			);
			const undeclared = Object.entries(TEMPLATE_FAMILIES).flatMap(
				([prefix, suffixes]) =>
					suffixes.map((s) => `${prefix}${s}`).filter((c) => !known.has(c)),
			);
			expect(undeclared).toEqual([]);
		},
		SCAN_TIMEOUT_MS,
	);

	it(
		"the coverage scan fails when a declared part is removed",
		() => {
			const trimmed = structuredClone(json);
			trimmed.components.Pager = trimmed.components.Pager.filter(
				(part: string) => part !== "ArrowNext",
			);
			const known = declaredClasses(trimmed);
			const { tokens } = scanClassicyTokens();
			expect([...tokens].filter((token) => !known.has(token))).toContain(
				"classicyPagerArrowNext",
			);
		},
		SCAN_TIMEOUT_MS,
	);

	it("TEMPLATE_FAMILIES are read from the unions and palette they interpolate", () => {
		// Not their full lists (a new member must not need an edit here): that
		// each is read, a local member and an imported alias's alike.
		expect(TEMPLATE_FAMILIES.classicyBevelButtonArrow).toContain("Large");
		expect(TEMPLATE_FAMILIES.classicyBevelButtonMode).toContain("Popup");
		expect(TEMPLATE_FAMILIES.classicyPixel).toContain("K");
		// "mini" is ClassicyPopUpMenuSize's own; "small" comes through the
		// imported ClassicyControlLabelSize.
		expect(TEMPLATE_FAMILIES.classicyPopUpMenuSize).toEqual(
			expect.arrayContaining(["Mini", "Small"]),
		);
		expect(() => stringUnion(BEVEL, "ClassicyBevelButtonNope")).toThrow(
			"no type ClassicyBevelButtonNope",
		);
	});

	it("classicy-state() returns the class selector and rejects an unknown state at compile time", () => {
		const compile = (state: string) =>
			sass.compileString(
				`@use "vocabulary" as v;\n.classicyButton#{v.classicy-state(${state})} { color: red; }`,
				{ loadPaths: [dir], style: "compressed" },
			).css;
		expect(compile("pressed")).toBe(".classicyButton.pressed{color:red}");
		expect(() => compile("bogus")).toThrow(
			"classicy-state: unknown state bogus",
		);
	});

	it("the committed outputs are fresh", () => {
		const { ts, scss } = generateVocabulary(json);
		expect(ts).toBe(read("ClassicyVocabulary.ts"));
		expect(scss).toBe(read("_vocabulary.scss"));
	});
});
