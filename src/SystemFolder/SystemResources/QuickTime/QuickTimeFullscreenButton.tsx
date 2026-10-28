import type { FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

/**
 * The controller bar's fullscreen button (an icon button labelled "Enter
 * fullscreen"). `QuickTimeVideoEmbed` shows it for `type="video"` only.
 */
export const QuickTimeFullscreenButton: FunctionalComponent<{
	/** Fired on click; typically `useQuickTimePlayback().toggleFullscreen`. */
	onToggle: () => void;
}> = ({ onToggle }) => {
	const fullscreenButton = useClassicyAsset(
		"icons",
		"system.quicktime.fullscreenButton",
	);
	return (
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
};
