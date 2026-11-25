import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	classicyLog,
	registerClassicySoundPack,
} from "@classicy/classicy";
import windows98Json from "./windows98/windows98.json";

const WINDOWS98 = "windows98";

// The sprite sheet bin/make_audio_sprites.sh writes beside its JSON, from the
// WAV sources in ./windows98/sprites: Windows 98 Second Edition's own sounds,
// the CD's C:\WINDOWS\MEDIA files, each saved under the sprite id it plays
// (docs/windows98-asset-inventory.md, "Sounds", names each one's file).
// Imported as files, like the art: the package's build emits them in
// dist/assets.
const spriteModules = import.meta.glob("./windows98/windows98.{ogg,m4a}", {
	eager: true,
	import: "default",
}) as Record<string, string>;

const WINDOWS98_FILE_NAMES = ["windows98.ogg", "windows98.m4a"];
const windows98Urls = WINDOWS98_FILE_NAMES.map(
	(file) => spriteModules[`./windows98/${file}`] ?? "",
);

// A resolved URL may be a `data:` URI, so it cannot be compared with the
// JSON; instead the JSON's relative `src` must name exactly the two bundled
// files, in the same order.
if (
	JSON.stringify(windows98Json.src.map((src) => src.split("/").pop())) !==
	JSON.stringify(WINDOWS98_FILE_NAMES)
) {
	classicyLog(
		"error",
		"ClassicySoundPacks",
		"windows98.json src does not match the bundled audio files; regenerate it with bin/make_audio_sprites.sh",
	);
}

/**
 * Windows 98's sound pack, `windows98`, which every theme names
 * (`sound.pack`), mapped as Windows 98 SE's default scheme maps its events
 * (`MMOPT.INF` and `MOTOWN.INF`): the boot sound The Microsoft Sound (Start
 * Windows), the beep Ding (Default sound), an alert box Chord (Asterisk,
 * Exclamation and Critical Stop, by its type, while the user has picked no
 * alert sound), New Mail Notification's Notify and Empty Recycle Bin's
 * Recycle (`ClassicyTrashEmpty`, after the Trash is emptied). The alerts the
 * user may pick are the eight short WAVs of Windows' Media folder, which the
 * Sounds control panel offered for any event (its ninth, The Microsoft
 * Sound, is the boot sound), Ding the default.
 * Nothing else: the scheme gave Open, Close, Maximize, Minimize and the menus
 * no sound, and the package has no hooks that would play interface feedback.
 * A sprite the pack lacks plays from the default pack when one is registered
 * (Platinum's), as for any pack; a stored choice of an alert Windows 98
 * lacks (Platinum's Sosumi, say) plays Ding, or an alert box's Chord.
 */
export const windows98SoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		...windows98Json,
		id: WINDOWS98,
		name: "Windows 98",
		packageId: WINDOWS98,
		alerts: [
			{ value: "ClassicyAlertChimes", label: "Chimes" },
			{ value: "ClassicyAlertChord", label: "Chord" },
			{ value: "ClassicyAlertDing", label: "Ding" },
			{ value: "ClassicyAlertLogoff", label: "Logoff" },
			{ value: "ClassicyAlertNotify", label: "Notify" },
			{ value: "ClassicyAlertRecycle", label: "Recycle" },
			{ value: "ClassicyAlertStart", label: "Start" },
			{ value: "ClassicyAlertTada", label: "Tada" },
		],
		defaultAlert: "ClassicyAlertDing",
		// Asterisk (a note), Exclamation (a caution) and Critical Stop (a stop):
		// Chord, each, in Windows 98's default scheme.
		alertTypeSounds: {
			note: "ClassicyAlertChord",
			caution: "ClassicyAlertExclamation",
			stop: "ClassicyAlertChord",
		},
		src: windows98Urls,
	});

// Registered here, at module load, before the package (../../index.ts), whose
// themes' `sound.pack` must name a registered pack; the package lists it
// (`sounds`), never registering it again.
registerClassicySoundPack(windows98SoundPack);
