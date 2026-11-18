import { describe, expect, it } from "vitest";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	listClassicyScreenSaversFor,
	resolveClassicyScreenSaverFor,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverOffer";
import {
	getClassicyScreenSaver,
	listClassicyScreenSaversInRegistrationOrder,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import * as platinum from "../index";

// The After Dark ports Platinum ships (plan 0016-vbq §2.1), in the order it
// registers them: ids match bryanbraun/after-dark-css's file names.
const PLATINUM_SAVER_IDS = [
	"bouncing-ball",
	"fade-out",
	"fish",
	"flying-toasters",
	"globe",
	"hard-rain",
	"logo",
	"messages",
	"messages2",
	"rainstorm",
	"spotlight",
	"warp",
];

describe("Platinum's screen savers", () => {
	// Offered under Platinum and System 7, which bundles this same module
	// (design 0017-6me, "Screen savers"; plan 0018-dbd §3.8).
	it("Platinum registers the twelve savers under platinum and system7, with bouncing-ball as its default", () => {
		const savers = listClassicyScreenSaversInRegistrationOrder();
		expect(savers.map((saver) => saver.id)).toEqual(PLATINUM_SAVER_IDS);
		for (const saver of savers)
			expect(saver.packages, saver.id).toEqual(["platinum", "system7"]);
		expect(getClassicyAppearancePackage("platinum")?.defaultScreenSaver).toBe(
			"bouncing-ball",
		);
		expect(resolveClassicyScreenSaverFor("platinum")?.id).toBe("bouncing-ball");
		expect(listClassicyScreenSaversFor("platinum")).toHaveLength(12);
		// System 7 offers them too, before it registers; no other package does.
		expect(listClassicyScreenSaversFor("system7")).toHaveLength(12);
		expect(listClassicyScreenSaversFor("another-package")).toEqual([]);
	});

	it("exports every saver's component, schema and options UI under its 3.0 name", () => {
		const exported = platinum as Record<string, unknown>;
		const registered = (id: string) => getClassicyScreenSaver(id);
		const rows: [string, unknown][] = [
			[
				"ClassicyScreenSaverBouncingBall",
				registered("bouncing-ball")?.component,
			],
			["BouncingBallConfigSchema", registered("bouncing-ball")?.configSchema],
			[
				"ClassicyScreenSaverBouncingBallOptions",
				registered("bouncing-ball")?.configComponent,
			],
			["ClassicyScreenSaverFadeOut", registered("fade-out")?.component],
			["ClassicyScreenSaverFish", registered("fish")?.component],
			["FishConfigSchema", registered("fish")?.configSchema],
			[
				"ClassicyScreenSaverFlyingToasters",
				registered("flying-toasters")?.component,
			],
			[
				"FlyingToastersConfigSchema",
				registered("flying-toasters")?.configSchema,
			],
			["ClassicyScreenSaverGlobe", registered("globe")?.component],
			["ClassicyScreenSaverHardRain", registered("hard-rain")?.component],
			["HardRainConfigSchema", registered("hard-rain")?.configSchema],
			["ClassicyScreenSaverLogo", registered("logo")?.component],
			["LogoConfigSchema", registered("logo")?.configSchema],
			["ClassicyScreenSaverLogoOptions", registered("logo")?.configComponent],
			["ClassicyScreenSaverMessages", registered("messages")?.component],
			["MessagesConfigSchema", registered("messages")?.configSchema],
			["ClassicyScreenSaverMessages2", registered("messages2")?.component],
			["Messages2ConfigSchema", registered("messages2")?.configSchema],
			["ClassicyScreenSaverRainstorm", registered("rainstorm")?.component],
			["RainstormConfigSchema", registered("rainstorm")?.configSchema],
			["ClassicyScreenSaverSpotlight", registered("spotlight")?.component],
			["ClassicyScreenSaverWarp", registered("warp")?.component],
			["WarpConfigSchema", registered("warp")?.configSchema],
		];
		for (const [name, value] of rows) {
			expect(value, name).toBeDefined();
			expect(exported[name], name).toBe(value);
		}
		for (const name of [
			"registerClassicyScreenSaverLogo",
			"unregisterClassicyScreenSaverLogo",
			"getClassicyScreenSaverLogo",
			"listClassicyScreenSaverLogos",
			"useClassicyScreenSaverLogos",
			"resolveClassicyScreenSaverLogo",
			"CLASSICY_SCREEN_SAVER_LOGO_IDS",
			"CLASSICY_SCREEN_SAVER_DEFAULT_LOGO_ID",
		])
			expect(exported[name], name).toBeDefined();
	});

	it("the two transparent savers reveal the desktop", () => {
		expect(
			listClassicyScreenSaversInRegistrationOrder()
				.filter((saver) => saver.transparentBackground)
				.map((saver) => saver.id),
		).toEqual(["fade-out", "spotlight"]);
	});
});
