import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import { Windows98Surface } from "../windows98SaverSurface";
import { createWindows98Random } from "../windows98SaverTimer";
import { flyingWindows } from "./flyingWindows";

/**
 * Flying Windows' options, as its Options dialog had them ("Options for
 * Flying Windows"): Warp speed, a slider from Slow (1) to Fast (20), and
 * Density, the number of windows (5-75). The defaults are the .scr's own
 * (`control.ini` WarpSpeed 20, Density 25).
 */
export const FlyingWindowsConfigSchema = z.looseObject({
	warpSpeed: z
		.number()
		.int()
		.min(1)
		.max(20)
		.default(20)
		.describe("Warp speed (1 slow, 20 fast)"),
	density: z
		.number()
		.int()
		.min(5)
		.max(75)
		.default(25)
		.describe("Number of windows (5-75)"),
});

/**
 * Windows 98's Flying Windows (ssflywin.scr): Windows logos, each Wingdings'
 * flag in one solid color, streaming out of the center on black.
 */
export const ClassicyScreenSaverFlyingWindows: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = FlyingWindowsConfigSchema.safeParse(config);
	const options = parsed.success
		? parsed.data
		: FlyingWindowsConfigSchema.parse({});
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverFlyingWindows"
			className={className}
			style={style}
			optionsKey={`${options.warpSpeed}|${options.density}`}
			setup={{
				// SetTimer(…, 50): every 55 ms tick.
				intervalMs: 50,
				// Up to full speed, and logos at every depth.
				stillTicks: options.warpSpeed * 10 + 40,
				start: (canvas, width, height) => {
					const context = canvas.getContext("2d");
					if (!context) return null;
					return flyingWindows(
						new Windows98Surface(context, width, height, 0x000000),
						createWindows98Random(),
						options,
					);
				},
			}}
		/>
	);
};
