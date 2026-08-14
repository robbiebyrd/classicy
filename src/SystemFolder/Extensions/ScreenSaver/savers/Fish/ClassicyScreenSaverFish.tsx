import "./ClassicyScreenSaverFish.scss";
import bubbles from "./bubbles_50.webp";
import fishAngel from "./fish-angel.webp";
import fishButterfly from "./fish-butterfly.webp";
import fishFlounder from "./fish-flounder.webp";
import fishGuppy from "./fish-guppy.webp";
import fishJelly from "./fish-jelly.webp";
import fishMinnow from "./fish-minnow.webp";
import fishRed from "./fish-red.webp";
import fishSeahorse from "./fish-seahorse.webp";
import fishStriped from "./fish-striped.webp";
import seafloor from "./seafloor.webp";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const FishConfigSchema = z.looseObject({
	fish: z
		.number()
		.int()
		.min(1)
		.max(16)
		.default(16)
		.describe("How many fish swim in the aquarium."),
});

const SPRITES: Record<string, string> = {
	butterfly: String(fishButterfly),
	guppy: String(fishGuppy),
	seahorse: String(fishSeahorse),
	jelly: String(fishJelly),
	minnow: String(fishMinnow),
	red: String(fishRed),
	striped: String(fishStriped),
	angel: String(fishAngel),
	flounder: String(fishFlounder),
};

/** Route classes match the original's speed/delay/direction variants. */
const FISH: [sprite: string, row: number, route: string][] = [
	["butterfly", 1, "ltr"],
	["jelly", 1, "rtlFast"],
	["guppy", 2, "rtl"],
	["angel", 2, "rtlDelay1"],
	// The original's seahorse carries a typo'd class ("rtl-delay-2") and never
	// swims; ported with the intended route instead.
	["seahorse", 3, "rtlDelay2"],
	["red", 4, "rtlDelay2"],
	["jelly", 4, "ltr"],
	["minnow", 5, "rtl"],
	["seahorse", 5, "ltrFast"],
	["angel", 6, "rtlFast"],
	["striped", 7, "ltr"],
	["guppy", 7, "ltrDelay1"],
	["angel", 8, "ltrDelay2"],
	["minnow", 8, "rtlDelay2"],
	["flounder", 9, "rtl"],
	["red", 9, "ltrDelay1"],
];

/**
 * Port of After Dark in CSS "Fish" (MIT), After Dark's aquarium: nine species
 * swim lanes across a seafloor while a bubble column rises.
 */
export const ClassicyScreenSaverFish: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = FishConfigSchema.safeParse(config);
	const count = parsed.success ? parsed.data.fish : 16;
	return (
		<div
			className="classicySaverFish"
			style={
				{
					"--classicy-saver-fish-seafloor": `url(${String(seafloor)})`,
					"--classicy-saver-fish-bubbles": `url(${String(bubbles)})`,
				} as CSSProperties
			}
		>
			<b className="classicySaverFishBubbles" />
			{FISH.slice(0, count).map(([sprite, row, route], i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: the school is static; index is identity
					key={i}
					className={`classicySaverFishFish classicySaverFishRoute-${route}`}
					style={{
						top: `${(row - 1) * 9}%`,
						backgroundImage: `url(${SPRITES[sprite]})`,
					}}
				/>
			))}
		</div>
	);
};
