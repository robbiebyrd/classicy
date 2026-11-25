import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import {
	WINDOWS98_VGA_COLOR_NAMES,
	windows98VgaColor,
} from "../windows98SaverColors";
import { Windows98Surface } from "../windows98SaverSurface";
import { createWindows98Random } from "../windows98SaverTimer";
import { mystify } from "./mystify";

/** The two ways a polygon's colors change ("Colors to use"). */
export const MYSTIFY_COLOR_MODES = [
	"Multiple random colors",
	"Two colors",
] as const;

/** One polygon's options: the Shape list's Polygon 1 or Polygon 2. */
const polygonSchema = (label: string) =>
	z
		.looseObject({
			active: z.boolean().default(true).describe("Active"),
			lines: z.number().int().min(1).max(15).default(5).describe("Lines"),
			colors: z
				.enum(MYSTIFY_COLOR_MODES)
				.default("Multiple random colors")
				.describe("Colors to use"),
			startColor: z
				.enum(WINDOWS98_VGA_COLOR_NAMES)
				.default("Black")
				.describe("First of two colors"),
			endColor: z
				.enum(WINDOWS98_VGA_COLOR_NAMES)
				.default("White")
				.describe("Second of two colors"),
		})
		.default({
			active: true,
			lines: 5,
			colors: "Multiple random colors",
			startColor: "Black",
			endColor: "White",
		})
		.describe(label);

/**
 * Mystify Your Mind's options, as its dialog had them ("Options to Mystify
 * Your Mind"): for each of the two polygons (the Shape list), Active, Lines
 * (1-15) and the Colors to use, Two colors (from the two color lists) or
 * Multiple random colors; and Clear screen. Clear screen off, the polygons
 * draw over the desktop (erasing in black), as Windows drew them over the
 * screen it left. The defaults are the .scr's own (`control.ini` Active 1,
 * Lines 5, WalkRandom 1, StartColor black, EndColor white, Clear Screen 1).
 */
export const MystifyConfigSchema = z.looseObject({
	polygon1: polygonSchema("Polygon 1"),
	polygon2: polygonSchema("Polygon 2"),
	clearScreen: z.boolean().default(true).describe("Clear screen"),
});

/**
 * Windows 98's Mystify Your Mind (ssmyst.scr): two polygons trailing their
 * outlines across the screen, fading from color to color.
 */
export const ClassicyScreenSaverMystify: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = MystifyConfigSchema.safeParse(config);
	const options = parsed.success ? parsed.data : MystifyConfigSchema.parse({});
	const polygons = [options.polygon1, options.polygon2].map((polygon) => ({
		active: polygon.active,
		lines: polygon.lines,
		randomColors: polygon.colors === "Multiple random colors",
		startColor: windows98VgaColor(polygon.startColor),
		endColor: windows98VgaColor(polygon.endColor),
	}));
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverMystify"
			className={className}
			style={style}
			optionsKey={JSON.stringify([polygons, options.clearScreen])}
			setup={{
				// SetTimer(…, 10): every 55 ms tick.
				intervalMs: 10,
				// Every trail full, its colors part way into a fade.
				stillTicks: 120,
				start: (canvas, width, height) => {
					const context = canvas.getContext("2d");
					if (!context) return null;
					return mystify(
						new Windows98Surface(
							context,
							width,
							height,
							options.clearScreen ? 0x000000 : null,
						),
						createWindows98Random(),
						polygons,
					);
				},
			}}
		/>
	);
};
