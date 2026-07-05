import { type FC as FunctionalComponent, useRef, useState } from "react";
import { getVolumeIcon } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeUtils";

export const QuickTimeVolumeControl: FunctionalComponent<{
	id: string;
	volume: number;
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
