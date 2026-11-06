import { compileString } from "sass";
import { describe, expect, it } from "vitest";

const LOAD = { loadPaths: ["src"] };
// The expected outputs are what px-rect and no-select compiled to in the
// former AppearanceManager/styles/appearance.scss (deleted, ruling R7).

describe("src/Appearance/vocabulary/_layout.scss", () => {
	it("classicy-px-rect is px-rect", () => {
		const call = (use: string, fn: string) =>
			compileString(
				`@use "${use}" as m;\n.x { background: m.${fn}(var(--c), 0, 100%, calc(100% - 1px), 1px), red; }`,
				LOAD,
			).css;
		expect(call("Appearance/vocabulary/layout", "classicy-px-rect")).toBe(
			".x {\n  background: linear-gradient(var(--c), var(--c)) 0 100%/calc(100% - 1px) 1px no-repeat, red;\n}",
		);
	});

	it("classicy-no-select is no-select", () => {
		const include = (use: string, mixin: string) =>
			compileString(`@use "${use}" as m;\n.x { @include m.${mixin}; }`, LOAD)
				.css;
		expect(include("Appearance/vocabulary/layout", "classicy-no-select")).toBe(
			".x {\n  -webkit-user-select: none; /* Safari */\n  -ms-user-select: none; /* IE 10 and IE 11 */\n  user-select: none; /* Standard syntax */\n}",
		);
	});

	it("emits no CSS of its own", () =>
		expect(
			compileString(`@use "Appearance/vocabulary/layout";`, LOAD).css,
		).toBe(""));
});
