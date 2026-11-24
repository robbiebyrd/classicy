import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	classicyLog,
	registerClassicySoundPack,
} from "@classicy/classicy";
import windows98Json from "./windows98/windows98.json";

const WINDOWS98 = "windows98";

// The sprite sheet bin/make_audio_sprites.sh writes beside its JSON, from the
// WAV sources in ./windows98/sprites: four alert tones and a beep. Windows'
// own sounds (Ding, Chord, Chimes, Tada, …) are Microsoft's, so these are
// synthesized stand-ins written for the package, bell-like tones named after
// the roles Windows gave its sounds. Imported as files, like the art: the
// package's build emits them in dist/assets.
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
 * (`sound.pack`): four alert tones the Sound tab lists (Ding the default,
 * as Windows' "Default sound" was) plus `ClassicyBeep` (Ding again:
 * HyperCard's `beep`). Nothing else: the package has no hooks that would
 * play interface feedback. A sprite the pack lacks plays from the default
 * pack when one is registered (Platinum's), as for any pack; a stored choice
 * of an alert Windows 98 lacks (Platinum's Sosumi, say) plays Ding.
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
			{ value: "ClassicyAlertExclamation", label: "Exclamation" },
		],
		defaultAlert: "ClassicyAlertDing",
		src: windows98Urls,
	});

// Registered here, at module load, before the package (../../index.ts), whose
// themes' `sound.pack` must name a registered pack; the package lists it
// (`sounds`), never registering it again.
registerClassicySoundPack(windows98SoundPack);
