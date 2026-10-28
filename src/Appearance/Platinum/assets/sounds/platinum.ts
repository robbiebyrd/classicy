import platinumJson from "@snd/platinum/platinum.json";
import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	registerClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

const PLATINUM = "platinum";

const platinumOgg = new URL("@snd/platinum/platinum.ogg", import.meta.url).href;
const platinumM4a = new URL("@snd/platinum/platinum.m4a", import.meta.url).href;
const platinumMp3 = new URL("@snd/platinum/platinum.mp3", import.meta.url).href;
const platinumAc3 = new URL("@snd/platinum/platinum.ac3", import.meta.url).href;

export const platinumSoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		...platinumJson,
		id: PLATINUM,
		name: "Platinum",
		src: [platinumOgg, platinumM4a, platinumMp3, platinumAc3],
	});

// Registered here until plan 0002-ldj Part B moves this call into src/Appearance/Platinum/index.ts
registerClassicySoundPack(platinumSoundPack);
