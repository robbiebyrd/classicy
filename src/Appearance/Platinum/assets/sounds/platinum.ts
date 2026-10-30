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

// Vite needs the four static `new URL` literals above. In the library build
// they are inlined as `data:` URIs, so the resolved URLs cannot be compared
// with the JSON; instead the JSON's relative `src` must name exactly the four
// bundled files, in the same order.
const platinumUrls = [platinumOgg, platinumM4a, platinumMp3, platinumAc3];
const PLATINUM_FILE_NAMES = [
	"platinum.ogg",
	"platinum.m4a",
	"platinum.mp3",
	"platinum.ac3",
];
if (
	JSON.stringify(platinumJson.src.map((src) => src.split("/").pop())) !==
	JSON.stringify(PLATINUM_FILE_NAMES)
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

// Registered here, at module load; src/Appearance/Platinum/index.ts imports this
// module and lists the pack in the Platinum package (`sounds`), never registering
// it again. The call stays here: in index.ts it would sit on a load cycle through
// ClassicyThemeSchema, whose `sound.pack` check reads the sound pack registry.
registerClassicySoundPack(platinumSoundPack);
