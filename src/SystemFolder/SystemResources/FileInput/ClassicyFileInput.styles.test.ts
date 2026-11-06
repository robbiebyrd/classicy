import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// H-R29b: the visually hidden native input keeps a size of its own. Read
// from the border metric, it collapsed to 0 x 0 at Border 0 (which the
// Metrics tab allows), and some screen readers skip a zero-size element.
// The knob is the formControl family's (formControl.fileInputHiddenSize),
// for form-control parts outside dialogs.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss",
	),
	{ style: "expanded" },
).css;

const declarations = (selector: string): Record<string, string> => {
	const match = css.match(
		new RegExp(
			`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
			"m",
		),
	);
	if (!match) throw new Error(`no rule for ${selector}`);
	return Object.fromEntries(
		match[1]
			.split("\n")
			.map((line) => line.trim().replace(/;$/, ""))
			.filter((line) => line.includes(":"))
			.map((line) => {
				const [prop, ...rest] = line.split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

describe("ClassicyFileInput's hidden native input", () => {
	it("is sized by its own knob, not the border metric", () => {
		const rule = declarations(".classicyFileInputNative");
		expect(rule.width).toBe("var(--form-control-file-input-hidden-size)");
		expect(rule.height).toBe("var(--form-control-file-input-hidden-size)");
	});

	it("stays 1px at Border 0", () => {
		const theme = getTheme("default");
		const vars = getThemeVars({
			...theme,
			measurements: {
				...theme.measurements,
				window: { ...theme.measurements.window, borderSize: 0 },
			},
		}) as Record<string, string>;
		expect(vars["--window-border-size"]).toBe("0px");
		expect(vars["--form-control-file-input-hidden-size"]).toBe("1px");
		expect(vars).not.toHaveProperty("--dialog-file-input-hidden-size");
	});
});
