import { compileString } from "sass";
import { describe, expect, it } from "vitest";

const LOAD = { loadPaths: ["src"] };
// The originals stay in place until 4.3 re-points the last component sheet
// (ruling R7); this equivalence is deleted with them.
const ORIGINAL =
	"SystemFolder/ControlPanels/AppearanceManager/styles/appearance";

describe("src/Appearance/vocabulary/_layout.scss", () => {
	it("classicy-px-rect is px-rect", () => {
		const call = (use: string, fn: string) =>
			compileString(
				`@use "${use}" as m;\n.x { background: m.${fn}(var(--c), 0, 100%, calc(100% - 1px), 1px), red; }`,
				LOAD,
			).css;
		const after = call("Appearance/vocabulary/layout", "classicy-px-rect");
		expect(after).toContain(
			"linear-gradient(var(--c), var(--c)) 0 100%/calc(100% - 1px) 1px no-repeat",
		);
		expect(after).toBe(call(ORIGINAL, "px-rect"));
	});

	it("classicy-no-select is no-select", () => {
		const include = (use: string, mixin: string) =>
			compileString(`@use "${use}" as m;\n.x { @include m.${mixin}; }`, LOAD)
				.css;
		const after = include("Appearance/vocabulary/layout", "classicy-no-select");
		expect(after).toContain("user-select: none;");
		expect(after).toBe(include(ORIGINAL, "no-select"));
	});

	it("emits no CSS of its own", () =>
		expect(
			compileString(`@use "Appearance/vocabulary/layout";`, LOAD).css,
		).toBe(""));
});
