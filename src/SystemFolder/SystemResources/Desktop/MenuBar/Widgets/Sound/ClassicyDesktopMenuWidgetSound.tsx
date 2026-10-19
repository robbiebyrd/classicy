import "./ClassicyDesktopMenuWidgetSound.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import type {
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
} from "react";
import { useEffect } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const appIcon = ClassicyIcons.controlPanels.soundManager.app;
const soundOffImg = ClassicyIcons.controlPanels.soundManager.soundOff;
const soundOnImg = ClassicyIcons.controlPanels.soundManager.soundOn;

/**
 * @deprecated The menu-bar speaker widget is no longer mounted by
 * `ClassicyDesktop`; system volume lives on the Control Strip. Use the Control
 * Strip's built-in Sound module (`classicy-sound`), which shows unless
 * `ClassicyDesktop`'s `controlStrip` prop lists it in `disabledModules`.
 */
type ClassicyDesktopMenuWidgetSoundProps = {
	hide?: boolean;
};

// Module-level so the deprecation notice prints once per page, however many
// times (or in however many places) the widget mounts.
let deprecationWarned = false;

/**
 * Menu-bar speaker that toggles the global mute flag.
 *
 * @deprecated Sound moved to the Control Strip (HIGOS8 p.125, Figure 2-16).
 * Use the Control Strip's built-in Sound module (`classicy-sound`), which
 * `ClassicyDesktop`'s Control Strip shows by default (its `controlStrip` prop
 * can disable it). That module sets the
 * system volume (`ClassicyVolumeSet`); this widget only toggles mute. Still
 * exported so existing consumers keep working.
 */
export const ClassicyDesktopMenuWidgetSound: FunctionalComponent<
	ClassicyDesktopMenuWidgetSoundProps
> = ({ hide = false }) => {
	useEffect(() => {
		if (deprecationWarned || process.env.NODE_ENV === "production") return;
		deprecationWarned = true;
		classicyLog(
			"warn",
			"ClassicyDesktopMenuWidgetSound",
			"ClassicyDesktopMenuWidgetSound is deprecated: Sound lives on the Control Strip. Use its built-in Sound module (classicy-sound), shown by ClassicyDesktop's controlStrip.",
		);
	}, []);

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
