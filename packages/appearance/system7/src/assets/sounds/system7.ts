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
 * no other. It is a placeholder that plan 0018-dbd §4.2 replaces with the
 * System 7.5 alert sounds (a sprite sheet built by bin/make_audio_sprites.sh,
 * Simple Beep the default alert). Until then it holds no sprite (its sheet is
 * 20 ms of silence, 8-bit mono PCM) and declares no `alerts`, so it takes the
 * default pack's alerts and sprites, as any pack does for what it lacks: with
 * Platinum registered, the Sound tab lists Platinum's alerts and they play
 * from Platinum's pack, as do the boot sound and the error beep; without it,
 * nothing plays. System 7 had no interface feedback sounds (design 0017-6me),
 * and the package has no hooks that would play them.
 */
export const system7SoundPack: ClassicySoundPack =
	ClassicySoundPackSchema.parse({
		id: SYSTEM7,
		name: "System 7",
		packageId: SYSTEM7,
		src: [silence],
		sprite: {},
	});

// Registered here, at module load, before the package (../../index.ts), whose
// themes' `sound.pack` must name a registered pack; the package lists it
// (`sounds`), never registering it again.
registerClassicySoundPack(system7SoundPack);
