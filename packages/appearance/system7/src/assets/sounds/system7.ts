import {
	type ClassicySoundPack,
	ClassicySoundPackSchema,
	registerClassicySoundPack,
} from "@classicy/classicy";
import silence from "./system7/silence.wav";

const SYSTEM7 = "system7";

/**
 * System 7's sound pack, `system7`, which both themes name (`sound.pack`):
 * a theme must name a registered pack, and a host loading only System 7 has
 * no other. Until the System 7.5 alert sounds land (plan 0018-dbd §4.2: a
 * sprite sheet built by bin/make_audio_sprites.sh, Simple Beep the default
 * alert), the pack holds no sprite: its sheet is 20 ms of silence (8-bit mono
 * PCM) and it declares no alerts, so the Sound tab lists none and alerts play
 * nothing. The sprites it lacks (the boot sound, the error beep) play from
 * the Platinum pack when that is registered, and nothing otherwise. System 7
 * had no interface feedback sounds (design 0017-6me), and the package has no
 * hooks that would play them.
 */
export const system7SoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		id: SYSTEM7,
		name: "System 7",
		packageId: SYSTEM7,
		src: [silence],
		sprite: {},
		alerts: [],
	});

// Registered here, at module load, before the package (../../index.ts), whose
// themes' `sound.pack` must name a registered pack; the package lists it
// (`sounds`), never registering it again.
registerClassicySoundPack(system7SoundPack);
