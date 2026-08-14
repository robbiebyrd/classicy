import "./ClassicyScreenSaverMessages.scss";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { z } from "zod";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const MessagesConfigSchema = z.looseObject({
	text: z.string().default("OUT TO LUNCH").describe("The message to crawl."),
	speedSeconds: z
		.number()
		.min(2)
		.max(60)
		.default(10)
		.describe("Seconds one crawl across the screen takes."),
});

/**
 * Port of After Dark in CSS "Messages" (MIT): a marquee crawling right to
 * left while stepping down the screen. Uses the theme's UI font in place of
 * the original's bundled ChicagoFLF.
 */
export const ClassicyScreenSaverMessages: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config }) => {
	const parsed = MessagesConfigSchema.safeParse(config);
	const { text, speedSeconds } = parsed.success
		? parsed.data
		: { text: "OUT TO LUNCH", speedSeconds: 10 };
	return (
		<div className="classicySaverMessages">
			<span
				className="classicySaverMessagesText"
				style={
					{
						"--classicy-saver-messages-speed": `${speedSeconds}s`,
					} as CSSProperties
				}
			>
				{text}
			</span>
		</div>
	);
};
