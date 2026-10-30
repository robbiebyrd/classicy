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

	// The dialog is a fixed 520×430 window whose panel area measures 413×309
	// (Chromium, default theme). Every panel has to fit that box without the
	// panel's own `overflow: auto` growing scrollbars: the crayon box used to
	// run 49px too tall and the wheel panels 23px too wide.
	describe("panels fit the fixed window", () => {
		it("sizes crayons from the box width so the rows scale with the panel", () => {
			const row = rule(".classicyColorPickerCrayonRow");
			expect(row.display).toBe("grid");
			expect(row["grid-template-columns"]).toBe(
				"repeat(var(--cp-crayon-cols), 1fr)",
			);
			// Rows overlap by a share of the crayon height. A percentage top
			// margin resolves against the containing block's WIDTH, which is
			// what ties the overlap to the crayon width the grid hands out.
			const overlap = rule(".classicyColorPickerCrayonRow:not(:first-child)")[
				"margin-top"
			];
			expect(overlap).toContain("100% / var(--cp-crayon-cols)");
			expect(overlap).toContain("var(--cp-crayon-aspect)");
			const crayon = rule(".classicyColorPickerCrayon");
			expect(crayon.width).toBe("100%");
			expect(crayon["aspect-ratio"]).toBe("1/var(--cp-crayon-aspect)");
			expect(rule(".classicyColorPickerCrayon svg").width).toBe("100%");
			expect(rule(".classicyColorPickerCrayon svg").height).toBe("100%");
		});

		it("lets the wheel shrink to the room left beside its fields", () => {
			const outer = rule(".classicyColorPickerWheelOuter");
			expect(outer.width).toBe("100%");
			expect(outer["max-width"]).toBe("var(--picker-wheel-max)");
			expect(outer["aspect-ratio"]).toBe("1");
			expect(outer.height).toBeUndefined();
			// Room for the half of the 180° label that hangs off the square's
			// left edge; without it the panel clipped the label to "80°".
			expect(outer["margin-left"]).toBe("var(--picker-label-overhang)");
			expect(outer["flex-shrink"]).toBeUndefined();
			const canvas = rule(".classicyColorPickerWheelCanvas");
			expect(canvas.width).toBe("100%");
			expect(canvas.height).toBe("100%");
			const wrapper = rule(".classicyColorPickerWheelCanvasWrapper");
			expect(wrapper.inset).toBe("8.3333333333%");
			// Degree labels ring the wheel in percentages of the square, not
			// pixels of the old fixed 240px box.
			const zero = rule(
				'.classicyColorPickerWheelDegreeLabel[data-degree="0"]',
			);
			expect(zero.left).toBe("100%");
			expect(zero.top).toBe("50%");
			const fields = rule(".classicyColorPickerWheelFields");
			expect(fields["flex-shrink"]).toBe("0");
			expect(
				rule(".classicyColorPickerWheelField label")["min-width"],
			).toBeUndefined();
		});

		it("keeps the preview strip inside the dialog's width", () => {
			expect(rule(".classicyColorPickerPreview")["box-sizing"]).toBe(
				"border-box",
			);
		});
	});
});
