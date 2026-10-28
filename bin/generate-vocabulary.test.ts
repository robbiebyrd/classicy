import { describe, expect, it } from "vitest";
import {
	generateVocabulary,
	validateVocabulary,
} from "./generate-vocabulary.ts";

const attributes = {
	"data-classicy-control": [],
	"data-classicy-role": [],
	"data-classicy-part": [],
};

const sameInput = {
	components: { Button: [] },
	states: ["pressed", "disabled"],
	attributes,
};

describe("generateVocabulary", () => {
	it("emits CLASSICY_STATE with every state as key and value", () => {
		const { ts } = generateVocabulary(sameInput);
		expect(ts).toContain('pressed: "pressed"');
		expect(ts).toContain(
			"export type ClassicyState = keyof typeof CLASSICY_STATE",
		);
		expect(ts).toContain('Button: "Button"');
		expect(ts.startsWith("// generated — do not edit")).toBe(true);
	});

	it("emits $classicy-states and classicy-state()", () => {
		const { scss } = generateVocabulary(sameInput);
		expect(scss).toContain("$classicy-states: (pressed, disabled);");
		expect(scss).toContain("@function classicy-state($name)");
		expect(scss.startsWith("// generated — do not edit")).toBe(true);
	});

	it("rejects a state that equals a root or part class", () => {
		expect(
			validateVocabulary({
				components: { Button: ["Pressed"] },
				states: ["classicybuttonpressed"],
				attributes,
			}),
		).toEqual([
			'state "classicybuttonpressed" collides with part class classicyButtonPressed',
		]);
		expect(
			validateVocabulary({
				components: { Pressed: [] },
				states: ["classicypressed"],
				attributes,
			}),
		).toEqual([
			'state "classicypressed" collides with root class classicyPressed',
		]);
	});

	it("rejects duplicate and malformed state names", () => {
		expect(
			validateVocabulary({
				components: { Button: [] },
				states: ["open", "open"],
				attributes,
			}),
		).toEqual(['duplicate state "open"']);
		expect(
			validateVocabulary({
				components: { Button: [] },
				states: ["Open"],
				attributes,
			}),
		).toEqual(['state "Open" must match /^[a-z][a-z0-9-]*$/']);
	});

	it("honors a root override when checking part collisions", () => {
		expect(
			validateVocabulary({
				roots: { Tabs: "classicyTabContainer" },
				components: { Tabs: ["Holder"] },
				states: ["classicytabcontainerholder"],
				attributes,
			}),
		).toEqual([
			'state "classicytabcontainerholder" collides with part class classicyTabContainerHolder',
		]);
	});

	it("accepts a valid vocabulary", () => {
		expect(validateVocabulary(sameInput)).toEqual([]);
	});

	it("is deterministic", () => {
		expect(generateVocabulary(sameInput)).toEqual(
			generateVocabulary(sameInput),
		);
	});
});
