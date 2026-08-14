import { registerClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import {
	BouncingBallConfigSchema,
	ClassicyScreenSaverBouncingBall,
	ClassicyScreenSaverBouncingBallOptions,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/BouncingBall/ClassicyScreenSaverBouncingBall";
import { ClassicyScreenSaverFadeOut } from "@/SystemFolder/Extensions/ScreenSaver/savers/FadeOut/ClassicyScreenSaverFadeOut";
import {
	ClassicyScreenSaverFish,
	FishConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Fish/ClassicyScreenSaverFish";
import {
	ClassicyScreenSaverFlyingToasters,
	FlyingToastersConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/FlyingToasters/ClassicyScreenSaverFlyingToasters";
import { ClassicyScreenSaverGlobe } from "@/SystemFolder/Extensions/ScreenSaver/savers/Globe/ClassicyScreenSaverGlobe";
import {
	ClassicyScreenSaverHardRain,
	HardRainConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/HardRain/ClassicyScreenSaverHardRain";
import { ClassicyScreenSaverLogo } from "@/SystemFolder/Extensions/ScreenSaver/savers/Logo/ClassicyScreenSaverLogo";
import {
	ClassicyScreenSaverMessages,
	MessagesConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Messages/ClassicyScreenSaverMessages";
import {
	ClassicyScreenSaverMessages2,
	Messages2ConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Messages2/ClassicyScreenSaverMessages2";
import {
	ClassicyScreenSaverRainstorm,
	RainstormConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Rainstorm/ClassicyScreenSaverRainstorm";
import { ClassicyScreenSaverSpotlight } from "@/SystemFolder/Extensions/ScreenSaver/savers/Spotlight/ClassicyScreenSaverSpotlight";
import {
	ClassicyScreenSaverWarp,
	WarpConfigSchema,
} from "@/SystemFolder/Extensions/ScreenSaver/savers/Warp/ClassicyScreenSaverWarp";

/**
 * The stock library: every screensaver from bryanbraun/after-dark-css `all/`
 * (HTML/CSS under MIT; sprite artwork © Berkeley Systems). Ids match the
 * original file names. A consumer can replace any of these by re-registering
 * the same id.
 */
registerClassicyScreenSaver({
	id: "bouncing-ball",
	name: "Bouncing Ball",
	component: ClassicyScreenSaverBouncingBall,
	configSchema: BouncingBallConfigSchema,
	// Custom options UI — the reference example for saver authors.
	configComponent: ClassicyScreenSaverBouncingBallOptions,
});

registerClassicyScreenSaver({
	id: "fade-out",
	name: "Fade Out",
	component: ClassicyScreenSaverFadeOut,
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "fish",
	name: "Fish",
	component: ClassicyScreenSaverFish,
	configSchema: FishConfigSchema,
});

registerClassicyScreenSaver({
	id: "flying-toasters",
	name: "Flying Toasters",
	component: ClassicyScreenSaverFlyingToasters,
	configSchema: FlyingToastersConfigSchema,
});

registerClassicyScreenSaver({
	id: "globe",
	name: "Globe",
	component: ClassicyScreenSaverGlobe,
});

registerClassicyScreenSaver({
	id: "hard-rain",
	name: "Hard Rain",
	component: ClassicyScreenSaverHardRain,
	configSchema: HardRainConfigSchema,
});

registerClassicyScreenSaver({
	id: "logo",
	name: "Logo",
	component: ClassicyScreenSaverLogo,
});

registerClassicyScreenSaver({
	id: "messages",
	name: "Messages",
	component: ClassicyScreenSaverMessages,
	configSchema: MessagesConfigSchema,
});

registerClassicyScreenSaver({
	id: "messages2",
	name: "Messages 2",
	component: ClassicyScreenSaverMessages2,
	configSchema: Messages2ConfigSchema,
});

registerClassicyScreenSaver({
	id: "rainstorm",
	name: "Rainstorm",
	component: ClassicyScreenSaverRainstorm,
	configSchema: RainstormConfigSchema,
});

registerClassicyScreenSaver({
	id: "spotlight",
	name: "Spotlight",
	component: ClassicyScreenSaverSpotlight,
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "warp",
	name: "Warp",
	component: ClassicyScreenSaverWarp,
	configSchema: WarpConfigSchema,
});
