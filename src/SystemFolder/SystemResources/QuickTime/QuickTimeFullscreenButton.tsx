import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const fullscreenButton = ClassicyIcons.system.quicktime.fullscreenButton;

/**
 * The controller bar's fullscreen button (an icon button labelled "Enter
 * fullscreen"). `QuickTimeVideoEmbed` shows it for `type="video"` only.
 */
export const QuickTimeFullscreenButton: FunctionalComponent<{
	/** Fired on click; typically `useQuickTimePlayback().toggleFullscreen`. */
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
