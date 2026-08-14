import "./ClassicyScreenSaverHardRain.scss";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const HardRainConfigSchema = z.looseObject({
	drops: z
		.number()
		.int()
		.min(10)
		.max(60)
		.default(60)
		.describe("Number of expanding raindrop rings."),
});

/** Grid positions from the original (percent top/left), keyed p<row>-<col>. */
const POSITIONS: Record<string, [number, number]> = {
	"0-1": [-2, 5],
	"0-2": [-17, 25],
	"0-3": [4, 45],
	"0-4": [-4, 65],
	"0-5": [1, 85],
	"1-1": [18, 5],
	"1-2": [7, 25],
	"1-3": [24, 45],
	"1-4": [16, 65],
	"1-5": [21, 85],
	"2-1": [38, 15],
	"2-2": [27, 35],
	"2-3": [44, 55],
	"2-4": [36, 75],
	"2-5": [41, 95],
	"3-1": [58, 5],
	"3-2": [47, 25],
	"3-3": [64, 45],
	"3-4": [56, 65],
	"3-5": [61, 85],
	"4-1": [78, 15],
	"4-2": [67, 35],
	"4-3": [84, 55],
	"4-4": [76, 75],
	"4-5": [81, 95],
	"5-1": [98, 15],
	"5-2": [87, 35],
	"5-3": [104, 55],
	"5-4": [96, 75],
	"5-5": [101, 95],
};

const COLORS: Record<string, string> = {
	dkblue: "#00006e",
	lime: "#c8d354",
	ltgray: "#c2c2c2",
	red: "#861f23",
	ltblue: "#45a0cc",
	pink: "#9a3368",
	yellow: "#efda1d",
	green: "#397132",
};

/** Every drop from the original markup: [timing 1–30, position, size, color]. */
const DROPS: [number, string, number, string][] = [
	[7, "0-1", 200, "dkblue"],
	[23, "0-2", 350, "lime"],
	[17, "0-3", 140, "ltgray"],
	[11, "0-4", 300, "red"],
	[14, "0-5", 250, "ltblue"],
	[29, "1-1", 350, "pink"],
	[18, "1-2", 300, "yellow"],
	[30, "1-3", 140, "green"],
	[12, "1-4", 200, "ltgray"],
	[27, "1-5", 250, "dkblue"],
	[10, "2-1", 140, "pink"],
	[4, "2-2", 200, "red"],
	[8, "2-3", 300, "ltblue"],
	[22, "2-4", 350, "yellow"],
	[1, "2-5", 250, "lime"],
	[3, "3-1", 300, "green"],
	[6, "3-2", 250, "dkblue"],
	[15, "3-3", 350, "ltgray"],
	[24, "3-4", 140, "pink"],
	[21, "3-5", 200, "ltblue"],
	[13, "4-1", 250, "yellow"],
	[28, "4-2", 140, "red"],
	[2, "4-3", 200, "ltgray"],
	[19, "4-4", 300, "green"],
	[25, "4-5", 350, "lime"],
	[5, "5-1", 350, "dkblue"],
	[26, "5-2", 300, "pink"],
	[20, "5-3", 140, "ltblue"],
	[16, "5-4", 250, "yellow"],
	[9, "5-5", 200, "ltgray"],
	[22, "0-1", 200, "dkblue"],
	[8, "0-2", 350, "lime"],
	[2, "0-3", 140, "ltgray"],
	[26, "0-4", 300, "red"],
	[29, "0-5", 250, "ltblue"],
	[14, "1-1", 350, "pink"],
	[3, "1-2", 300, "yellow"],
	[15, "1-3", 140, "green"],
	[27, "1-4", 200, "ltgray"],
	[12, "1-5", 250, "dkblue"],
	[25, "2-1", 140, "pink"],
	[19, "2-2", 200, "red"],
	[23, "2-3", 300, "ltblue"],
	[7, "2-4", 350, "yellow"],
	[16, "2-5", 250, "lime"],
	[18, "3-1", 300, "green"],
	[21, "3-2", 250, "dkblue"],
	[30, "3-3", 350, "ltgray"],
	[9, "3-4", 140, "pink"],
	[6, "3-5", 200, "ltblue"],
	[28, "4-1", 250, "yellow"],
	[13, "4-2", 140, "red"],
	[17, "4-3", 200, "ltgray"],
	[4, "4-4", 300, "green"],
	[10, "4-5", 350, "lime"],
	[20, "5-1", 350, "dkblue"],
	[11, "5-2", 300, "pink"],
	[5, "5-3", 140, "ltblue"],
	[1, "5-4", 250, "yellow"],
	[24, "5-5", 200, "ltgray"],
];

/**
 * Port of After Dark in CSS "Hard Rain" (MIT): colored rings grow where
 * drops land, staggered on a 4.5 s cycle in 0.15 s steps.
 */
export const ClassicyScreenSaverHardRain: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = HardRainConfigSchema.safeParse(config);
	const count = parsed.success ? parsed.data.drops : 60;
	return (
		<div className="classicySaverHardRain">
			{DROPS.slice(0, count).map(([t, p, size, color], i) => {
				const [top, left] = POSITIONS[p];
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: the drop list is static; index is identity
						key={i}
						className="classicySaverHardRainDrop"
						style={
							{
								top: `${top}%`,
								left: `${left}%`,
								"--classicy-saver-hardrain-size": `${size}px`,
								"--classicy-saver-hardrain-color": COLORS[color],
								animationDelay: `${(-(4.5 - 0.15 * t)).toFixed(2)}s`,
							} as CSSProperties
						}
					/>
				);
			})}
		</div>
	);
};
