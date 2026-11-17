import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyColorPickerHLS } from "./ClassicyColorPickerHLS";
import { ClassicyColorPickerHSV } from "./ClassicyColorPickerHSV";
import { hlsToRgb, hsvToRgb, rgbToInt } from "./ClassicyColorPickerUtils";

const field = (id: string) => document.getElementById(id) as HTMLInputElement;

describe.each([
	{
		mode: "hls",
		Panel: ClassicyColorPickerHLS,
		third: "l",
		// Pure red: hue 0, lightness 50, saturation 100.
		toInt: (h: number) => {
			const { r, g, b } = hlsToRgb(h, 50, 100);
			return rgbToInt(r, g, b);
		},
	},
	{
		mode: "hsv",
		Panel: ClassicyColorPickerHSV,
		third: "v",
		// Pure red: hue 0, saturation 100, value 100.
		toInt: (h: number) => {
			const { r, g, b } = hsvToRgb(h, 100, 100);
			return rgbToInt(r, g, b);
		},
	},
])("$mode wheel fields", ({ mode, Panel, third, toInt }) => {
	it("are ClassicySpinners with their ranges", () => {
		render(<Panel color={0xff0000} onChangeFunc={() => {}} />);
		for (const f of ["h", "s", third]) {
			const input = field(`cp-${mode}-${f}`);
			expect(input).toHaveClass("classicySpinner");
			expect(
				input
					.closest(".classicySpinnerHolder")
					?.querySelector(".classicyControlLabel"),
			).not.toBeNull();
		}
		expect(field(`cp-${mode}-h`).value).toBe("0");
	});

	it("reports a typed hue as a new color", () => {
		const onChange = vi.fn();
		render(<Panel color={0xff0000} onChangeFunc={onChange} />);
		fireEvent.change(field(`cp-${mode}-h`), { target: { value: "120" } });
		expect(onChange).toHaveBeenLastCalledWith(toInt(120));
	});

	it("follows a color changed elsewhere, such as on the wheel", () => {
		const { rerender } = render(
			<Panel color={0xff0000} onChangeFunc={() => {}} />,
		);
		rerender(<Panel color={toInt(240)} onChangeFunc={() => {}} />);
		expect(field(`cp-${mode}-h`).value).toBe("240");
	});
});
