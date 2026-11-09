import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { saverClassNames } from "../saverClassNames";
import globeSprite from "./globe_240.webp";

/**
 * Port of After Dark in CSS "Globe" (MIT): a spinning Earth (21-frame sprite
 * strip, 240px per frame) bouncing off the screen edges.
 */
export const ClassicyScreenSaverGlobe: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ className, style }) => (
	<div
		className={saverClassNames("classicySaverGlobe", className)}
		style={
			{
				"--classicy-saver-globe": `url("${globeSprite}")`,
				...style,
			} as CSSProperties
		}
	>
		<div className="classicySaverGlobeBall" />
	</div>
);
