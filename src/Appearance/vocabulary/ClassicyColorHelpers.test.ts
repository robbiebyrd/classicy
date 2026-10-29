import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

const warnings: string[] = [];
const options = {
	loadPaths: [path.resolve(process.cwd(), "src/Appearance/vocabulary")],
	style: "expanded" as const,
	logger: {
		warn: (message: string) => {
			warnings.push(message);
		},
	},
};
const compile = (source: string) => sass.compileString(source, options).css;

const HELPER_CALLS = `@use "color" as c; .t { a: c.classicy-tint("--color-error", 80%); b: c.classicy-shade("--color-system-04", 10%); d: c.classicy-alpha("--color-black", 50%); }`;
const css = compile(HELPER_CALLS);

describe("src/Appearance/vocabulary/_color.scss", () => {
	it("classicy-tint mixes toward white", () =>
		expect(css).toContain(
			"a: color-mix(in srgb, var(--color-error), white 80%);",
		));

	it("classicy-shade mixes toward black", () =>
		expect(css).toContain(
			"b: color-mix(in srgb, var(--color-system-04), black 10%);",
		));

	it("classicy-alpha mixes with transparent", () =>
		expect(css).toContain(
			"d: color-mix(in srgb, var(--color-black) 50%, transparent);",
		));

	it("rejects a token that is not a custom-property name", () =>
		expect(() =>
			compile(`@use "color" as c; .t { a: c.classicy-tint(red, 10%); }`),
		).toThrow(/custom-property name/));

	it("rejects a string that does not start with --", () =>
		expect(() =>
			compile(
				`@use "color" as c; .t { a: c.classicy-tint("color-error", 10%); }`,
			),
		).toThrow(/custom-property name/));

	it("emits no CSS of its own", () =>
		expect(compile(`@use "color";`)).toBe(""));

	it("compiles without warnings", () => {
		warnings.length = 0;
		compile(HELPER_CALLS);
		expect(warnings).toEqual([]);
	});
});
