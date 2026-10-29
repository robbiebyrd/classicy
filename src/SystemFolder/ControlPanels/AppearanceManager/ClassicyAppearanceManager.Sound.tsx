import { type ChangeEvent, useMemo } from "react";
import { CLASSICY_ALERT_SOUNDS } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface SoundTabProps {
	/** The sound packs the active Appearance Package can use, in order. */
	soundPacks: { id: string; name: string }[];
	/** The active theme's `sound.pack`. */
	soundPack: string;
	changeSoundPack: (e: ChangeEvent<HTMLSelectElement>) => void;
	alertSound: string;
	changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
	/** Alert sound level, 0–100 (a percentage of the system volume). */
	alertVolume: number;
	/** Fired on every slider step with the new level. */
	changeAlertVolume: (alertVolume: number) => void;
	/** Fired once on release with the committed level; plays the alert. */
	previewAlertVolume: (alertVolume: number) => void;
}

export const useSoundTab = ({
	soundPacks,
	soundPack,
	changeSoundPack,
	alertSound,
	changeAlertSound,
	alertVolume,
	changeAlertVolume,
	previewAlertVolume,
}: SoundTabProps): TabIndividual => {
	const soundPackOptions = useMemo(
		() => soundPacks.map(({ id, name }) => ({ value: id, label: name })),
		[soundPacks],
	);
	return useMemo(
		() => ({
			title: "Sound",
			children: (
				<div
					className={
						"classicyAppearanceManagerFontsColumn classicyAppearanceManagerSoundColumn"
					}
				>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel label={"Sound Pack"} direction={"left"} />
						</div>
						<ClassicyPopUpMenu
							id={"soundPack"}
							options={soundPackOptions}
							selected={soundPack}
							onChangeFunc={changeSoundPack}
						/>
					</div>
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
					{/* Same label column as Alert Sound, so the two controls line up. */}
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel
								label={"Alert Volume"}
								labelFor={"alertVolume"}
								direction={"left"}
							/>
						</div>
						<div className={"classicyAppearanceManagerSoundSlider"}>
							<ClassicySlider
								id={"alertVolume"}
								value={alertVolume}
								min={0}
								max={100}
								valueLabel={`${alertVolume}%`}
								onChangeFunc={(e) => changeAlertVolume(Number(e.target.value))}
								onCommitFunc={previewAlertVolume}
							/>
						</div>
					</div>
				</div>
			),
		}),
		[
			soundPackOptions,
			soundPack,
			changeSoundPack,
			alertSound,
			changeAlertSound,
			alertVolume,
			changeAlertVolume,
			previewAlertVolume,
		],
	);
};
