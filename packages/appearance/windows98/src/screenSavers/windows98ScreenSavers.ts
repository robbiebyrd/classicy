import { registerClassicyScreenSaver } from "@classicy/classicy";
import { ClassicyScreenSaverBlankScreen } from "./BlankScreen/ClassicyScreenSaverBlankScreen";
import {
	ClassicyScreenSaverCurvesAndColors,
	CurvesAndColorsConfigSchema,
} from "./CurvesAndColors/ClassicyScreenSaverCurvesAndColors";
import {
	ClassicyScreenSaverFlyingThroughSpace,
	FlyingThroughSpaceConfigSchema,
} from "./FlyingThroughSpace/ClassicyScreenSaverFlyingThroughSpace";
import {
	ClassicyScreenSaverFlyingWindows,
	FlyingWindowsConfigSchema,
} from "./FlyingWindows/ClassicyScreenSaverFlyingWindows";
import {
	ClassicyScreenSaverMystify,
	MystifyConfigSchema,
} from "./Mystify/ClassicyScreenSaverMystify";
import {
	ClassicyScreenSaverPipes,
	PipesConfigSchema,
} from "./Pipes/ClassicyScreenSaverPipes";
import {
	ClassicyScreenSaverScrollingMarquee,
	ScrollingMarqueeConfigSchema,
} from "./ScrollingMarquee/ClassicyScreenSaverScrollingMarquee";

// Windows 98's screen savers, each a port of its .scr on the Windows 98 Second
// Edition CD (docs/windows98-asset-inventory.md, "Screen savers"): the five
// Setup's Additional Screen Savers component installed (Blank Screen, Curves
// and Colors, Flying Through Space, Mystify Your Mind, Scrolling Marquee),
// Flying Windows, its own component, and 3D Pipes, one of the OpenGL Screen
// Savers. Each is offered under Windows 98 only, by the name the Display
// control panel listed it under (the long name Setup gave its file,
// applets.inf), with the options its Settings dialog had. index.ts imports
// this module before it registers the package, whose `defaultScreenSaver`
// names Blank Screen.

/** The packages Windows 98's savers are offered under. */
const SAVER_PACKAGES: readonly string[] = Object.freeze(["windows98"]);

/** The savers' ids, in the Display control panel's (alphabetical) order. */
export const WINDOWS98_SCREEN_SAVER_IDS = [
	"3d-pipes",
	"blank-screen",
	"curves-and-colors",
	"flying-through-space",
	"flying-windows",
	"mystify-your-mind",
	"scrolling-marquee",
] as const;

/** Windows 98's default saver: it named none, and Blank Screen shows nothing. */
export const WINDOWS98_DEFAULT_SCREEN_SAVER = "blank-screen";

registerClassicyScreenSaver({
	id: "3d-pipes",
	packages: SAVER_PACKAGES,
	name: "3D Pipes",
	component: ClassicyScreenSaverPipes,
	configSchema: PipesConfigSchema,
});

registerClassicyScreenSaver({
	id: "blank-screen",
	packages: SAVER_PACKAGES,
	name: "Blank Screen",
	component: ClassicyScreenSaverBlankScreen,
});

registerClassicyScreenSaver({
	id: "curves-and-colors",
	packages: SAVER_PACKAGES,
	name: "Curves and Colors",
	component: ClassicyScreenSaverCurvesAndColors,
	configSchema: CurvesAndColorsConfigSchema,
	// Clear screen off, it draws over the desktop; on, the saver paints the
	// screen black itself.
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "flying-through-space",
	packages: SAVER_PACKAGES,
	name: "Flying Through Space",
	component: ClassicyScreenSaverFlyingThroughSpace,
	configSchema: FlyingThroughSpaceConfigSchema,
});

registerClassicyScreenSaver({
	id: "flying-windows",
	packages: SAVER_PACKAGES,
	name: "Flying Windows",
	component: ClassicyScreenSaverFlyingWindows,
	configSchema: FlyingWindowsConfigSchema,
});

registerClassicyScreenSaver({
	id: "mystify-your-mind",
	packages: SAVER_PACKAGES,
	name: "Mystify Your Mind",
	component: ClassicyScreenSaverMystify,
	configSchema: MystifyConfigSchema,
	// Clear screen off, it draws over the desktop; on, the saver paints the
	// screen black itself.
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "scrolling-marquee",
	packages: SAVER_PACKAGES,
	name: "Scrolling Marquee",
	component: ClassicyScreenSaverScrollingMarquee,
	configSchema: ScrollingMarqueeConfigSchema,
});
