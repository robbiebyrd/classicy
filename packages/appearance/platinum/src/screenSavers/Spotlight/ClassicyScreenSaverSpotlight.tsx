import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { saverClassNames } from "../saverClassNames";
import spotlightBg from "./spotlight_bg.webp";

/**
 * Port of After Dark in CSS "Spotlight" (MIT): a huge black PNG with a
 * transparent circular hole drifts over the screen. Registered with
 * `transparentBackground`, so the hole reveals the live desktop.
 */
export const ClassicyScreenSaverSpotlight: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ className, style }) => (
	<div
		className={saverClassNames("classicySaverSpotlight", className)}
		style={style}
	>
		<img
			className="classicySaverSpotlightMask"
			src={String(spotlightBg)}
			alt=""
		/>
	</div>
);
