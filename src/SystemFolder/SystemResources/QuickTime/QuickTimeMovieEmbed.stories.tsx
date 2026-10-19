import type { Meta, StoryObj } from "@storybook/react-vite";
import sampleMovie from "@vid/quicktime/sample.mp4?no-inline";
import { useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { QuickTimeVideoEmbed } from "./QuickTimeMovieEmbed";

const meta = {
	title: "Controls/QuickTime",
	component: QuickTimeVideoEmbed,
	decorators: [
		(Story) => (
			<div style={{ width: 480 }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof QuickTimeVideoEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The layout Movie Player uses: `controlsDocked` pins the controller bar to
 * the bottom of the nearest positioned container. Keyboard shortcuts are
 * inactive here, because they only follow a focused Movie Player window.
 */
export const DockedControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: true,
	},
};

/**
 * With `controlsDocked` off, the controller bar flows directly beneath the
 * picture: play/pause, seek bar and time, ±10 s, volume pop-up, fullscreen.
 */
export const OverlayControls: Story = {
	args: {
		appId: "storybook.app",
		name: "Sample Movie",
		url: sampleMovie,
		type: "video",
		controlsDocked: false,
	},
};

const ExternalTransport = () => {
	const [playing, setPlaying] = useState(false);
	const [volume, setVolume] = useState(0.5);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<QuickTimeVideoEmbed
				appId="storybook.app"
				name="Sample Movie"
				url={sampleMovie}
				type="video"
				hideControls
				playing={playing}
				onPlayingChange={setPlaying}
				volume={volume}
				onVolumeChange={setVolume}
			/>
			<div style={{ display: "flex", gap: 8 }}>
				<ClassicyButton onClickFunc={() => setPlaying(!playing)}>
					{playing ? "Pause" : "Play"}
				</ClassicyButton>
				<ClassicyButton onClickFunc={() => setVolume(volume > 0 ? 0 : 0.5)}>
					{volume > 0 ? "Mute" : "Unmute"}
				</ClassicyButton>
			</div>
		</div>
	);
};

/**
 * Controlled playback with the built-in chrome hidden: `playing` and
 * `volume` are owned by the parent and driven from ordinary buttons, the
 * pattern for a host that supplies its own transport (`hideControls` also
 * disables the keyboard shortcuts).
 */
export const ControlledPlayback: Story = {
	render: () => <ExternalTransport />,
};
