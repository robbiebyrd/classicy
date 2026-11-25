// Windows 98's screen savers, each drawn in a box. Importing the package
// (through Storybook's Windows 98 helpers) registers them; the stories sit
// under "Appearance/Windows 98/Screen Savers".
import {
	type ClassicyScreenSaverConfig,
	getClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@classicy/classicy";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FC } from "react";
// Registers Windows 98 (and so its savers) in this story's iframe.
import "@sb/windows98";
import { WINDOWS98_SCREEN_SAVER_IDS } from "./windows98ScreenSavers";

type Windows98ScreenSaverPreviewProps = {
	/** Id of one of Windows 98's savers (e.g. `"flying-windows"`). */
	saverId: string;
	/** Option values, merged over the saver's defaults as the overlay merges them. */
	config?: ClassicyScreenSaverConfig;
};

/**
 * One saver in a 640 × 480 box, Windows 98's own screen size, instead of the
 * full-viewport overlay. A saver that may draw over the desktop (Clear screen
 * off) shows the teal of Windows Standard's desktop behind it.
 */
const Windows98ScreenSaverPreview: FC<Windows98ScreenSaverPreviewProps> = ({
	saverId,
	config,
}) => {
	const saver = getClassicyScreenSaver(saverId);
	if (!saver) return <p>No screen saver is registered as “{saverId}”.</p>;
	const Saver = saver.component;
	return (
		<div
			role="presentation"
			style={{
				position: "relative",
				width: 640,
				height: 480,
				overflow: "hidden",
				background: saver.transparentBackground
					? "var(--desktop-background-color, teal)"
					: "var(--color-black, black)",
			}}
		>
			<Saver config={resolveScreenSaverConfig(saver, config)} />
		</div>
	);
};

/**
 * Windows 98's screen savers, each a port of its `.scr` on the Windows 98
 * Second Edition CD, with the options its Settings dialog had and the
 * defaults it read: they run on Windows 98's 55 ms timer tick, draw whole
 * pixels and erase by drawing in black, show one still frame under reduced
 * motion and stop while the page is hidden. Offered under Windows 98 only;
 * Blank Screen is the default.
 */
const meta = {
	title: "Appearance/Windows 98/Screen Savers",
	component: Windows98ScreenSaverPreview,
	argTypes: {
		saverId: { control: "select", options: [...WINDOWS98_SCREEN_SAVER_IDS] },
	},
} satisfies Meta<typeof Windows98ScreenSaverPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** White stars streaming out of the center, the warp speeding up. */
export const FlyingThroughSpace: Story = {
	args: { saverId: "flying-through-space" },
};

/** Wingdings' Windows logo, in the default palette's colors. */
export const FlyingWindows: Story = {
	args: { saverId: "flying-windows" },
};

/** Two polygons trailing their outlines, fading from color to color. */
export const MystifyYourMind: Story = {
	args: { saverId: "mystify-your-mind" },
};

/** Mystify with Clear screen off: it draws over (here) the teal desktop. */
export const MystifyOverTheDesktop: Story = {
	args: { saverId: "mystify-your-mind", config: { clearScreen: false } },
};

/** A closed Bezier curve and its trail, stepping through the hues. */
export const CurvesAndColors: Story = {
	args: { saverId: "curves-and-colors", config: { lines: 20 } },
};

/** "Where do you want to go today?" in red 72-point Arial, at random heights. */
export const ScrollingMarquee: Story = {
	args: { saverId: "scrolling-marquee" },
};

/** Pipes growing through space (WebGL). */
export const Pipes: Story = {
	args: { saverId: "3d-pipes", config: { pipes: "Multiple" } },
};

/** Textured pipes, the .scr's own red and white stripes. */
export const TexturedPipes: Story = {
	args: {
		saverId: "3d-pipes",
		config: { surfaceStyle: "Textured", jointType: "Ball", resolution: 200 },
	},
};

/** Flex pipes, bending in wide arcs. */
export const FlexPipes: Story = {
	args: {
		saverId: "3d-pipes",
		config: { pipeStyle: "Flex", pipes: "Multiple" },
	},
};

/** The default: the screen black. */
export const BlankScreen: Story = {
	args: { saverId: "blank-screen" },
};
