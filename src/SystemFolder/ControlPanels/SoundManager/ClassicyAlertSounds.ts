export const DEFAULT_ALERT_SOUND = "ClassicyAlertSosumi";

export interface ClassicyAlertSoundOption {
	value: string;
	label: string;
}

export const CLASSICY_ALERT_SOUNDS: ClassicyAlertSoundOption[] = [
	{ value: "ClassicyAlertBonk", label: "Bonk" },
	{ value: "ClassicyAlertGrowl", label: "Growl" },
	{ value: "ClassicyAlertIndigo", label: "Indigo" },
	{ value: "ClassicyAlertQuack", label: "Quack" },
	{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	{ value: "ClassicyAlertTabitha", label: "Tabitha" },
	{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
];
