import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import {
	WINDOWS98_VGA_COLOR_NAMES,
	windows98VgaColor,
} from "../windows98SaverColors";
import { Windows98Surface } from "../windows98SaverSurface";
import { createWindows98CurvesRandom } from "../windows98SaverTimer";
import { curvesAndColors } from "./curvesAndColors";

/** The two ways the copies are colored. */
export const CURVES_AND_COLORS_COLOR_MODES = [
	"Multiple random colors",
	"One color",
] as const;

/**
 * Curves and Colors' options, as its dialog had them ("Options for Curves and
 * Colors"): Speed and shape, a Slow to Fast slider (0-8: the timer runs every
 * 200 - 25 x Speed milliseconds), Lines (1-80) and Curves (2-10); Density and
 * colors, a Dense to Sparse slider (0-6: a point moves up to 3 + 3 x Density
 * pixels a tick), One color or Multiple random colors; and Clear screen. The
 * One color is one of the sixteen basic colors here; the .scr's Choose Color
 * button opened the Color dialog, which offered any. Clear screen off, the
 * curves draw over the desktop (erasing in black). The defaults are the
 * .scr's own (its `control.ini` record's: Lines 2, Curves 10, Speed Fast,
 * Density Sparse, multiple colors, red, Clear screen on).
 */
export const CurvesAndColorsConfigSchema = z.looseObject({
	speed: z
		.number()
		.int()
		.min(0)
		.max(8)
		.default(8)
		.describe("Speed (0 slow, 8 fast)"),
	lines: z.number().int().min(1).max(80).default(2).describe("Lines"),
	curves: z.number().int().min(2).max(10).default(10).describe("Curves"),
	density: z
		.number()
		.int()
		.min(0)
		.max(6)
		.default(6)
		.describe("Density (0 dense, 6 sparse)"),
	colors: z
		.enum(CURVES_AND_COLORS_COLOR_MODES)
		.default("Multiple random colors")
		.describe("Colors"),
	color: z.enum(WINDOWS98_VGA_COLOR_NAMES).default("Red").describe("One color"),
	clearScreen: z.boolean().default(true).describe("Clear screen"),
});

/**
 * Windows 98's Curves and Colors (bezier.scr): a closed Bezier curve with a
 * trail of copies, bouncing round the screen through the hues.
 */
export const ClassicyScreenSaverCurvesAndColors: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = CurvesAndColorsConfigSchema.safeParse(config);
	const options = parsed.success
		? parsed.data
		: CurvesAndColorsConfigSchema.parse({});
	const curves = {
		lines: options.lines,
		curves: options.curves,
		density: 2 + 3 * options.density,
		randomColors: options.colors === "Multiple random colors",
		color: windows98VgaColor(options.color),
	};
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverCurvesAndColors"
			className={className}
			style={style}
			optionsKey={JSON.stringify([curves, options.speed, options.clearScreen])}
			setup={{
				intervalMs: 200 - 25 * options.speed,
				// Every copy of the trail drawn.
				stillTicks: options.lines + 1,
				start: (canvas, width, height) => {
					const context = canvas.getContext("2d");
					if (!context) return null;
					return curvesAndColors(
						new Windows98Surface(
							context,
							width,
							height,
							options.clearScreen ? 0x000000 : null,
						),
						createWindows98CurvesRandom(),
						curves,
					);
				},
			}}
		/>
	);
};
