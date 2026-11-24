import { Howler } from "howler";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSoundPlayer } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { resetClassicySoundUnavailableLogForTests } from "./ClassicySoundAvailability.internal";

// Story 0225-ci7, re-review 2's A1 probe with the real Howler: a browser
// that plays mp3 only (Howler's codec table stubbed; `noAudio` false), and
// three packs it cannot play, an ogg-only pack, a `blob:` URL and an
// extensionless URL. Each builds its Howl, and each reports its own load
// error, as origin/main did; nothing says sound is unavailable here.

let entries: ClassicyLogEntry[] = [];
beforeEach(() => {
	entries = [];
	resetClassicySoundUnavailableLogForTests();
	registerClassicyLogSink({ id: "howler", onLog: (e) => entries.push(e) });
	vi.spyOn(Howler, "codecs").mockImplementation((f: string) => f === "mp3");
	// Howler warns for a source without an extension; that is Howler's.
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
	unregisterClassicyLogSink("howler");
	vi.restoreAllMocks();
});

const pack = (src: string) => ({
	id: src,
	name: src,
	src: [src],
	sprite: { ClassicyBeep: [0, 100] as [number, number] },
});

describe("a pack the browser cannot play, where audio works", () => {
	it("is built and reports its own error, per pack", async () => {
		expect(Howler.noAudio).toBe(false);
		const sources = [
			"host-a.ogg",
			"blob:http://h/1234",
			"https://cdn/x/sprite",
		];
		const players = sources.map((src) =>
			createSoundPlayer({ soundData: pack(src) }),
		);
		expect(players.every((p) => p !== null)).toBe(true);
		// Howler emits its load error on a timer.
		await new Promise((resolve) => setTimeout(resolve, 20));
		const sound = entries.filter((e) => e.subsystem === "ClassicySoundManager");
		expect(sound.map((e) => [e.level, e.message])).toEqual(
			sources.map(() => ["error", "Failed to load audio sprite"]),
		);
		expect(
			sound.map((e) => (e.details[0] as { src: string[] }).src[0]),
		).toEqual(sources);
		for (const player of players) player?.unload();
	});
});
