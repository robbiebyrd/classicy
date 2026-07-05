import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const pauseButton = ClassicyIcons.system.quicktime.pauseButton;
const playButton = ClassicyIcons.system.quicktime.playButton;

export const QuickTimePlayPauseButton: FunctionalComponent<{
	playing: boolean;
	onToggle: () => void;
}> = ({ playing, onToggle }) => (
	<button
		type="button"
		onClick={onToggle}
		className={"quickTimePlayerVideoControlsButton"}
	>
		<img
			className={"quickTimePlayerVideoControlsIcon"}
			src={playing ? pauseButton : playButton}
			alt={playing ? "Pause" : "Play"}
		/>
	</button>
);
