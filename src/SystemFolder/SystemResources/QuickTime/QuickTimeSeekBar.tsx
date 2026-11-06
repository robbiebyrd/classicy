import type { FC as FunctionalComponent } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { timeFriendly } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeUtils";

/**
 * The controller bar's transport section: a range slider showing the
 * playhead as a fraction of the duration, the elapsed time as `h:mm:ss`, and
 * the skip-back / skip-forward buttons (10 seconds each in
 * `useQuickTimePlayback`).
 */
export const QuickTimeSeekBar: FunctionalComponent<{
	/** Id of the range input. */
	id: string;
	/** Playhead position, in seconds. */
	currentTime: number;
	/** Media length, in seconds; a falsy value is treated as 1. */
	duration: number;
	/** Fired while scrubbing with the new position as a fraction (0–1). */
	onSeekToPct: (pct: number) => void;
	/** Fired by the skip-forward button. */
	onSeekForward: () => void;
	/** Fired by the skip-backward button. */
	onSeekBackward: () => void;
}> = ({
	id,
	currentTime,
	duration,
	onSeekToPct,
	onSeekForward,
	onSeekBackward,
}) => {
	const backwardButton = useClassicyAsset(
		"icons",
		"system.quicktime.backwardButton",
	);
	const forwardButton = useClassicyAsset(
		"icons",
		"system.quicktime.forwardButton",
	);
	return (
		<>
			<div className={"quickTimePlayerVideoControlsProgressBarHolder"}>
				<input
					id={id}
					className={"quickTimePlayerVideoControlsProgressBar"}
					key={id}
					type="range"
					min="0"
					max="1"
					step="0.001"
					value={currentTime / (duration || 1)}
					readOnly={false}
					onChange={(e) => {
						onSeekToPct(parseFloat(e.target.value));
					}}
				/>
			</div>
			<p className={"quickTimePlayerVideoControlsTime"}>
				{timeFriendly(currentTime)}
			</p>
			<button
				type="button"
				onClick={onSeekBackward}
				className={"quickTimePlayerVideoControlsButton"}
			>
				<img
					className={"quickTimePlayerVideoControlsIcon"}
					src={backwardButton}
					alt="Seek backward 10 seconds"
				/>
			</button>
			<button
				type="button"
				onClick={onSeekForward}
				className={"quickTimePlayerVideoControlsButton"}
			>
				<img
					className={"quickTimePlayerVideoControlsIcon"}
					src={forwardButton}
					alt="Seek forward 10 seconds"
				/>
			</button>
		</>
	);
};
