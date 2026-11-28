import { createContext } from "react";
import type { ClassicyAlertSoundType } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

/**
 * The type of the alert box a `ClassicyWindow` holds: `ClassicyAlert`
 * provides it around its window, so the error sound a fixed alert's window
 * plays on opening carries it (`ClassicySoundPlayError { alertType }`) and
 * the sound pack can play that type's sound (`alertTypeSounds`). Undefined
 * for every other window, whose error sound is sent as before.
 */
export const ClassicyWindowAlertTypeContext = createContext<
	ClassicyAlertSoundType | undefined
>(undefined);
