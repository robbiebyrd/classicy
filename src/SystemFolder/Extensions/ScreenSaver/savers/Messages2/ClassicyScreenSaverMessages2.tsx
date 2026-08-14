import "./ClassicyScreenSaverMessages2.scss";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const Messages2ConfigSchema = z.looseObject({
	text: z
		.string()
		.default("Why are you staring at my Macintosh?")
		.describe("The message that bounces around the screen."),
});

/**
 * Port of After Dark in CSS "Messages 2" (MIT): a fixed-width message block
 * bouncing around the screen like the classic DVD logo. Theme UI font stands
 * in for the original's ChicagoFLF.
 */
export const ClassicyScreenSaverMessages2: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = Messages2ConfigSchema.safeParse(config);
	const text = parsed.success
		? parsed.data.text
		: "Why are you staring at my Macintosh?";
	return (
		<div className="classicySaverMessages2">
			<span className="classicySaverMessages2Text">{text}</span>
		</div>
	);
};
