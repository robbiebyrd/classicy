import platinumJson from "@snd/platinum/platinum.json";
import {
	SoundDataSchema,
	type SoundData,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";

const platinumOgg = new URL("@snd/platinum/platinum.ogg", import.meta.url).href;
const platinumM4a = new URL("@snd/platinum/platinum.m4a", import.meta.url).href;
const platinumMp3 = new URL("@snd/platinum/platinum.mp3", import.meta.url).href;
const platinumAc3 = new URL("@snd/platinum/platinum.ac3", import.meta.url).href;

const platinumSoundData = SoundDataSchema.parse({
	...platinumJson,
	src: [platinumOgg, platinumM4a, platinumMp3, platinumAc3],
});

export const ClassicySounds: Record<string, SoundData | null> = {
	platinum: platinumSoundData,
};
