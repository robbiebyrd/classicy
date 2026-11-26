import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSoundPlayer,
	initialPlayer,
	seedSoundState,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	classicyAudioAvailable,
	resetClassicySoundUnavailableLogForTests,
} from "./ClassicySoundAvailability.internal";

// Story 0225-ci7, fix rounds 3 and 4: where the environment plays no audio
// at all (Howler's `noAudio`, or no format Howler knows: jsdom, audio
// disabled) no player is built and sound's absence is noted once per page at
// `info`. Where audio works, every pack gets its Howl, and a pack whose own
// sources fail (no supported format among them) is an error, per pack.

const { howler, built } = vi.hoisted(() => ({
	howler: {
		noAudio: false,
		supported: new Set<string>(["ogg"]),
		failLoad: false,
	},
	built: [] as { src: string[] }[],
}));

vi.mock("howler", () => ({
	Howler: {
		get noAudio() {
			return howler.noAudio;
		},
		codecs: (ext: string) => howler.supported.has(ext),
	},
	Howl: class {
		constructor(opts: {
			src: string[];
			onloaderror?: (id: number, err: unknown) => void;
		}) {
			built.push({ src: opts.src });
			if (howler.failLoad) opts.onloaderror?.(0, "404 Not Found");
		}
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
	},
}));

let entries: ClassicyLogEntry[] = [];
beforeEach(() => {
	entries = [];
	built.length = 0;
	howler.noAudio = false;
	howler.supported = new Set(["ogg"]);
	howler.failLoad = false;
	resetClassicySoundUnavailableLogForTests();
	registerClassicyLogSink({ id: "avail", onLog: (e) => entries.push(e) });
});
afterEach(() => unregisterClassicyLogSink("avail"));

const pack = (src: string[]) => ({
	id: "platinum",
	name: "Platinum",
	src,
	sprite: { ClassicyBeep: [0, 100] as [number, number] },
});
const levels = () =>
	entries
		.filter((e) => e.subsystem === "ClassicySoundManager")
		.map((e) => e.level);

describe("classicyAudioAvailable", () => {
	it("is the environment's state, never a pack's", () => {
		expect(classicyAudioAvailable()).toBe(true);
		howler.supported = new Set(["mp3"]);
		expect(classicyAudioAvailable()).toBe(true);
		howler.supported = new Set();
		expect(classicyAudioAvailable()).toBe(false);
		howler.supported = new Set(["ogg"]);
		howler.noAudio = true;
		expect(classicyAudioAvailable()).toBe(false);
	});
});

describe("createSoundPlayer", () => {
	it("builds no player without audio, and says so once, at info", () => {
		howler.noAudio = true;
		expect(createSoundPlayer({ soundData: pack(["a.ogg"]) })).toBeNull();
		expect(createSoundPlayer({ soundData: pack(["a.ogg"]) })).toBeNull();
		expect(built).toEqual([]);
		expect(levels()).toEqual(["info"]);
	});

	it("builds no player where the browser plays no format at all (jsdom)", () => {
		howler.supported = new Set();
		expect(
			createSoundPlayer({ soundData: pack(["a.ogg", "a.m4a"]) }),
		).toBeNull();
		expect(built).toEqual([]);
		expect(levels()).toEqual(["info"]);
	});

	// Re-review 2, A1: a pack's own unsupported formats, where others play,
	// are the pack's failure, not the environment's.
	it("builds a pack whose own formats are unsupported where others play", () => {
		howler.supported = new Set(["mp3"]);
		expect(
			createSoundPlayer({ soundData: pack(["a.ogg", "a.m4a"]) }),
		).not.toBeNull();
		expect(built).toEqual([{ src: ["a.ogg", "a.m4a"] }]);
		expect(levels()).toEqual([]);
	});

	it("still reports a real load failure as an error where audio works", () => {
		howler.failLoad = true;
		expect(createSoundPlayer({ soundData: pack(["a.ogg"]) })).not.toBeNull();
		expect(built).toEqual([{ src: ["a.ogg"] }]);
		expect(entries.map((e) => [e.level, e.message])).toEqual([
			["error", "Failed to load audio sprite"],
		]);
	});

	// 0223-a0y's server guard means the same: no window, no player, no log.
	it("leaves a server render's seed alone", () => {
		vi.stubGlobal("window", undefined);
		try {
			const start = seedSoundState(initialPlayer, "platinum", false);
			expect(start).toBe(initialPlayer);
		} finally {
			vi.unstubAllGlobals();
		}
		expect(built).toEqual([]);
		expect(entries).toEqual([]);
	});
});
