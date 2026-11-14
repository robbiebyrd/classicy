import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	classicyLog,
	registerClassicySoundPack,
} from "@classicy/classicy";
import system7Json from "./system7/system7.json";

const SYSTEM7 = "system7";

// The sprite sheet bin/make_audio_sprites.sh writes beside its JSON, from the
// WAV sources in ./system7/sprites (plan 0018-dbd §4.2): the System 7.5.5
// System file's alert sounds (`snd ` 1 and 5 to 9), written by
// bin/export-assets.mjs. Imported as files, like the art and fonts: the
// package's build emits them in dist/assets.
const spriteModules = import.meta.glob("./system7/system7.{ogg,m4a,mp3,ac3}", {
	eager: true,
	import: "default",
}) as Record<string, string>;

const SYSTEM7_FILE_NAMES = [
	"system7.ogg",
	"system7.m4a",
	"system7.mp3",
	"system7.ac3",
];
const system7Urls = SYSTEM7_FILE_NAMES.map(
	(file) => spriteModules[`./system7/${file}`] ?? "",
);

// A resolved URL may be a `data:` URI, so it cannot be compared with the
// JSON; instead the JSON's relative `src` must name exactly the four bundled
// files, in the same order.
if (
	JSON.stringify(system7Json.src.map((src) => src.split("/").pop())) !==
	JSON.stringify(SYSTEM7_FILE_NAMES)
) {
	classicyLog(
		"error",
		"ClassicySoundPacks",
		"system7.json src does not match the bundled audio files; regenerate it with bin/make_audio_sprites.sh",
	);
}

/**
 * System 7's sound pack, `system7`, which both themes name (`sound.pack`):
 * the six alert sounds System 7.5's Sound control panel lists, by the names
 * it shows them under, Simple Beep the default, plus `ClassicyBeep` (Simple
 * Beep again: HyperCard's `beep`). Nothing else: the boot chime is in ROM,
 * and System 7 had no interface feedback sounds (design 0017-6me), so the
 * package has no hooks that would play them. A sprite the pack lacks plays
 * from the default pack when one is registered (Platinum's), as for any
 * pack; a stored choice of an alert System 7 lacks (Platinum's Bonk, say)
 * plays Simple Beep.
 */
export const system7SoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		...system7Json,
		id: SYSTEM7,
		name: "System 7",
		packageId: SYSTEM7,
		alerts: [
			{ value: "ClassicyAlertDroplet", label: "Droplet" },
			{ value: "ClassicyAlertIndigo", label: "Indigo" },
			{ value: "ClassicyAlertQuack", label: "Quack" },
			{ value: "ClassicyAlertSimpleBeep", label: "Simple Beep" },
			{ value: "ClassicyAlertSosumi", label: "Sosumi" },
			{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
		],
		defaultAlert: "ClassicyAlertSimpleBeep",
		src: system7Urls,
	});

// Registered here, at module load, before the package (../../index.ts), whose
// themes' `sound.pack` must name a registered pack; the package lists it
// (`sounds`), never registering it again.
registerClassicySoundPack(system7SoundPack);
