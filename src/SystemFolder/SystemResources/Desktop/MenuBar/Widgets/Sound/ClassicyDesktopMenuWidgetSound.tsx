import "./ClassicyDesktopMenuWidgetSound.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import appIcon from "@img/icons/control-panels/sound-manager/app.png";
import soundOffImg from "@img/icons/control-panels/sound-manager/sound-off.png";
import soundOnImg from "@img/icons/control-panels/sound-manager/sound-on.png";
import classNames from "classnames";
import type {
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";

type ClassicyDesktopMenuWidgetSoundProps = {
	hide?: boolean;
};

export const ClassicyDesktopMenuWidgetSound: FunctionalComponent<
	ClassicyDesktopMenuWidgetSoundProps
> = ({ hide = false }) => {
	const player = useSoundDispatch();
	const playerState = useSound();
	const desktopEventDispatch = useAppManagerDispatch();

	const openSoundManager = (e: MouseEvent) => {
		e.preventDefault();
		desktopEventDispatch({
			type: "ClassicyAppOpen",
			app: {
				id: "SoundManager.app",
				name: "Sound Manager",
				icon: appIcon,
			},
		});
	};

	const mute = () => {
		player({
			type: "ClassicySoundDisable",
			disabled: playerState.disabled.includes("*") ? [] : ["*"],
		});
		return;
	};

	return (
		<>
			{!hide && (
				<li
					className={classNames(
						"classicyDesktopMenuWidgetSound",
						"classicyMenuItem",
						"classicyMenuItemNoImage",
					)}
					onClick={mute}
					onDoubleClick={openSoundManager}
					onKeyDown={(e: KeyboardEvent) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							mute();
						}
					}}
				>
					<img
						src={playerState.disabled.includes("*") ? soundOffImg : soundOnImg}
						alt={playerState.disabled.includes("*") ? "Unmute" : "Mute"}
					/>
				</li>
			)}
		</>
	);
};
