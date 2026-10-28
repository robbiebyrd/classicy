import platinumJson from "@snd/platinum/platinum.json";
import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	registerClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const PLATINUM = "platinum";

const platinumOgg = new URL("@snd/platinum/platinum.ogg", import.meta.url).href;
const platinumM4a = new URL("@snd/platinum/platinum.m4a", import.meta.url).href;
const platinumMp3 = new URL("@snd/platinum/platinum.mp3", import.meta.url).href;
const platinumAc3 = new URL("@snd/platinum/platinum.ac3", import.meta.url).href;

const basename = (url: string) => url.split("/").pop();

// Vite needs the four static `new URL` literals above; the generated JSON's
// relative `src` must still name the same files, in the same order.
const platinumUrls = [platinumOgg, platinumM4a, platinumMp3, platinumAc3];
if (
	JSON.stringify(platinumJson.src.map(basename)) !==
	JSON.stringify(platinumUrls.map(basename))
) {
	classicyLog(
		"error",
		"ClassicySoundPacks",
		"platinum.json src does not match the bundled audio files; regenerate it with bin/make_audio_sprites.sh",
	);
}

export const platinumSoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		...platinumJson,
		id: PLATINUM,
		name: "Platinum",
		src: platinumUrls,
	});

// Registered here until plan 0002-ldj Part B moves this call into src/Appearance/Platinum/index.ts
registerClassicySoundPack(platinumSoundPack);
