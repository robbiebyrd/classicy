import { Howler } from "howler";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Whether this environment can play any of `src`, by Howler's own test: no
 * `Howler.noAudio`, and some source whose format (a `data:audio/<format>`
 * URI's, else the URL's extension, as Howler reads it) Howler's codec table
 * supports. jsdom (whose `canPlayType` supports nothing) and a browser with
 * audio disabled fail it; a Howl built there only reports "No codec
 * support" or "No audio support" as a load error. `undefined` when Howler's
 * global is not there to ask (a test's stand-in for the module): the caller
 * then builds its player as before.
 */
export function classicySoundCanPlay(
	src: readonly string[],
): boolean | undefined {
	let howler: typeof Howler | undefined;
	try {
		howler = Howler;
	} catch {
		// A mocked module without `Howler` throws on access.
		return undefined;
	}
	if (!howler || typeof howler.codecs !== "function") return undefined;
	if (howler.noAudio) return false;
	return src.some((url) => {
		const format = (
			/^data:audio\/([^;,]+);/i.exec(url)?.[1] ??
			/\.([^.]+)$/.exec(url.split("?", 1)[0])?.[1]
		)?.toLowerCase();
		return format !== undefined && Boolean(howler.codecs(format));
	});
}

let unavailableLogged = false;

/**
 * Logs, once per page, that sound is unavailable here: at `info`, since it
 * is the environment's state (jsdom, audio disabled), not a failure.
 */
export function logClassicySoundUnavailable(src: readonly string[]): void {
	if (unavailableLogged) return;
	unavailableLogged = true;
	classicyLog(
		"info",
		"ClassicySoundManager",
		"Sound is unavailable here (no audio, or no codec for the sound pack's formats); sounds play nothing",
		{ src },
	);
}

/** Tests only: let the next unavailable environment log again. */
export function resetClassicySoundUnavailableLogForTests(): void {
	unavailableLogged = false;
}
