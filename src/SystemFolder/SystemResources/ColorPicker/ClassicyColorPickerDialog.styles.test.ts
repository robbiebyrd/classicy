import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * The window's contents box is a plain block, so the dialog body's `flex: 1`
 * only works inside its own full-height column. Without that column the crayon
 * box pushed the preview and the OK/Cancel footer below the window's bottom
 * edge, leaving no way to confirm a colour. jsdom does no layout, so this pins
 * the column on the compiled stylesheet.
 */
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss",
	),
	{ style: "expanded" },
).css;

const rule = (selector: string): Record<string, string> => {
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
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("/"))
			.map((line) => {
				const [prop, ...rest] = line.replace(/;$/, "").split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

describe("ClassicyColorPickerDialog layout", () => {
	it("lays the dialog out as a full-height column", () => {
		const column = rule(".classicyColorPickerDialog");
		expect(column.display).toBe("flex");
		expect(column["flex-direction"]).toBe("column");
		expect(column.height).toBe("100%");
		expect(column["box-sizing"]).toBe("border-box");
	});

	it("lets the body shrink so the preview and footer stay in the window", () => {
		const body = rule(".classicyColorPickerDialogBody");
		expect(body.flex).toBe("1");
		expect(body["min-height"]).toBe("0");
		expect(rule(".classicyColorPickerDialogFooter")["flex-shrink"]).toBe("0");
		expect(rule(".classicyColorPickerPreview")["flex-shrink"]).toBe("0");
	});
});
