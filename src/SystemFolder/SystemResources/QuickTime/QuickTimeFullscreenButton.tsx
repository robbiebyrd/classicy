import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const fullscreenButton = ClassicyIcons.system.quicktime.fullscreenButton;

export const QuickTimeFullscreenButton: FunctionalComponent<{
	onToggle: () => void;
}> = ({ onToggle }) => (
	<button
		type="button"
		onClick={onToggle}
		className={"quickTimePlayerVideoControlsButton"}
	>
		<img
			className={"quickTimePlayerVideoControlsIcon"}
			src={fullscreenButton}
			alt="Enter fullscreen"
		/>
	</button>
);
