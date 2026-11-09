import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicyScreenSaverBouncingBall,
	ClassicyScreenSaverBouncingBallOptions,
} from "./BouncingBall/ClassicyScreenSaverBouncingBall";
import { ClassicyScreenSaverFadeOut } from "./FadeOut/ClassicyScreenSaverFadeOut";
import { ClassicyScreenSaverFish } from "./Fish/ClassicyScreenSaverFish";
import { ClassicyScreenSaverFlyingToasters } from "./FlyingToasters/ClassicyScreenSaverFlyingToasters";
import { ClassicyScreenSaverGlobe } from "./Globe/ClassicyScreenSaverGlobe";
import { ClassicyScreenSaverHardRain } from "./HardRain/ClassicyScreenSaverHardRain";
import {
	ClassicyScreenSaverLogo,
	ClassicyScreenSaverLogoOptions,
} from "./Logo/ClassicyScreenSaverLogo";
import { ClassicyScreenSaverMessages } from "./Messages/ClassicyScreenSaverMessages";
import { ClassicyScreenSaverMessages2 } from "./Messages2/ClassicyScreenSaverMessages2";
import { ClassicyScreenSaverRainstorm } from "./Rainstorm/ClassicyScreenSaverRainstorm";
import { ClassicyScreenSaverSpotlight } from "./Spotlight/ClassicyScreenSaverSpotlight";
import { ClassicyScreenSaverWarp } from "./Warp/ClassicyScreenSaverWarp";

/**
 * The passthrough rows for Platinum's screen savers (moved from the core's
 * ClassicyPassthrough.more.test.tsx with the savers, plan 0016-vbq §2.1):
 * each merges `className` after its own root class and `style` after its own.
 */

const HOST = "host";
const STYLE = { marginTop: 7 };
const noop = () => {};

type Row = [name: string, render: () => ReactElement, rootSelector: string];

const cases: Row[] = [
	[
		"ClassicyScreenSaverBouncingBall",
		() => (
			<ClassicyScreenSaverBouncingBall
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverBouncingBall",
	],
	[
		"ClassicyScreenSaverBouncingBallOptions (forwards to its spinner)",
		() => (
			<ClassicyScreenSaverBouncingBallOptions
				config={{}}
				onChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySpinnerHolder",
	],
	[
		"ClassicyScreenSaverFadeOut",
		() => (
			<ClassicyScreenSaverFadeOut config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverFadeOut",
	],
	[
		"ClassicyScreenSaverFish",
		() => (
			<ClassicyScreenSaverFish config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverFish",
	],
	[
		"ClassicyScreenSaverFlyingToasters",
		() => (
			<ClassicyScreenSaverFlyingToasters
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverFlyingToasters",
	],
	[
		"ClassicyScreenSaverGlobe",
		() => (
			<ClassicyScreenSaverGlobe config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverGlobe",
	],
	[
		"ClassicyScreenSaverHardRain",
		() => (
			<ClassicyScreenSaverHardRain config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverHardRain",
	],
	[
		"ClassicyScreenSaverLogo",
		() => (
			<ClassicyScreenSaverLogo config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverLogo",
	],
	[
		"ClassicyScreenSaverLogoOptions (forwards to its pop-up menu)",
		() => (
			<ClassicyScreenSaverLogoOptions
				config={{}}
				onChange={noop}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicyPopUpMenu",
	],
	[
		"ClassicyScreenSaverMessages",
		() => (
			<ClassicyScreenSaverMessages config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverMessages",
	],
	[
		"ClassicyScreenSaverMessages2",
		() => (
			<ClassicyScreenSaverMessages2
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverMessages2",
	],
	[
		"ClassicyScreenSaverRainstorm",
		() => (
			<ClassicyScreenSaverRainstorm
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverRainstorm",
	],
	[
		"ClassicyScreenSaverSpotlight",
		() => (
			<ClassicyScreenSaverSpotlight
				config={{}}
				className={HOST}
				style={STYLE}
			/>
		),
		".classicySaverSpotlight",
	],
	[
		"ClassicyScreenSaverWarp",
		() => (
			<ClassicyScreenSaverWarp config={{}} className={HOST} style={STYLE} />
		),
		".classicySaverWarp",
	],
];

const expectPassthrough = (el: Element | null) => {
	expect(el).toBeTruthy();
	const root = el as HTMLElement;
	expect((root.getAttribute("class") ?? "").split(" ")).toContain(HOST);
	expect(root.style.marginTop).toBe("7px");
};

describe("className and style passthrough (Platinum's screen savers)", () => {
	it.each(
		cases,
	)("%s merges className and style onto its root", (_name, make, rootSelector) => {
		const { container } = render(make());
		expectPassthrough(
			container.querySelector(rootSelector) ??
				document.querySelector(rootSelector),
		);
	});

	it("puts the host's class after the saver's own", () => {
		const { container } = render(
			<ClassicyScreenSaverFadeOut config={{}} className={HOST} />,
		);
		expect(
			container.querySelector(".classicySaverFadeOut")?.getAttribute("class"),
		).toBe(`classicySaverFadeOut ${HOST}`);
	});
});
