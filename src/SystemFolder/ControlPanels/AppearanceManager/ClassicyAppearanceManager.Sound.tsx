import { type ChangeEvent, useMemo } from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyPackAlerts } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	playingClassicySoundPack,
	useClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
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
	/**
	 * The alerts the Alert Sound pop-up lists. Omitted (as in 3.1): the pack
	 * that plays for the active theme declares them.
	 */
	alerts?: readonly { value: string; label: string }[];
	/** The alert in effect: the stored choice, else the pack's default. */
	alertSound: string;
	changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
	/** Alert sound level, 0–100 (a percentage of the system volume). */
	alertVolume: number;
	/** Fired on every slider step with the new level. */
	changeAlertVolume: (alertVolume: number) => void;
	/**
	 * Fired once on release with the committed level; plays the alert. Not
	 * fired for a drag whose pointer stream was lost.
	 */
	previewAlertVolume: (alertVolume: number) => void;
}

export const useSoundTab = ({
	soundPacks,
	soundPack,
	changeSoundPack,
	alerts: alertsProp,
	alertSound,
	changeAlertSound,
	alertVolume,
	changeAlertVolume,
	previewAlertVolume,
}: SoundTabProps): TabIndividual => {
	const registeredPacks = useClassicySoundPacks();
	const themePackId =
		useAppManager(
			(s) => s.System.Manager.Appearance?.activeTheme?.sound?.pack,
		) ?? CLASSICY_DEFAULT_SOUND_PACK_ID;
	// `registeredPacks` is a dependency so a pack registering late (or the
	// default pack an alert-less pack inherits from) is picked up.
	const defaultAlerts = useMemo(
		() => [
			...classicyPackAlerts(
				playingClassicySoundPack(registeredPacks, themePackId),
			),
		],
		[registeredPacks, themePackId],
	);
	const alerts = alertsProp ?? defaultAlerts;
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
							options={[...alerts]}
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
								// A drag lost to the pointer stream (an Alt-Tab, say) keeps
								// the level its steps saved, but never auditions it: the
								// user did not let go.
								onCommitFunc={(value, { lost }) => {
									if (!lost) previewAlertVolume(value);
								}}
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
			alerts,
			alertSound,
			changeAlertSound,
			alertVolume,
			changeAlertVolume,
			previewAlertVolume,
		],
	);
};
