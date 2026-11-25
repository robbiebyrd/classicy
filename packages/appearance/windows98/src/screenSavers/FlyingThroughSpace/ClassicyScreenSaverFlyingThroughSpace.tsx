import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import { Windows98Surface } from "../windows98SaverSurface";
import { createWindows98Random } from "../windows98SaverTimer";
import { flyingThroughSpace } from "./flyingThroughSpace";

/**
 * Flying Through Space's options, as its Options dialog had them ("Options
 * for Flying Through Space"): Warp speed, a slider from Slow (1) to Fast (20),
 * and Starfield density, the number of stars (10-200). The defaults are the
 * .scr's own (`control.ini` WarpSpeed 10, Density 25).
 */
export const FlyingThroughSpaceConfigSchema = z.looseObject({
	warpSpeed: z
		.number()
		.int()
		.min(1)
		.max(20)
		.default(10)
		.describe("Warp speed (1 slow, 20 fast)"),
	density: z
		.number()
		.int()
		.min(10)
		.max(200)
		.default(25)
		.describe("Number of stars (10-200)"),
});

/**
 * Windows 98's Flying Through Space (ssstars.scr): white stars streaming out
 * of the center on black, the warp accelerating from a standstill.
 */
export const ClassicyScreenSaverFlyingThroughSpace: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = FlyingThroughSpaceConfigSchema.safeParse(config);
	const options = parsed.success
		? parsed.data
		: FlyingThroughSpaceConfigSchema.parse({});
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverFlyingThroughSpace"
			className={className}
			style={style}
			optionsKey={`${options.warpSpeed}|${options.density}`}
			setup={{
				// SetTimer(…, 30): every 55 ms tick.
				intervalMs: 30,
				// Up to full speed and a field of stars at every depth.
				stillTicks: options.warpSpeed * 10 + 40,
				start: (canvas, width, height) => {
					const context = canvas.getContext("2d");
					if (!context) return null;
					return flyingThroughSpace(
						new Windows98Surface(context, width, height, 0x000000),
						createWindows98Random(),
						options,
					);
				},
			}}
		/>
	);
};
