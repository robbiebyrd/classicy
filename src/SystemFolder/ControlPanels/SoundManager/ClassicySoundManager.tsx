import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicySoundManager.scss";
import {
	type FC as FunctionalComponent,
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	type ClassicySoundInfo,
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const appIcon = ClassicyIcons.controlPanels.soundManager.app;

import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyDisclosure } from "@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = "SoundManager.app";
const APP_NAME = "Sound Manager";

export const ClassicySoundManager: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();

	const playerState = useSound();
	const player = useSoundDispatch();

	const [showAbout, setShowAbout] = useState(false);

	const changeSounds = (checked: boolean) => {
		player({
			type: "ClassicySoundDisable",
			disabled: checked ? [] : ["*"],
		});
	};

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

	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [
				{
					id: `${APP_ID}_about`,
					title: "About",
					onClickFunc: () => {
						setShowAbout(true);
					},
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
				id={"SoundManager_1"}
				title={APP_NAME}
				appId={APP_ID}
				icon={appIcon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				initialSize={[500, 0]}
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
			{showAbout
				? getClassicyAboutWindow({
						appId: APP_ID,
						appName: APP_NAME,
						appIcon,
						hideFunc: () => setShowAbout(false),
					})
				: null}
		</ClassicyApp>
	);
};
