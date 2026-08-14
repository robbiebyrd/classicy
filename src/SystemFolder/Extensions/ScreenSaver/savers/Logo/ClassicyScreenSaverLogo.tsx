import "./ClassicyScreenSaverLogo.scss";
import logo from "./logo.webp";
import type { FC as FunctionalComponent } from "react";
import type { ClassicyScreenSaverProps } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

/** Port of After Dark in CSS "Logo" (MIT): the bouncing Berkeley Systems mark. */
export const ClassicyScreenSaverLogo: FunctionalComponent<
	ClassicyScreenSaverProps
> = () => (
	<div className="classicySaverLogo">
		<img className="classicySaverLogoMark" src={String(logo)} alt="" />
	</div>
);
