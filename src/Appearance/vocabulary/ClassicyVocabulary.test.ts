import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";
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
		const known = new Set<string>();
		for (const [name, parts] of Object.entries<string[]>(json.components)) {
			const root: string = json.roots?.[name] ?? `classicy${name}`;
			known.add(root);
			for (const part of parts) known.add(`${root}${part}`);
		}
		for (const extras of Object.values<string[]>(json.extraClasses ?? {})) {
			for (const extra of extras) known.add(extra);
		}
		const skipped = /(\.(test|stories)\.tsx$|__tests__|ScreenSaver\/savers\/)/;
		const unknown = new Set<string>();
		const src = resolve(process.cwd(), "src");
		for (const rel of readdirSync(src, { recursive: true }) as string[]) {
			if (!rel.endsWith(".tsx") || skipped.test(rel)) continue;
			const text = readFileSync(resolve(src, rel), "utf8");
			for (const match of text.matchAll(/"(classicy[A-Z]\w+)/g)) {
				if (!known.has(match[1])) unknown.add(match[1]);
			}
		}
		expect([...unknown].sort()).toEqual([]);
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
