import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	generateVocabulary,
	validateVocabulary,
	vocabularyShapeErrors,
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
		expect(ts).toContain('Button: "classicyButton"');
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

	it("maps CLASSICY_COMPONENT to root classes, honoring roots", () => {
		const { ts } = generateVocabulary({
			roots: { Tabs: "classicyTabContainer" },
			components: { Button: [], Tabs: [] },
			states: ["pressed"],
			attributes,
		});
		expect(ts).toContain('Button: "classicyButton"');
		expect(ts).toContain('Tabs: "classicyTabContainer"');
	});

	it("rejects a state that equals an extra class", () => {
		expect(
			validateVocabulary({
				components: { ControlLabel: [] },
				extraClasses: { ControlLabel: ["classicyLabelAbove"] },
				states: ["classicylabelabove"],
				attributes,
			}),
		).toEqual([
			'state "classicylabelabove" collides with extra class classicyLabelAbove',
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

describe("vocabularyShapeErrors", () => {
	it("accepts the committed vocabulary and a minimal one", () => {
		const committed = JSON.parse(
			readFileSync(
				resolve("src/Appearance/vocabulary/ClassicyVocabulary.json"),
				"utf8",
			),
		);
		expect(vocabularyShapeErrors(committed)).toEqual([]);
		expect(vocabularyShapeErrors(sameInput)).toEqual([]);
	});

	it.each([
		["not an object", [], ["the vocabulary must be a JSON object"]],
		[
			"components missing",
			{ states: [], attributes },
			["components must be an object of string arrays"],
		],
		[
			"a component's parts not strings",
			{ components: { Button: [1] }, states: [], attributes },
			["components.Button must be an array of strings"],
		],
		[
			"states not an array",
			{ components: {}, states: "pressed", attributes },
			["states must be an array of strings"],
		],
		[
			"an attribute list missing",
			{
				components: {},
				states: [],
				attributes: { ...attributes, "data-classicy-role": undefined },
			},
			['attributes["data-classicy-role"] must be an array of strings'],
		],
		[
			"a root that is not a string",
			{ components: {}, states: [], attributes, roots: { Button: 1 } },
			["roots.Button must be a string"],
		],
		[
			"extraClasses not an object",
			{ components: {}, states: [], attributes, extraClasses: [] },
			["extraClasses must be an object of string arrays"],
		],
	])("reports %s", (_name, input, errors) =>
		expect(vocabularyShapeErrors(input)).toEqual(errors));
});

// The CLI, end to end: a copy of the script in a scratch tree laid out like
// the repo (it reads ../src/Appearance/vocabulary/ next to itself).
// Each case spawns Node once or twice (0.2 s alone); sized for a loaded
// machine, as story 0082-lgo (l) found vitest's 5 s default is not.
const CLI_TIMEOUT_MS = 60_000;

describe("node bin/generate-vocabulary.ts", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-vocabulary-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	let run = 0;
	const tree = (json: unknown) => {
		const dir = join(root, `case-${run++}`);
		const vocabulary = join(dir, "src/Appearance/vocabulary");
		mkdirSync(join(dir, "bin"), { recursive: true });
		mkdirSync(vocabulary, { recursive: true });
		copyFileSync(
			resolve("bin/generate-vocabulary.ts"),
			join(dir, "bin/generate-vocabulary.ts"),
		);
		writeFileSync(
			join(vocabulary, "ClassicyVocabulary.json"),
			JSON.stringify(json),
		);
		const cli = (...args: string[]) =>
			spawnSync(
				process.execPath,
				[join(dir, "bin/generate-vocabulary.ts"), ...args],
				{ encoding: "utf8" },
			);
		return { vocabulary, cli };
	};

	it(
		"writes both outputs, then --check passes",
		() => {
			const { vocabulary, cli } = tree(sameInput);
			expect(cli().status).toBe(0);
			const { ts, scss } = generateVocabulary(sameInput);
			expect(
				readFileSync(join(vocabulary, "ClassicyVocabulary.ts"), "utf8"),
			).toBe(ts);
			expect(readFileSync(join(vocabulary, "_vocabulary.scss"), "utf8")).toBe(
				scss,
			);
			expect(cli("--check")).toMatchObject({ status: 0, stderr: "" });
		},
		CLI_TIMEOUT_MS,
	);

	it(
		"--check fails on a stale or missing output and writes nothing",
		() => {
			const { vocabulary, cli } = tree(sameInput);
			expect(cli().status).toBe(0);
			writeFileSync(join(vocabulary, "ClassicyVocabulary.ts"), "// stale\n");
			rmSync(join(vocabulary, "_vocabulary.scss"));
			const result = cli("--check");
			expect(result.status).toBe(1);
			expect(result.stderr).toMatch(
				/^stale generated vocabulary: .*ClassicyVocabulary\.ts, .*_vocabulary\.scss\nrun: node bin\/generate-vocabulary\.ts\n$/,
			);
			expect(
				readFileSync(join(vocabulary, "ClassicyVocabulary.ts"), "utf8"),
			).toBe("// stale\n");
		},
		CLI_TIMEOUT_MS,
	);

	it(
		"fails on a malformed vocabulary before generating",
		() => {
			const { cli } = tree({ components: { Button: "Pressed" }, states: [] });
			const result = cli("--check");
			expect(result.status).toBe(1);
			expect(result.stderr).toBe(
				"components.Button must be an array of strings\nattributes must be an object of string arrays\n",
			);
		},
		CLI_TIMEOUT_MS,
	);

	it(
		"fails on a state collision",
		() => {
			const { cli } = tree({ ...sameInput, states: ["classicybutton"] });
			const result = cli();
			expect(result.status).toBe(1);
			expect(result.stderr).toMatch(
				/state "classicybutton" collides with root class classicyButton/,
			);
		},
		CLI_TIMEOUT_MS,
	);
});
