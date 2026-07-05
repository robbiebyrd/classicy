import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { timeFriendly } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeUtils";

const backwardButton = ClassicyIcons.system.quicktime.backwardButton;
const forwardButton = ClassicyIcons.system.quicktime.forwardButton;

export const QuickTimeSeekBar: FunctionalComponent<{
	id: string;
	currentTime: number;
	duration: number;
	onSeekToPct: (pct: number) => void;
	onSeekForward: () => void;
	onSeekBackward: () => void;
}> = ({
	id,
	currentTime,
	duration,
	onSeekToPct,
	onSeekForward,
	onSeekBackward,
}) => (
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
