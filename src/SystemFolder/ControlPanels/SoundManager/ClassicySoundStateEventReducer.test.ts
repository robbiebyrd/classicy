// vi.mock calls are hoisted above all imports by vitest. vi.hoisted() is used
// to create values that must exist before the hoisted mock factories run.
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    ClassicySoundStateEventReducer,
    ClassicySoundState,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import type { Howl } from "howler";

// Use vi.hoisted so the MockHowl constructor exists when the vi.mock factory
// for "howler" runs (factories are hoisted before imports).
const { MockHowl } = vi.hoisted(() => {
    class MockHowl {
        play = vi.fn();
        stop = vi.fn();
        volume = vi.fn();
        playing = vi.fn().mockReturnValue(false);
    }
    return { MockHowl };
});

vi.mock("howler", () => ({ Howl: MockHowl }));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds", () => ({
    ClassicySounds: {
        platinum: { src: ["test.mp3"], sprite: { click: [0, 100] } },
    },
}));

vi.mock(
    "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerLabels.json",
    () => ({ default: [] }),
);

// ---------------------------------------------------------------------------
// The reducer validates action.type via ClassicySoundActionTypes[type], which
// maps a string key → numeric enum value used in the switch. Passing numeric
// enum values (e.g. ClassicySoundActionTypes.ClassicySoundStop === 0) produces
// a reverse-lookup string, which never matches the numeric switch cases.
// Therefore all actions must use string keys.
// ---------------------------------------------------------------------------

/** Shorthand type so tests stay concise */
type ActionType = keyof typeof import("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils").ClassicySoundActionTypes;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer() {
    return {
        play: vi.fn(),
        stop: vi.fn(),
        volume: vi.fn(),
        playing: vi.fn().mockReturnValue(false),
    } as unknown as Howl;
}

function makeSoundState(overrides?: Partial<ClassicySoundState>): ClassicySoundState {
    return {
        soundPlayer: makePlayer(),
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
        ClassicySoundStateEventReducer(ss, { type: "ClassicySoundStop" as ActionType });
        expect(ss.soundPlayer!.stop).toHaveBeenCalledOnce();
    });

    it("returns a new state object (not the same reference)", () => {
        const ss = makeSoundState();
        const next = ClassicySoundStateEventReducer(ss, { type: "ClassicySoundStop" as ActionType });
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
            type: "ClassicySoundPlay" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.play).toHaveBeenCalledWith("click");
    });

    it("does NOT play when sound is in disabled list", () => {
        const ss = makeSoundState({ disabled: ["click"] });
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundPlay" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.play).not.toHaveBeenCalled();
    });

    it("does NOT play when '*' is in disabled list", () => {
        const ss = makeSoundState({ disabled: ["*"] });
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundPlay" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.play).not.toHaveBeenCalled();
    });

    it("does NOT play when already playing", () => {
        const player = makePlayer();
        (player.playing as ReturnType<typeof vi.fn>).mockReturnValue(true);
        const ss = makeSoundState({ soundPlayer: player });
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundPlay" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.play).not.toHaveBeenCalled();
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
            type: "ClassicySoundPlayInterrupt" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.stop).toHaveBeenCalledOnce();
        expect(ss.soundPlayer!.play).toHaveBeenCalledWith("click");
    });

    it("does NOT play when sound is disabled", () => {
        const ss = makeSoundState({ disabled: ["click"] });
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundPlayInterrupt" as ActionType,
            sound: "click",
        });
        expect(ss.soundPlayer!.stop).not.toHaveBeenCalled();
        expect(ss.soundPlayer!.play).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// ClassicySoundPlayError
// ---------------------------------------------------------------------------

describe("ClassicySoundPlayError", () => {
    it("stops then plays the error sound", () => {
        const ss = makeSoundState();
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundPlayError" as ActionType,
            sound: "ClassicyAlertWildEep",
        });
        expect(ss.soundPlayer!.stop).toHaveBeenCalledOnce();
        expect(ss.soundPlayer!.play).toHaveBeenCalledWith("ClassicyAlertWildEep");
    });
});

// ---------------------------------------------------------------------------
// ClassicySoundLoad
// ---------------------------------------------------------------------------

describe("ClassicySoundLoad", () => {
    it("updates soundPlayer when file is provided", () => {
        const ss = makeSoundState();
        const original = ss.soundPlayer;
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundLoad" as ActionType,
            file: { src: ["new.mp3"], sprite: { ding: [0, 200] } },
        });
        // loadSoundTheme calls createSoundPlayer → new MockHowl — the returned
        // player is a different instance from the one we put in the test state.
        expect(next.soundPlayer).not.toBe(original);
    });

    it("updates disabled list when disabled array is provided", () => {
        const ss = makeSoundState();
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundLoad" as ActionType,
            disabled: ["click", "drag"],
        });
        expect(next.disabled).toEqual(["click", "drag"]);
    });

    it("keeps existing soundPlayer when file is not provided", () => {
        const ss = makeSoundState();
        const original = ss.soundPlayer;
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundLoad" as ActionType,
        });
        expect(next.soundPlayer).toBe(original);
    });

    it("keeps existing disabled when disabled is not provided", () => {
        const ss = makeSoundState({ disabled: ["beep"] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundLoad" as ActionType,
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
            type: "ClassicySoundSet" as ActionType,
            soundPlayer: newPlayer,
        });
        expect(next.soundPlayer).toBe(newPlayer);
    });

    it("sets soundPlayer to null when soundPlayer is absent from action", () => {
        const ss = makeSoundState();
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundSet" as ActionType,
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
            type: "ClassicyVolumeSet" as ActionType,
            volume: 42,
        });
        expect(next.volume).toBe(42);
    });
});

// ---------------------------------------------------------------------------
// ClassicySoundDisable
// ---------------------------------------------------------------------------

describe("ClassicySoundDisable", () => {
    it("replaces disabled list with provided array", () => {
        const ss = makeSoundState({ disabled: ["old"] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundDisable" as ActionType,
            disabled: ["click", "drag"],
        });
        expect(next.disabled).toEqual(["click", "drag"]);
    });

    it("wraps a single string in an array", () => {
        const ss = makeSoundState({ disabled: [] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundDisable" as ActionType,
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
            type: "ClassicySoundDisableOne" as ActionType,
            disabled: "click",
        });
        expect(next.disabled).toEqual(["beep", "click"]);
    });

    it("does not duplicate when the sound is already disabled", () => {
        const ss = makeSoundState({ disabled: ["click"] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundDisableOne" as ActionType,
            disabled: "click",
        });
        expect(next.disabled).toEqual(["click"]);
    });

    it("is a no-op (returns same reference) when action.disabled is undefined", () => {
        const ss = makeSoundState({ disabled: ["beep"] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundDisableOne" as ActionType,
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
            type: "ClassicySoundEnableOne" as ActionType,
            enabled: "click",
        });
        expect(next.disabled).toEqual(["beep"]);
    });

    it("is a no-op (returns same reference) when action.enabled is undefined", () => {
        const ss = makeSoundState({ disabled: ["beep"] });
        const next = ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundEnableOne" as ActionType,
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
            type: "ClassicySoundNonExistent" as ActionType,
        });
        expect(next).not.toBe(ss);
        expect(next.volume).toBe(ss.volume);
        expect(next.disabled).toEqual(ss.disabled);
    });

    it("emits console.warn in dev mode for an unknown action type", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const ss = makeSoundState();
        ClassicySoundStateEventReducer(ss, {
            type: "ClassicySoundNonExistent" as ActionType,
        });
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("Unhandled action type"),
            expect.objectContaining({ type: "ClassicySoundNonExistent" }),
        );
        warnSpy.mockRestore();
    });
});
