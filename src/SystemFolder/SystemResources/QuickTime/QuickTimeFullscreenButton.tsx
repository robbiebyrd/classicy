import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

/**
 * The controller bar's fullscreen button (an icon button labelled "Enter
 * fullscreen"). `QuickTimeVideoEmbed` shows it for `type="video"` only.
 */
export const QuickTimeFullscreenButton: FunctionalComponent<{
	/** Fired on click; typically `useQuickTimePlayback().toggleFullscreen`. */
	onToggle: () => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}> = ({ onToggle, className, style }) => {
	const fullscreenButton = useClassicyAsset(
		"icons",
		"system.quicktime.fullscreenButton",
	);
	return (
		<button
			type="button"
			onClick={onToggle}
			className={classNames("quickTimePlayerVideoControlsButton", className)}
			style={style}
		>
			<img
				className={"quickTimePlayerVideoControlsIcon"}
				src={fullscreenButton}
				alt="Enter fullscreen"
			/>
		</button>
	);
};
