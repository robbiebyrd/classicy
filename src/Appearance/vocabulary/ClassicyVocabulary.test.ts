import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

	it("the committed outputs are fresh", () => {
		const { ts, scss } = generateVocabulary(json);
		expect(ts).toBe(read("ClassicyVocabulary.ts"));
		expect(scss).toBe(read("_vocabulary.scss"));
	});
});
