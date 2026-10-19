// Side-effect import: registers the twelve built-in After Dark savers.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FC } from "react";
import {
	type ClassicyScreenSaverConfig,
	getClassicyScreenSaver,
	listClassicyScreenSavers,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

type ScreenSaverPreviewProps = {
	/** Id of a registered saver (e.g. `"flying-toasters"`). */
	saverId: string;
	/**
	 * Saved option values, merged over the saver's defaults and validated
	 * against its `configSchema` exactly as the overlay does.
	 */
	config?: ClassicyScreenSaverConfig;
};

/**
 * Renders one registered saver in a fixed 480 × 300 box instead of the full
 * viewport. Savers draw with `position: absolute; inset: 0`, so they fill
 * any positioned container.
 */
const ScreenSaverPreview: FC<ScreenSaverPreviewProps> = ({
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
				width: 480,
				height: 300,
				overflow: "hidden",
				// Transparent savers reveal what is underneath; stand in for the
				// desktop with the theme's desktop colour.
				background: saver.transparentBackground
					? "var(--desktop-background-color, #6666cc)"
					: "var(--color-black, #000)",
			}}
		>
			<Saver config={resolveScreenSaverConfig(saver, config)} />
		</div>
	);
};

/**
 * `ScreenSaver.app` — an extension `ClassicyDesktop` mounts automatically.
 * After `timeoutMinutes` (default 5) of real-world inactivity (wall clock,
 * independent of the Date & Time virtual clock) it covers the desktop with
 * the selected saver; any input wakes it, and the waking keystroke or click
 * is swallowed. Users pick a saver, timeout and options in the Screen Saver
 * control panel; the Control Strip module offers Sleep Now and an on/off
 * toggle. Apps can dispatch
 * `ClassicyAppScreenSaverActivate`, `…SetSaver { saverId }`,
 * `…SetTimeout { minutes }`, `…SetEnabled { enabled }` and
 * `…SetConfig { saverId, config }`.
 *
 * Savers are plain components registered at module scope with
 * `registerClassicyScreenSaver({ id, name, component, configSchema?,
 * defaultConfig?, configComponent?, transparentBackground? })`;
 * re-registering an id replaces it. These stories render built-in savers
 * (ported from bryanbraun/after-dark-css) in a box rather than the real
 * full-viewport overlay, which also pauses animation for reduced-motion users.
 */
const meta = {
	title: "Extensions/ScreenSaver",
	component: ScreenSaverPreview,
	argTypes: {
		saverId: {
			control: "select",
			options: listClassicyScreenSavers().map((saver) => saver.id),
		},
	},
} satisfies Meta<typeof ScreenSaverPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default saver (`bouncing-ball`). Its `balls` option (1–12, default 3)
 * is edited through a custom `configComponent` — the reference example for
 * saver authors.
 */
export const BouncingBall: Story = {
	args: { saverId: "bouncing-ball", config: { balls: 5 } },
};

/**
 * After Dark's best-known saver. `toasters` (1–37) and `toast` (0–12) come
 * from its zod `configSchema`, so the control panel derives the options form.
 */
export const FlyingToasters: Story = {
	args: { saverId: "flying-toasters", config: { toasters: 12, toast: 6 } },
};

/** An aquarium of sprite fish over a sea floor; `fish` sets how many (1–16). */
export const Fish: Story = {
	args: { saverId: "fish" },
};

/**
 * A marquee crawling across the screen. `text` and `speedSeconds` are a
 * string and a number in the schema, so the derived form shows an input and
 * a spinner.
 */
export const Messages: Story = {
	args: {
		saverId: "messages",
		config: { text: "BACK IN FIVE MINUTES", speedSeconds: 8 },
	},
};

/** A starfield flying toward the viewer; `layers` (3–9) sets the density. */
export const Warp: Story = {
	args: { saverId: "warp" },
};

/**
 * A `transparentBackground` saver: the overlay skips its black fill so the
 * live desktop shows through the moving spotlight. Here a flat colour stands
 * in for the desktop.
 */
export const Spotlight: Story = {
	args: { saverId: "spotlight" },
};
