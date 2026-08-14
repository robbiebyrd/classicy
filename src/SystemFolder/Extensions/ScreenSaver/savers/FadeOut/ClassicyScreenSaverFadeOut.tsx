import "./ClassicyScreenSaverFadeOut.scss";
import type { FC as FunctionalComponent } from "react";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

/**
 * Port of After Dark in CSS "Fade Out" (MIT). The original faded a desktop
 * screenshot to black; registered with `transparentBackground`, this one dims
 * the live Classicy desktop itself.
 */
export const ClassicyScreenSaverFadeOut: FunctionalComponent<
	ClassicyScreenSaverProps
> = () => <div className="classicySaverFadeOut" />;
