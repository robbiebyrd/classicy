import { registerClassicyScreenSaver } from "@classicy/classicy";
import {
	BouncingBallConfigSchema,
	ClassicyScreenSaverBouncingBall,
	ClassicyScreenSaverBouncingBallOptions,
} from "./BouncingBall/ClassicyScreenSaverBouncingBall";
import { ClassicyScreenSaverFadeOut } from "./FadeOut/ClassicyScreenSaverFadeOut";
import {
	ClassicyScreenSaverFish,
	FishConfigSchema,
} from "./Fish/ClassicyScreenSaverFish";
import {
	ClassicyScreenSaverFlyingToasters,
	FlyingToastersConfigSchema,
} from "./FlyingToasters/ClassicyScreenSaverFlyingToasters";
import { ClassicyScreenSaverGlobe } from "./Globe/ClassicyScreenSaverGlobe";
import {
	ClassicyScreenSaverHardRain,
	HardRainConfigSchema,
} from "./HardRain/ClassicyScreenSaverHardRain";
import {
	ClassicyScreenSaverLogo,
	ClassicyScreenSaverLogoOptions,
	LogoConfigSchema,
} from "./Logo/ClassicyScreenSaverLogo";
import {
	ClassicyScreenSaverMessages,
	MessagesConfigSchema,
} from "./Messages/ClassicyScreenSaverMessages";
import {
	ClassicyScreenSaverMessages2,
	Messages2ConfigSchema,
} from "./Messages2/ClassicyScreenSaverMessages2";
import {
	ClassicyScreenSaverRainstorm,
	RainstormConfigSchema,
} from "./Rainstorm/ClassicyScreenSaverRainstorm";
import { ClassicyScreenSaverSpotlight } from "./Spotlight/ClassicyScreenSaverSpotlight";
import {
	ClassicyScreenSaverWarp,
	WarpConfigSchema,
} from "./Warp/ClassicyScreenSaverWarp";

// Platinum's screen savers (plan 0016-vbq §2.1): every screensaver from
// bryanbraun/after-dark-css `all/` (HTML/CSS under MIT; sprite artwork ©
// Berkeley Systems). Ids match the original file names. Each is offered under
// Platinum only; index.ts imports this module before it registers the
// package, whose `defaultScreenSaver` names one of them. A consumer can
// replace any of these by re-registering the same id, and offer one under its
// own package too by re-registering it from the exported parts with both ids
// (`packages: ["platinum", "mine"]`).

/** The packages Platinum's savers are offered under. */
const PLATINUM_PACKAGES: readonly string[] = Object.freeze(["platinum"]);

registerClassicyScreenSaver({
	id: "bouncing-ball",
	packages: PLATINUM_PACKAGES,
	name: "Bouncing Ball",
	component: ClassicyScreenSaverBouncingBall,
	configSchema: BouncingBallConfigSchema,
	// Custom options UI — the reference example for saver authors.
	configComponent: ClassicyScreenSaverBouncingBallOptions,
});

registerClassicyScreenSaver({
	id: "fade-out",
	packages: PLATINUM_PACKAGES,
	name: "Fade Out",
	component: ClassicyScreenSaverFadeOut,
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "fish",
	packages: PLATINUM_PACKAGES,
	name: "Fish",
	component: ClassicyScreenSaverFish,
	configSchema: FishConfigSchema,
});

registerClassicyScreenSaver({
	id: "flying-toasters",
	packages: PLATINUM_PACKAGES,
	name: "Flying Toasters",
	component: ClassicyScreenSaverFlyingToasters,
	configSchema: FlyingToastersConfigSchema,
});

registerClassicyScreenSaver({
	id: "globe",
	packages: PLATINUM_PACKAGES,
	name: "Globe",
	component: ClassicyScreenSaverGlobe,
});

registerClassicyScreenSaver({
	id: "hard-rain",
	packages: PLATINUM_PACKAGES,
	name: "Hard Rain",
	component: ClassicyScreenSaverHardRain,
	configSchema: HardRainConfigSchema,
});

registerClassicyScreenSaver({
	id: "logo",
	packages: PLATINUM_PACKAGES,
	name: "Logo",
	component: ClassicyScreenSaverLogo,
	configSchema: LogoConfigSchema,
	// A live pop-up of registered logos (`registerClassicyScreenSaverLogo`).
	configComponent: ClassicyScreenSaverLogoOptions,
});

registerClassicyScreenSaver({
	id: "messages",
	packages: PLATINUM_PACKAGES,
	name: "Messages",
	component: ClassicyScreenSaverMessages,
	configSchema: MessagesConfigSchema,
});

registerClassicyScreenSaver({
	id: "messages2",
	packages: PLATINUM_PACKAGES,
	name: "Messages 2",
	component: ClassicyScreenSaverMessages2,
	configSchema: Messages2ConfigSchema,
});

registerClassicyScreenSaver({
	id: "rainstorm",
	packages: PLATINUM_PACKAGES,
	name: "Rainstorm",
	component: ClassicyScreenSaverRainstorm,
	configSchema: RainstormConfigSchema,
});

registerClassicyScreenSaver({
	id: "spotlight",
	packages: PLATINUM_PACKAGES,
	name: "Spotlight",
	component: ClassicyScreenSaverSpotlight,
	transparentBackground: true,
});

registerClassicyScreenSaver({
	id: "warp",
	packages: PLATINUM_PACKAGES,
	name: "Warp",
	component: ClassicyScreenSaverWarp,
	configSchema: WarpConfigSchema,
});
