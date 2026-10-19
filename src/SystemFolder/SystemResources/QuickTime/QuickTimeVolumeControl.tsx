import { type FC as FunctionalComponent, useRef, useState } from "react";
import { getVolumeIcon } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeUtils";

/**
 * The controller bar's volume button: its speaker icon reflects the level
 * (off, low, medium, high), and a click toggles a pop-up slider (0–1 in
 * steps of 0.1) that closes again when clicked.
 */
export const QuickTimeVolumeControl: FunctionalComponent<{
	/** Id of the slider input. */
	id: string;
	/** Current volume, 0–1. */
	volume: number;
	/** Fired with the new volume (0–1) as the slider moves. */
	onVolumeChange: (volume: number) => void;
}> = ({ id, volume, onVolumeChange }) => {
	const [showVolume, setShowVolume] = useState(false);
	const volumeButtonRef = useRef<HTMLButtonElement>(null);

	return (
		<>
			{showVolume && (
				<div className={"quickTimePlayerVolumePopup"}>
					<input
						className={"quickTimePlayerVideoControlsVolumeBar"}
						id={id}
						type="range"
						min="0"
						max="1"
						step="0.1"
						style={{ left: volumeButtonRef.current?.offsetLeft }}
						value={volume}
						onClick={() => {
							setShowVolume(false);
						}}
						onChange={(e) => {
							onVolumeChange(parseFloat(e.target.value));
						}}
					/>
				</div>
			)}
			<button
				type="button"
				className={"quickTimePlayerVideoControlsButton"}
				onClick={() => setShowVolume(!showVolume)}
				ref={volumeButtonRef}
			>
				<img
					src={getVolumeIcon(volume)}
					className={"quickTimePlayerVideoControlsIcon"}
					alt="Volume"
				/>
			</button>
		</>
	);
};
