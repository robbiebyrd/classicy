import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	type ClassicyAlertSoundOption,
	type ClassicySoundPack,
	getClassicySoundPack,
} from "./ClassicySoundPacks";

export type { ClassicyAlertSoundOption };

/**
 * @deprecated Platinum's default alert, kept for existing imports. The default
 * comes from the active sound pack: use `resolveClassicyAlertSound`.
 */
export const DEFAULT_ALERT_SOUND = "ClassicyAlertSosumi";

/**
 * @deprecated Platinum's seven alerts, kept for existing imports. The list
 * comes from the active sound pack: use `classicyPackAlerts`.
 */
export const CLASSICY_ALERT_SOUNDS: ClassicyAlertSoundOption[] = [
	{ value: "ClassicyAlertBonk", label: "Bonk" },
	{ value: "ClassicyAlertGrowl", label: "Growl" },
	{ value: "ClassicyAlertIndigo", label: "Indigo" },
	{ value: "ClassicyAlertQuack", label: "Quack" },
	{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	{ value: "ClassicyAlertTabitha", label: "Tabitha" },
	{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
];

// A pack that declares no `alerts` takes the default pack's, like its sprites.
const declaringPack = (
	pack: ClassicySoundPack,
): ClassicySoundPack | undefined => {
	if (pack.alerts !== undefined) return pack;
	if (pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID) return undefined;
	return getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
};

/** The alerts the user may pick under `pack` (store-free). */
export const classicyPackAlerts = (
	pack: ClassicySoundPack | undefined,
): readonly ClassicyAlertSoundOption[] =>
	(pack && declaringPack(pack)?.alerts) || [];

/** `pack`'s default alert, or undefined when it has no alerts. */
export const classicyPackDefaultAlert = (
	pack: ClassicySoundPack | undefined,
): string | undefined => {
	const source = pack && declaringPack(pack);
	const alerts = source?.alerts ?? [];
	if (
		source?.defaultAlert &&
		alerts.some((a) => a.value === source.defaultAlert)
	)
		return source.defaultAlert;
	return alerts[0]?.value;
};

/**
 * The alert to play: the stored choice when `pack` offers it, else the pack's
 * default; undefined when the pack has no alerts. Never rewrites the stored
 * choice. With no pack known (none loaded), the stored choice or Platinum's
 * default, as before packs declared alerts.
 */
export const resolveClassicyAlertSound = (
	pack: ClassicySoundPack | undefined,
	stored: string | undefined,
): string | undefined => {
	if (!pack) return stored ?? DEFAULT_ALERT_SOUND;
	const alerts = classicyPackAlerts(pack);
	if (stored && alerts.some((a) => a.value === stored)) return stored;
	return classicyPackDefaultAlert(pack);
};
