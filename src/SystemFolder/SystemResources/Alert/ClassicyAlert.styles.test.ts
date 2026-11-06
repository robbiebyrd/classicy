import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// H-R29b: the label's cap-height nudge is a typographic offset of its own,
// not a border, so editing Border must not move the alert's text.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss",
	),
	{ style: "expanded" },
).css;

describe("ClassicyAlert's label nudge", () => {
	it("reads its own knob, not the border metric", () => {
		const body = css.match(
			/^\.classicyAlert \.classicyAlertBody \{\n([^}]*)\n\}/m,
		)?.[1];
		expect(body).toBeDefined();
		expect(body).toContain("padding-top: var(--dialog-alert-label-offset);");
		expect(body).not.toContain("--window-border-size");
	});

	it("holds at 1px when Border is edited", () => {
		const theme = getTheme("default");
		for (const borderSize of [0, 1, 3]) {
			const vars = getThemeVars({
				...theme,
				measurements: {
					...theme.measurements,
					window: { ...theme.measurements.window, borderSize },
				},
			}) as Record<string, string>;
			expect(vars["--dialog-alert-label-offset"], `border ${borderSize}`).toBe(
				"1px",
			);
		}
	});
});
