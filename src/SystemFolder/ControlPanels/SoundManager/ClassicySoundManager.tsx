import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicySoundManager.scss";
import { type FC as FunctionalComponent, useCallback, useMemo } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	type ClassicySoundInfo,
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";

const appIcon = ClassicyIcons.controlPanels.soundManager.app;

import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyDisclosure } from "@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = "SoundManager.app";
const APP_NAME = "Sound Manager";
const WINDOW_ID = "SoundManager_1";

export const ClassicySoundManager: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();

	const playerState = useSound();
	const player = useSoundDispatch();

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);

	const changeSounds = (checked: boolean) => {
		player({
			type: "ClassicySoundDisable",
			disabled: checked ? [] : ["*"],
		});
	};

	// TODO(audit ch. 6 §35): the per-sound disable UI is non-functional. The
	// checkboxes below all bind their `checked` state to the global
	// `disabled.includes("*")` flag rather than to each sound's own entry, and
	// while this dispatches ClassicySoundEnableOne/DisableOne the checkbox never
	// reflects an individual sound's disabled state. Wire per-sound state
	// (and its checked binding) before advertising this as working.
	const disableSounds = useCallback(
		(checked: boolean, sound: string) => {
			if (checked) {
				player({
					type: "ClassicySoundEnableOne",
					enabled: sound,
				});
			} else {
				player({
					type: "ClassicySoundDisableOne",
					disabled: sound,
				});
			}
		},
		[player],
	);

	const quitApp = () => {
		desktopEventDispatch(quitAppHelper(APP_ID, APP_NAME, appIcon));
	};

	// Mac OS 8 HIG control-panel menu bar (audit ch. 6 §35): Apple / File.
	// About ideally lives as the first item of the global Apple menu
	// (Desktop.systemMenu), which is outside this panel's editable scope; until a
	// per-app Apple-menu injection point exists it sits at the top of File (out of
	// the old Help menu). No Edit menu — this panel has no text-entry fields.
	// TODO(#209): relocate About to the Apple menu.
	//
	// ClassicyMenu renders an <hr> divider only for id === "spacer" and keys by
	// id, so at most one divider per menu.
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				{
					...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
						windowClose(WINDOW_ID, quitAppHelper(APP_ID, APP_NAME, appIcon)),
					),
					keyboardShortcut: "⌥W",
				},
				{ id: "spacer" },
				{
					...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
					keyboardShortcut: "⌥Q",
				},
			],
		},
	];

	const groupedLabels = useMemo(() => {
		const groups = new Map<string, ClassicySoundInfo[]>();
		for (const item of playerState.labels) {
			if (item.group === "Alert") continue;
			if (!groups.has(item.group)) groups.set(item.group, []);
			groups.get(item.group)?.push(item);
		}
		return groups;
	}, [playerState.labels]);

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={"SoundManager_1"}
			noDesktopIcon={true}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={APP_NAME}
				appId={APP_ID}
				icon={appIcon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				// HIG (audit ch. 6 §35): control-panel windows respect the
				// 492×340 absolute ceiling. 480 stays under it (was 500).
				initialSize={[480, 0]}
				initialPosition={[300, 50]}
				modal={false}
				appMenu={appMenu}
			>
				<div className={"classicySoundManagerContent"}>
					<ClassicyCheckbox
						id={"disable_sounds"}
						isDefault={true}
						label={"Enable Interface Sounds"}
						onClickFunc={changeSounds}
						checked={!playerState.disabled.includes("*")}
					/>
					<ClassicyDisclosure label={"Disable Sounds"}>
						<ClassicyControlLabel
							label={"These settings are not currently connected."}
						/>
						<div className={"soundManagerControlGroupHolder"}>
							{[...groupedLabels.entries()].map(([group, items]) => (
								<ClassicyControlGroup
									label={group}
									columns={true}
									key={`${APP_ID}_${group}`}
								>
									{items.map((item: ClassicySoundInfo) => (
										<ClassicyCheckbox
											key={`${APP_ID}_${group}${item.id}`}
											id={`enable_sound_${item.id}`}
											label={item.label}
											checked={!playerState.disabled.includes("*")}
											onClickFunc={(checked: boolean) =>
												disableSounds(checked, item.id)
											}
										/>
									))}
								</ClassicyControlGroup>
							))}
						</div>
					</ClassicyDisclosure>
					<ClassicyButton isDefault={false} onClickFunc={quitApp}>
						Quit
					</ClassicyButton>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
};
