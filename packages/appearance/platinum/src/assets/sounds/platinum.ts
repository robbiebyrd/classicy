import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	classicyLog,
	registerClassicySoundPack,
} from "@classicy/classicy";
import platinumJson from "./platinum/platinum.json";

const PLATINUM = "platinum";

// The sprite sheet bin/make_audio_sprites.sh writes beside its JSON, in the
// package's src/assets/sounds/platinum (moved out of the core's assets/sounds,
// plan 0015-kxa §3.3). Imported as files, like the art, fonts and wallpapers:
// Platinum's build emits them in dist/assets. The core's build, which bundles
// Platinum until §3.4, inlines them as `data:` URIs.
const spriteModules = import.meta.glob(
	"./platinum/platinum.{ogg,m4a,mp3,ac3}",
	{ eager: true, import: "default" },
) as Record<string, string>;

const PLATINUM_FILE_NAMES = [
	"platinum.ogg",
	"platinum.m4a",
	"platinum.mp3",
	"platinum.ac3",
];
const platinumUrls = PLATINUM_FILE_NAMES.map(
	(file) => spriteModules[`./platinum/${file}`] ?? "",
);

// A resolved URL may be a `data:` URI, so it cannot be compared with the
// JSON; instead the JSON's relative `src` must name exactly the four bundled
// files, in the same order.
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
		// The alerts the Sound tab offers; the rest of the sheet is feedback.
		alerts: [
			{ value: "ClassicyAlertBonk", label: "Bonk" },
			{ value: "ClassicyAlertGrowl", label: "Growl" },
			{ value: "ClassicyAlertIndigo", label: "Indigo" },
			{ value: "ClassicyAlertQuack", label: "Quack" },
			{ value: "ClassicyAlertSosumi", label: "Sosumi" },
			{ value: "ClassicyAlertTabitha", label: "Tabitha" },
			{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
		],
		defaultAlert: "ClassicyAlertSosumi",
		src: platinumUrls,
	});

// Registered here, at module load; the package entry (src/index.ts) imports this
// module and lists the pack in the Platinum package (`sounds`), never registering
// it again. The call stays here: in index.ts it would sit on a load cycle through
// ClassicyThemeSchema, whose `sound.pack` check reads the sound pack registry.
registerClassicySoundPack(platinumSoundPack);
