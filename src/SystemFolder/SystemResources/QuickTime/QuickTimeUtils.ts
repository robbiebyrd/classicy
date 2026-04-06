import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const sound33Img = ClassicyIcons.controlPanels.soundManager.sound33;
const sound66Img = ClassicyIcons.controlPanels.soundManager.sound66;
const soundOffImg = ClassicyIcons.controlPanels.soundManager.soundOff;
const soundOnImg = ClassicyIcons.controlPanels.soundManager.soundOn;

export function timeFriendly(seconds: number): string {
	if (!Number.isFinite(seconds)) {
		return "0:00:00";
	}
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getVolumeIcon(volume: number): string {
	if (volume === 0) {
		return soundOffImg;
	}
	if (volume > 0 && volume < 0.3) {
		return sound33Img;
	}
	if (volume >= 0.3 && volume < 0.7) {
		return sound66Img;
	}
	return soundOnImg;
}
