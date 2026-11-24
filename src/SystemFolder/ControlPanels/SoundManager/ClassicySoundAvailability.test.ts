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
	classicySoundCanPlay,
	resetClassicySoundUnavailableLogForTests,
} from "./ClassicySoundAvailability.internal";

// Story 0225-ci7, fix round 3: where there is no usable audio (Howler's
// `noAudio`, or no codec for any of the pack's formats) no player is built
// and sound's absence is noted once per page at `info`; where audio works,
// a load that fails is still an error.

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

describe("classicySoundCanPlay", () => {
	it("reads each source's format as Howler does", () => {
		expect(classicySoundCanPlay(["a.m4a", "b.ogg?v=2"])).toBe(true);
		expect(classicySoundCanPlay(["data:audio/ogg;base64,AAAA"])).toBe(true);
		expect(classicySoundCanPlay(["a.m4a", "a"])).toBe(false);
		howler.noAudio = true;
		expect(classicySoundCanPlay(["a.ogg"])).toBe(false);
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

	it("builds no player when no codec plays the pack's formats", () => {
		howler.supported = new Set(["mp3"]);
		expect(
			createSoundPlayer({ soundData: pack(["a.ogg", "a.m4a"]) }),
		).toBeNull();
		expect(built).toEqual([]);
		expect(levels()).toEqual(["info"]);
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
