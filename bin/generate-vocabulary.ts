// Generates the typed and SCSS vocabulary from ClassicyVocabulary.json.
//
//   node bin/generate-vocabulary.ts           write both outputs
//   node bin/generate-vocabulary.ts --check   exit 1 when either file is stale
//
// Build script, not library code: it reports through stderr and exit codes.
// Erasable TypeScript syntax only, so Node runs it directly.
import { readFileSync, writeFileSync } from "node:fs";

export type VocabularyInput = {
	/** PascalCase component to root class, only where it deviates from `classicy<Component>`. */
	roots?: Record<string, string>;
	/** PascalCase component to full class names that are not `<root><Part>` (modifiers and fragments folded into the component). */
	extraClasses?: Record<string, string[]>;
	/** PascalCase component to the part suffixes appended to its root class. */
	components: Record<string, string[]>;
	states: string[];
	attributes: {
		"data-classicy-control": string[];
		"data-classicy-role": string[];
		"data-classicy-part": string[];
	};
};

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((v) => typeof v === "string");

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const ATTRIBUTE_NAMES = [
	"data-classicy-control",
	"data-classicy-role",
	"data-classicy-part",
] as const;

/**
 * Why `input` (parsed JSON) is not a VocabularyInput, one message per
 * misshapen field; empty when it is one. The generator checks this before
 * anything else, so a hand-edit that breaks the shape fails with a message
 * rather than a TypeError or a silently wrong output.
 */
export function vocabularyShapeErrors(input: unknown): string[] {
	if (!isObject(input)) return ["the vocabulary must be a JSON object"];
	const errors: string[] = [];
	const stringArrays = (field: "components" | "extraClasses") => {
		const value = input[field];
		if (value === undefined && field === "extraClasses") return;
		if (!isObject(value)) {
			errors.push(`${field} must be an object of string arrays`);
			return;
		}
		for (const [key, list] of Object.entries(value))
			if (!isStringArray(list))
				errors.push(`${field}.${key} must be an array of strings`);
	};
	stringArrays("components");
	stringArrays("extraClasses");
	if (input.roots !== undefined) {
		if (!isObject(input.roots))
			errors.push("roots must be an object of strings");
		else
			for (const [key, root] of Object.entries(input.roots))
				if (typeof root !== "string")
					errors.push(`roots.${key} must be a string`);
	}
	if (!isStringArray(input.states))
		errors.push("states must be an array of strings");
	if (!isObject(input.attributes))
		errors.push("attributes must be an object of string arrays");
	else
		for (const name of ATTRIBUTE_NAMES)
			if (!isStringArray(input.attributes[name]))
				errors.push(`attributes["${name}"] must be an array of strings`);
	return errors;
}

const HEADER = "// generated — do not edit (bin/generate-vocabulary.ts)";
const STATE_PATTERN = /^[a-z][a-z0-9-]*$/;

const rootClass = (input: VocabularyInput, component: string): string =>
	input.roots?.[component] ?? `classicy${component}`;

export function validateVocabulary(input: VocabularyInput): string[] {
	const errors: string[] = [];
	const classes = new Map<string, string>();
	for (const [component, parts] of Object.entries(input.components)) {
		const root = rootClass(input, component);
		classes.set(root.toLowerCase(), `root class ${root}`);
		for (const part of parts) {
			classes.set(`${root}${part}`.toLowerCase(), `part class ${root}${part}`);
		}
	}
	for (const [component, extras] of Object.entries(input.extraClasses ?? {})) {
		if (!(component in input.components)) {
			errors.push(`extraClasses names unknown component "${component}"`);
			continue;
		}
		for (const extra of extras) {
			classes.set(extra.toLowerCase(), `extra class ${extra}`);
		}
	}
	const seen = new Set<string>();
	for (const state of input.states) {
		if (seen.has(state)) {
			errors.push(`duplicate state "${state}"`);
			continue;
		}
		seen.add(state);
		if (!STATE_PATTERN.test(state)) {
			errors.push(`state "${state}" must match ${STATE_PATTERN}`);
			continue;
		}
		const collision = classes.get(state.toLowerCase());
		if (collision) {
			errors.push(`state "${state}" collides with ${collision}`);
		}
	}
	return errors;
}

const entries = (pairs: [string, string][]): string =>
	pairs.map(([key, value]) => `\t${key}: "${value}",\n`).join("");

export function generateVocabulary(input: VocabularyInput): {
	ts: string;
	scss: string;
} {
	const ts = `${HEADER}

export const CLASSICY_STATE = {
${entries(input.states.map((s) => [s, s]))}} as const;

export type ClassicyState = keyof typeof CLASSICY_STATE;

export const classicyStateClasses = (
	states: Partial<Record<ClassicyState, boolean>>,
): string =>
	(Object.keys(CLASSICY_STATE) as ClassicyState[])
		.filter((s) => states[s])
		.join(" ");

export const CLASSICY_COMPONENT = {
${entries(Object.keys(input.components).map((c) => [c, rootClass(input, c)]))}} as const;

export type ClassicyComponentName = keyof typeof CLASSICY_COMPONENT;

export const CLASSICY_PART_ATTRIBUTE = {
	control: "data-classicy-control",
	role: "data-classicy-role",
	part: "data-classicy-part",
} as const;
`;
	const scss = `${HEADER}
@use "sass:list";

$classicy-states: (${input.states.join(", ")});

@function classicy-state($name) {
	@if not list.index($classicy-states, $name) {
		@error "classicy-state: unknown state #{$name}";
	}
	@return ".#{$name}";
}
`;
	return { ts, scss };
}

function main(): void {
	const dir = new URL("../src/Appearance/vocabulary/", import.meta.url);
	const parsed: unknown = JSON.parse(
		readFileSync(new URL("ClassicyVocabulary.json", dir), "utf8"),
	);
	const shape = vocabularyShapeErrors(parsed);
	if (shape.length > 0) {
		process.stderr.write(`${shape.join("\n")}\n`);
		process.exit(1);
	}
	const input = parsed as VocabularyInput;
	const errors = validateVocabulary(input);
	if (errors.length > 0) {
		process.stderr.write(`${errors.join("\n")}\n`);
		process.exit(1);
	}
	const { ts, scss } = generateVocabulary(input);
	const outputs: [URL, string][] = [
		[new URL("ClassicyVocabulary.ts", dir), ts],
		[new URL("_vocabulary.scss", dir), scss],
	];
	if (process.argv.includes("--check")) {
		const stale = outputs.filter(([file, text]) => {
			try {
				return readFileSync(file, "utf8") !== text;
			} catch {
				return true;
			}
		});
		if (stale.length > 0) {
			process.stderr.write(
				`stale generated vocabulary: ${stale.map(([f]) => f.pathname).join(", ")}\nrun: node bin/generate-vocabulary.ts\n`,
			);
			process.exit(1);
		}
		return;
	}
	for (const [file, text] of outputs) {
		writeFileSync(file, text);
	}
}

if (process.argv[1]?.endsWith("generate-vocabulary.ts")) {
	main();
}
