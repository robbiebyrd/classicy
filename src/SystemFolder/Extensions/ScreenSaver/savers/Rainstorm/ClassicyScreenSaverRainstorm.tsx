import "./ClassicyScreenSaverRainstorm.scss";
import rainDistant from "./rain-tile-distant.webp";
import rainMid from "./rain-tile-mid.webp";
import rainNear from "./rain-tile-near.webp";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const RainstormConfigSchema = z.looseObject({
	intensity: z
		.enum(["light", "medium", "heavy"])
		.default("heavy")
		.describe("How many layers of rain fall."),
	lightning: z
		.boolean()
		.default(true)
		.describe("Flash lightning every few seconds."),
});

const tiles = {
	near: String(rainNear),
	mid: String(rainMid),
	distant: String(rainDistant),
};

/** All six layers from the original, nearest first. */
const LAYERS: { tile: keyof typeof tiles; duration: number; delay: number }[] =
	[
		{ tile: "near", duration: 2.2, delay: 0 },
		{ tile: "near", duration: 2.2, delay: 1 },
		{ tile: "mid", duration: 4, delay: 0 },
		{ tile: "mid", duration: 4.5, delay: 3.2 },
		{ tile: "distant", duration: 6, delay: 0 },
		{ tile: "distant", duration: 6, delay: 4 },
	];

const layersFor = (intensity: "light" | "medium" | "heavy") => {
	if (intensity === "light") return LAYERS.slice(4); // distant only
	if (intensity === "medium") return LAYERS.slice(2); // mid + distant
	return LAYERS;
};

/**
 * Port of After Dark in CSS "Rainstorm" (MIT): three depths of tiled rain
 * falling at an angle, with a periodic lightning flash.
 */
export const ClassicyScreenSaverRainstorm: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = RainstormConfigSchema.safeParse(config);
	const { intensity, lightning } = parsed.success
		? parsed.data
		: ({ intensity: "heavy", lightning: true } as const);
	return (
		<div
			className={`classicySaverRainstorm${lightning ? " classicySaverRainstormLightning" : ""}`}
		>
			{layersFor(intensity).map((layer, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: layers are static config, order is identity
					key={i}
					className="classicySaverRainstormRain"
					style={
						{
							"--classicy-saver-rain-tile": `url(${tiles[layer.tile]})`,
							animationDuration: `${layer.duration}s`,
							animationDelay: `${layer.delay}s`,
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
};
