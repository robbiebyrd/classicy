import { Howler } from "howler";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Every format Howler tests the browser for (its `_setupCodecs` table).
const HOWLER_FORMATS = [
	"mp3",
	"mpeg",
	"opus",
	"ogg",
	"oga",
	"wav",
	"aac",
	"caf",
	"m4a",
	"m4b",
	"mp4",
	"weba",
	"webm",
	"dolby",
	"flac",
] as const;

/**
 * Whether this environment plays audio at all, by Howler's own test: false
 * when Howler has no audio (`Howler.noAudio`) or the browser plays none of
 * the formats Howler knows, which is jsdom's case (its `canPlayType`
 * supports nothing) and a browser with audio disabled. A pack whose own
 * sources are unsupported where other formats play (an ogg-only pack in a
 * browser without ogg, a `blob:` or extensionless URL) is not this case:
 * its Howl is built and reports the failure as a load error, per pack.
 * `undefined` when Howler's global is not there to ask (a test's stand-in
 * for the module): the caller then builds its player as before.
 */
export function classicyAudioAvailable(): boolean | undefined {
	let howler: typeof Howler | undefined;
	try {
		howler = Howler;
	} catch {
		// A mocked module without `Howler` throws on access.
		return undefined;
	}
	if (!howler || typeof howler.codecs !== "function") return undefined;
	if (howler.noAudio) return false;
	return HOWLER_FORMATS.some((format) => Boolean(howler.codecs(format)));
}

let unavailableLogged = false;

/**
 * Logs, once per page, that sound is unavailable here: at `info`, since it
 * is the environment's state (jsdom, audio disabled), not a failure.
 */
export function logClassicySoundUnavailable(): void {
	if (unavailableLogged) return;
	unavailableLogged = true;
	classicyLog(
		"info",
		"ClassicySoundManager",
		"Sound is unavailable here (no audio, or no audio format this browser plays); sounds play nothing",
	);
}

/** Tests only: let the next unavailable environment log again. */
export function resetClassicySoundUnavailableLogForTests(): void {
	unavailableLogged = false;
}
