import { readdirSync, readFileSync } from "node:fs";
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
 * Class prefixes completed by a template interpolation, with every suffix the
 * code can produce. `""` means the token is a whole class and the
 * interpolation appends a space-separated one.
 */
const TEMPLATE_FAMILIES: Record<string, string[]> = {
	// popupArrow: "small" | "large" (ClassicyBevelButton.tsx)
	classicyBevelButtonArrow: ["Large", "Small"],
	// ClassicyBevelButtonMode, capitalized
	classicyBevelButtonMode: ["Popup", "Push", "Radio", "Toggle"],
	// The ClassicyPixelArt palette tokens (ClassicyPixelArt.scss)
	classicyPixel: [
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"K",
		"W",
		"b",
		"c",
		"d",
		"m",
		"n",
	],
	// ClassicyPopUpMenuSize, capitalized
	classicyPopUpMenuSize: ["Large", "Medium", "Mini", "Small"],
	// `classicyScreenSaverOverlay${transparent ? " …Transparent" : ""}`
	classicyScreenSaverOverlay: [""],
};

const TOKEN = /(?<![\w$])classicy[A-Z]\w*/g;
const SKIPPED =
	/(\.(test|stories)\.tsx?$|\.d\.ts$|__tests__|ScreenSaver\/savers\/)/;

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
	const src = resolve(process.cwd(), "src");
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

	it("every classicy class literal in src resolves to the vocabulary", () => {
		const known = declaredClasses(json);
		const { tokens, prefixes } = scanClassicyTokens();
		const unknown = [...tokens].filter(
			(token) => !known.has(token) && !(token in NOT_CLASSES),
		);
		expect(unknown.sort()).toEqual([]);
		// A token that runs into a `${…}` is a class prefix: its family must be
		// listed below, and every class it can produce must be declared.
		expect([...prefixes].sort()).toEqual(Object.keys(TEMPLATE_FAMILIES).sort());
		const undeclared = Object.entries(TEMPLATE_FAMILIES).flatMap(
			([prefix, suffixes]) =>
				suffixes.map((s) => `${prefix}${s}`).filter((c) => !known.has(c)),
		);
		expect(undeclared).toEqual([]);
	});

	it("the coverage scan fails when a declared part is removed", () => {
		const trimmed = structuredClone(json);
		trimmed.components.Pager = trimmed.components.Pager.filter(
			(part: string) => part !== "ArrowNext",
		);
		const known = declaredClasses(trimmed);
		const { tokens } = scanClassicyTokens();
		expect([...tokens].filter((token) => !known.has(token))).toContain(
			"classicyPagerArrowNext",
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
