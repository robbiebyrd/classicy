import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { saverClassNames } from "../saverClassNames";

/**
 * Port of After Dark in CSS "Fade Out" (MIT). The original faded a desktop
 * screenshot to black; registered with `transparentBackground`, this one dims
 * the live Classicy desktop itself.
 */
export const ClassicyScreenSaverFadeOut: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ className, style }) => (
	<div
		className={saverClassNames("classicySaverFadeOut", className)}
		style={style}
	/>
);
