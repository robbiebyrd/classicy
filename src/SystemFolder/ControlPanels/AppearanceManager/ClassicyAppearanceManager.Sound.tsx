import { type ChangeEvent, useMemo } from "react";
import { CLASSICY_ALERT_SOUNDS } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface SoundTabProps {
	alertSound: string;
	changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const useSoundTab = ({
	alertSound,
	changeAlertSound,
}: SoundTabProps): TabIndividual =>
	useMemo(
		() => ({
			title: "Sound",
			children: (
				<div className={"classicyAppearanceManagerFontsColumn"}>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel label={"Alert Sound"} direction={"left"} />
						</div>
						<ClassicyPopUpMenu
							id={"alertSound"}
							options={CLASSICY_ALERT_SOUNDS}
							selected={alertSound}
							onChangeFunc={changeAlertSound}
						/>
					</div>
				</div>
			),
		}),
		[alertSound, changeAlertSound],
	);
