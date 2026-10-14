import "./ClassicyScreenSaverGlobe.scss";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import globeSprite from "./globe_240.webp";

/**
 * Port of After Dark in CSS "Globe" (MIT): a spinning Earth (21-frame sprite
 * strip, 240px per frame) bouncing off the screen edges.
 */
export const ClassicyScreenSaverGlobe: FunctionalComponent<
	ClassicyScreenSaverProps
> = () => (
	<div
		className="classicySaverGlobe"
		style={{ "--classicy-saver-globe": `url(${globeSprite})` } as CSSProperties}
	>
		<div className="classicySaverGlobeBall" />
	</div>
);
