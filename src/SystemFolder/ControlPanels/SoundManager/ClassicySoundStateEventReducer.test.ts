// vi.mock calls are hoisted above all imports by vitest. vi.hoisted() is used
// to create values that must exist before the hoisted mock factories run.

import type { Howl } from "howler";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicySoundActionTypes,
	type ClassicySoundState,
	ClassicySoundStateEventReducer,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import { registerClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Use vi.hoisted so the MockHowl constructor exists when the vi.mock factory
// for "howler" runs (factories are hoisted before imports).
const { MockHowl } = vi.hoisted(() => {
	class MockHowl {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		unload = vi.fn();
	}
	return { MockHowl };
});

vi.mock("howler", () => ({ Howl: MockHowl }));

vi.mock("@/Appearance/Platinum/assets/sounds/platinum", () => ({}));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerLabels.json",
	() => ({ default: [] }),
);

beforeEach(() => {
	registerClassicySoundPack({
		id: "platinum",
		name: "Platinum",
		src: ["test.mp3"],
		sprite: { click: [0, 100] },
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer() {
	return {
		play: vi.fn(),
		stop: vi.fn(),
		volume: vi.fn(),
		unload: vi.fn(),
		playing: vi.fn().mockReturnValue(false),
	} as unknown as Howl;
}

function makeSoundState(
	overrides?: Partial<ClassicySoundState>,
): ClassicySoundState {
	return {
		soundPlayer: makePlayer(),
		packId: "platinum",
		sprites: new Set([
			"click",
			"ClassicyBeep",
			"ClassicyAlertWildEep",
			"ClassicyAlertQuack",
			"ClassicyAlertBonk",
			"ClassicyAlertSosumi",
		]),
		fallbackPlayer: null,
		disabled: [],
		labels: [],
		volume: 100,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// ClassicySoundStop
// ---------------------------------------------------------------------------

describe("ClassicySoundStop", () => {
	it("calls soundPlayer.stop()", () => {
		const ss = makeSoundState();
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundStop" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.stop).toHaveBeenCalledOnce();
	});

	it("returns a new state object (not the same reference)", () => {
		const ss = makeSoundState();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundStop" as ClassicySoundActionTypes,
		});
		expect(next).not.toBe(ss);
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundPlay
// ---------------------------------------------------------------------------

describe("ClassicySoundPlay", () => {
	it("calls soundPlayer.play(sound) when not disabled and not playing", () => {
		const ss = makeSoundState();
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("click");
	});

	it("does NOT play when sound is in disabled list", () => {
		const ss = makeSoundState({ disabled: ["click"] });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});

	it("does NOT play when '*' is in disabled list", () => {
		const ss = makeSoundState({ disabled: ["*"] });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});

	it("does NOT play when already playing", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({ soundPlayer: player });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundPlayInterrupt
// ---------------------------------------------------------------------------

describe("ClassicySoundPlayInterrupt", () => {
	it("stops then plays even when already playing", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({ soundPlayer: player });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.stop).toHaveBeenCalledOnce();
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("click");
	});

	it("does NOT play when sound is disabled", () => {
		const ss = makeSoundState({ disabled: ["click"] });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "click",
		});
		expect(ss.soundPlayer?.stop).not.toHaveBeenCalled();
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});

	// HyperCard's `play` action effect (HyperCard.tsx) dispatches
	// ClassicySoundPlayInterrupt with whatever `sound` the authored/edited
	// action carries, including undefined for a cleared or hand-authored
	// action with no sound. Howler's `Howl.play()` called with no argument
	// plays the ENTIRE sprite sheet rather than a single sprite, so this guard
	// (action.sound must be truthy before either stop() or play() fires) is
	// what keeps a missing sound from being dangerous.
	it("does NOT stop or play when sound is undefined (would play the whole sprite sheet otherwise)", () => {
		const ss = makeSoundState();
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: undefined,
		});
		expect(ss.soundPlayer?.stop).not.toHaveBeenCalled();
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundPlayError
// ---------------------------------------------------------------------------

describe("ClassicySoundPlayError", () => {
	it("stops then plays the error sound", () => {
		const ss = makeSoundState();
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayError" as ClassicySoundActionTypes,
			sound: "ClassicyAlertWildEep",
		});
		expect(ss.soundPlayer?.stop).toHaveBeenCalledOnce();
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertWildEep");
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundLoad
// ---------------------------------------------------------------------------

describe("ClassicySoundLoad", () => {
	it("updates soundPlayer when a pack is provided", () => {
		const ss = makeSoundState();
		const original = ss.soundPlayer;
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
			pack: {
				id: "new",
				name: "New",
				src: ["new.mp3"],
				sprite: { ding: [0, 200] },
			},
		});
		// ClassicySoundLoad calls createSoundPlayer → new MockHowl — the returned
		// player is a different instance from the one we put in the test state.
		expect(next.soundPlayer).not.toBe(original);
	});

	it("updates disabled list when disabled array is provided", () => {
		const ss = makeSoundState();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
			disabled: ["click", "drag"],
		});
		expect(next.disabled).toEqual(["click", "drag"]);
	});

	it("keeps existing soundPlayer when pack is not provided", () => {
		const ss = makeSoundState();
		const original = ss.soundPlayer;
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
		});
		expect(next.soundPlayer).toBe(original);
	});

	it("keeps existing disabled when disabled is not provided", () => {
		const ss = makeSoundState({ disabled: ["beep"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
		});
		expect(next.disabled).toEqual(["beep"]);
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundSet
// ---------------------------------------------------------------------------

describe("ClassicySoundSet", () => {
	it("sets soundPlayer to provided value", () => {
		const ss = makeSoundState();
		const newPlayer = makePlayer();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundSet" as ClassicySoundActionTypes,
			soundPlayer: newPlayer,
		});
		expect(next.soundPlayer).toBe(newPlayer);
	});

	it("sets soundPlayer to null when soundPlayer is absent from action", () => {
		const ss = makeSoundState();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundSet" as ClassicySoundActionTypes,
			// soundPlayer omitted → undefined → null via nullish coalescing
		});
		expect(next.soundPlayer).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// ClassicyVolumeSet
// ---------------------------------------------------------------------------

describe("ClassicyVolumeSet", () => {
	it("updates volume in returned state", () => {
		const ss = makeSoundState({ volume: 100 });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicyVolumeSet" as ClassicySoundActionTypes,
			volume: 42,
		});
		expect(next.volume).toBe(42);
	});

	it("clamps to 0–100 and rounds to a whole percentage", () => {
		const set = (volume: number | undefined) =>
			ClassicySoundStateEventReducer(makeSoundState({ volume: 50 }), {
				type: "ClassicyVolumeSet" as ClassicySoundActionTypes,
				volume,
			}).volume;
		expect(set(150)).toBe(100);
		expect(set(-5)).toBe(0);
		expect(set(33.6)).toBe(34);
		expect(set(Number.NaN)).toBe(50); // ignored
		expect(set(undefined)).toBe(50); // ignored
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundDisable
// ---------------------------------------------------------------------------

describe("ClassicySoundDisable", () => {
	it("replaces disabled list with provided array", () => {
		const ss = makeSoundState({ disabled: ["old"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundDisable" as ClassicySoundActionTypes,
			disabled: ["click", "drag"],
		});
		expect(next.disabled).toEqual(["click", "drag"]);
	});

	it("wraps a single string in an array", () => {
		const ss = makeSoundState({ disabled: [] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundDisable" as ClassicySoundActionTypes,
			disabled: "click",
		});
		expect(next.disabled).toEqual(["click"]);
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundDisableOne
// ---------------------------------------------------------------------------

describe("ClassicySoundDisableOne", () => {
	it("adds a sound to the disabled list, deduplicating via Set", () => {
		const ss = makeSoundState({ disabled: ["beep"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundDisableOne" as ClassicySoundActionTypes,
			disabled: "click",
		});
		expect(next.disabled).toEqual(["beep", "click"]);
	});

	it("does not duplicate when the sound is already disabled", () => {
		const ss = makeSoundState({ disabled: ["click"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundDisableOne" as ClassicySoundActionTypes,
			disabled: "click",
		});
		expect(next.disabled).toEqual(["click"]);
	});

	it("is a no-op (returns same reference) when action.disabled is undefined", () => {
		const ss = makeSoundState({ disabled: ["beep"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundDisableOne" as ClassicySoundActionTypes,
		});
		expect(next).toBe(ss);
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundEnableOne
// ---------------------------------------------------------------------------

describe("ClassicySoundEnableOne", () => {
	it("removes a sound from the disabled list", () => {
		const ss = makeSoundState({ disabled: ["beep", "click"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundEnableOne" as ClassicySoundActionTypes,
			enabled: "click",
		});
		expect(next.disabled).toEqual(["beep"]);
	});

	it("is a no-op (returns same reference) when action.enabled is undefined", () => {
		const ss = makeSoundState({ disabled: ["beep"] });
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundEnableOne" as ClassicySoundActionTypes,
		});
		expect(next).toBe(ss);
	});
});

// ---------------------------------------------------------------------------
// Default / unhandled action
// ---------------------------------------------------------------------------

describe("Default (unhandled action)", () => {
	beforeEach(() => {
		vi.stubEnv("NODE_ENV", "development");
	});

	it("returns a copy of state for an unknown action type", () => {
		const ss = makeSoundState();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundNonExistent" as ClassicySoundActionTypes,
		});
		expect(next).not.toBe(ss);
		expect(next.volume).toBe(ss.volume);
		expect(next.disabled).toEqual(ss.disabled);
	});

	it("emits console.warn in dev mode for an unknown action type", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ss = makeSoundState();
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundNonExistent" as ClassicySoundActionTypes,
		});
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Unhandled action type"),
			expect.objectContaining({ type: "ClassicySoundNonExistent" }),
		);
		warnSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundSetAlertSound / ClassicyAlertSound / PlayError fallback
// ---------------------------------------------------------------------------

describe("ClassicySoundSetAlertSound", () => {
	it("stores the alert sound in state", () => {
		const ss = makeSoundState();
		const next = ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundSetAlertSound" as ClassicySoundActionTypes,
			sound: "ClassicyAlertQuack",
		});
		expect(next.alertSound).toBe("ClassicyAlertQuack");
	});
});

describe("ClassicyAlertSound", () => {
	it("plays the selected alert sound", () => {
		const ss = makeSoundState({ alertSound: "ClassicyAlertQuack" });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertQuack");
	});

	it("falls back to Sosumi when no alert sound is set", () => {
		const ss = makeSoundState({ alertSound: undefined });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertSosumi");
	});

	it("does not play a disabled alert sound", () => {
		const ss = makeSoundState({
			alertSound: "ClassicyAlertQuack",
			disabled: ["ClassicyAlertQuack"],
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});

describe("ClassicySoundPlayError fallback", () => {
	it("plays the selected alert sound when no sound is given", () => {
		const ss = makeSoundState({ alertSound: "ClassicyAlertQuack" });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayError" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertQuack");
	});

	it("still honors an explicit sound", () => {
		const ss = makeSoundState({ alertSound: "ClassicyAlertQuack" });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayError" as ClassicySoundActionTypes,
			sound: "ClassicyAlertBonk",
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertBonk");
	});
});

// ---------------------------------------------------------------------------
// ClassicySoundPlayInterrupt vs ClassicySoundPlay while sounding
// ---------------------------------------------------------------------------

describe("ClassicySoundPlayInterrupt vs ClassicySoundPlay while sounding", () => {
	it("plays even when another sound is already sounding", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({ soundPlayer: player });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyBeep");
	});

	it("is still suppressed when the sound is disabled", () => {
		const player = makePlayer();
		(player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const ss = makeSoundState({
			soundPlayer: player,
			disabled: ["ClassicyBeep"],
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Alert volume: ClassicySoundSetAlertVolume + per-alert gain
// ---------------------------------------------------------------------------

// A player whose play() hands back a Howler sound id, as the real one does.
function makePlayerReturningId(id: number) {
	const player = makePlayer();
	(player.play as ReturnType<typeof vi.fn>).mockReturnValue(id);
	return player;
}

describe("ClassicySoundSetAlertVolume", () => {
	it("stores a whole-number alert volume", () => {
		const next = ClassicySoundStateEventReducer(makeSoundState(), {
			type: "ClassicySoundSetAlertVolume" as ClassicySoundActionTypes,
			alertVolume: 42,
		});
		expect(next.alertVolume).toBe(42);
	});

	it("clamps to 0–100 and rounds", () => {
		const set = (alertVolume: number) =>
			ClassicySoundStateEventReducer(makeSoundState(), {
				type: "ClassicySoundSetAlertVolume" as ClassicySoundActionTypes,
				alertVolume,
			}).alertVolume;
		expect(set(150)).toBe(100);
		expect(set(-5)).toBe(0);
		expect(set(33.6)).toBe(34);
	});

	it("ignores a missing or non-finite level", () => {
		const ss = makeSoundState({ alertVolume: 60 });
		for (const alertVolume of [undefined, Number.NaN, Infinity]) {
			const next = ClassicySoundStateEventReducer(ss, {
				type: "ClassicySoundSetAlertVolume" as ClassicySoundActionTypes,
				alertVolume,
			});
			expect(next).toBe(ss);
		}
	});
});

describe("alert volume scaling", () => {
	it("ClassicyAlertSound sets that sound's gain to system × alert volume", () => {
		const ss = makeSoundState({
			soundPlayer: makePlayerReturningId(7),
			volume: 80,
			alertVolume: 50,
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.volume).toHaveBeenCalledWith(0.4, 7);
	});

	it("ClassicySoundPlayError scales the alert it plays the same way", () => {
		const ss = makeSoundState({
			soundPlayer: makePlayerReturningId(3),
			volume: 50,
			alertVolume: 20,
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayError" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.volume).toHaveBeenCalledWith(0.1, 3);
	});

	it("treats an unset alert volume as 100% (alerts at system volume)", () => {
		const ss = makeSoundState({
			soundPlayer: makePlayerReturningId(9),
			volume: 60,
			alertVolume: undefined,
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.volume).toHaveBeenCalledWith(0.6, 9);
	});

	it("leaves the gain alone when play() returns no sound id", () => {
		const ss = makeSoundState({ alertVolume: 50 });
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicyAlertSound" as ClassicySoundActionTypes,
		});
		expect(ss.soundPlayer?.volume).not.toHaveBeenCalled();
	});

	it("does not touch the volume of ordinary interface sounds", () => {
		const ss = makeSoundState({
			soundPlayer: makePlayerReturningId(5),
			alertVolume: 10,
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlayInterrupt" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		ClassicySoundStateEventReducer(ss, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(ss.soundPlayer?.volume).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Sound packs: packId, sprites and the Platinum fallback player
// ---------------------------------------------------------------------------

const remotePack = {
	id: "remote",
	name: "Remote",
	src: ["https://cdn.example.com/remote.ogg"],
	sprite: { ClassicyBeep: [0, 100] as [number, number] },
};

const loadRemote = (ss: ClassicySoundState) =>
	ClassicySoundStateEventReducer(ss, {
		type: "ClassicySoundLoad" as ClassicySoundActionTypes,
		pack: remotePack,
	});

describe("ClassicySoundLoad packs", () => {
	it("ClassicySoundLoad sets packId, sprites and a platinum fallback player for a non-platinum pack", () => {
		const next = loadRemote(makeSoundState());
		expect(next.packId).toBe("remote");
		expect(next.sprites.has("ClassicyBeep")).toBe(true);
		expect(next.fallbackPlayer).toBeInstanceOf(MockHowl);
		const platinum = ClassicySoundStateEventReducer(next, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
			pack: {
				id: "platinum",
				name: "Platinum",
				src: ["test.mp3"],
				sprite: { click: [0, 100] },
			},
		});
		expect(platinum.fallbackPlayer).toBeNull();
	});

	it("plays a sprite missing from the active pack on the fallback player", () => {
		const next = loadRemote(makeSoundState());
		ClassicySoundStateEventReducer(next, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "ClassicyWindowOpen",
		});
		expect(next.fallbackPlayer?.play).toHaveBeenCalledWith(
			"ClassicyWindowOpen",
		);
		expect(next.soundPlayer?.play).not.toHaveBeenCalled();
	});

	it("plays a sprite the active pack has on the active player", () => {
		const next = loadRemote(makeSoundState());
		ClassicySoundStateEventReducer(next, {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		expect(next.soundPlayer?.play).toHaveBeenCalledWith("ClassicyBeep");
		expect(next.fallbackPlayer?.play).not.toHaveBeenCalled();
	});

	it("warns once about missing sprites on load", () => {
		const warn = vi.spyOn(ClassicyLog, "classicyLog");
		loadRemote(makeSoundState());
		const calls = warn.mock.calls.filter(
			(c) => c[0] === "warn" && String(c[2]).includes("missing sprites"),
		);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toBe("ClassicySoundManager");
		warn.mockRestore();
	});

	it("unloads the previous player on reload", () => {
		const previous = makePlayer();
		loadRemote(makeSoundState({ soundPlayer: previous }));
		expect(previous.unload).toHaveBeenCalledOnce();
	});
});
