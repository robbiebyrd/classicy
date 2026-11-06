import {
	type ClassicySoundPack,
	getClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Ids already reported missing. An id leaves the set once it resolves, so a
// pack that registers and later goes away is reported again.
const warned = new Set<string>();

/**
 * `getClassicySoundPack`, logging one warning per id that is not registered.
 * The core ships no sound pack (Platinum's comes with the Platinum package),
 * so a theme can name a pack nobody registered; the provider then plays
 * nothing rather than failing.
 */
export const findClassicySoundPack = (
	id: string,
): ClassicySoundPack | undefined => {
	const pack = getClassicySoundPack(id);
	if (pack) {
		warned.delete(id);
		return pack;
	}
	if (!warned.has(id)) {
		warned.add(id);
		classicyLog("warn", "Sound", `Sound pack "${id}" is not registered`, {
			id,
		});
	}
	return undefined;
};

/** Test helper: report every missing id again. */
export const resetClassicySoundPackWarnings = (): void => {
	warned.clear();
};
