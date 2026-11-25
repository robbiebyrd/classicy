import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { windows98SaverClassNames } from "../windows98SaverClassNames";

/**
 * Windows 98's Blank Screen (scrnsave.scr): the screen black, nothing moving.
 * It had no options ("This screen saver has no options that you can
 * configure."), and it is the package's default saver: Windows 98 named none
 * (Setup wrote no `SCRNSAVE.EXE`), and Blank Screen is the one that, like no
 * saver at all, shows nothing.
 */
export const ClassicyScreenSaverBlankScreen: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ className, style }) => (
	<div
		className={windows98SaverClassNames("classicySaverBlankScreen", className)}
		style={style}
	/>
);
