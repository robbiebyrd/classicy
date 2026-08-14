import "./ClassicyScreenSaverSpotlight.scss";
import spotlightBg from "./spotlight_bg.webp";
import type { FC as FunctionalComponent } from "react";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

/**
 * Port of After Dark in CSS "Spotlight" (MIT): a huge black PNG with a
 * transparent circular hole drifts over the screen. Registered with
 * `transparentBackground`, so the hole reveals the live desktop.
 */
export const ClassicyScreenSaverSpotlight: FunctionalComponent<
	ClassicyScreenSaverProps
> = () => (
	<div className="classicySaverSpotlight">
		<img
			className="classicySaverSpotlightMask"
			src={String(spotlightBg)}
			alt=""
		/>
	</div>
);
