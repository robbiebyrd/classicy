import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

/**
 * The controller bar's play/pause button: shows the pause glyph while
 * playing and the play glyph otherwise, with a matching accessible name.
 */
export const QuickTimePlayPauseButton: FunctionalComponent<{
	/** Whether the media is playing (selects the glyph). */
	playing: boolean;
	/** Fired on click; typically `useQuickTimePlayback().handlePlayPause`. */
	onToggle: () => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}> = ({ playing, onToggle, className, style }) => {
	const pauseButton = useClassicyAsset("icons", "system.quicktime.pauseButton");
	const playButton = useClassicyAsset("icons", "system.quicktime.playButton");
	return (
		<button
			type="button"
			onClick={onToggle}
			className={classNames("quickTimePlayerVideoControlsButton", className)}
			style={style}
		>
			<img
				className={"quickTimePlayerVideoControlsIcon"}
				src={playing ? pauseButton : playButton}
				alt={playing ? "Pause" : "Play"}
			/>
		</button>
	);
};
