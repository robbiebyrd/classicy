import { act, StrictMode, useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import {
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Story 0225-ci7, fix round 1: the sound reducer is pure, so StrictMode's
// double calls of reducers and initializers build no second Howl and play
// nothing twice; the provider builds the players and runs each queued
// command once, in effects.

const { created, instances } = vi.hoisted(() => ({
	created: [] as string[][],
	instances: [] as {
		play: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
		unload: ReturnType<typeof vi.fn>;
	}[],
}));

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn(() => 1);
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor(opts: { src: string[] }) {
			created.push(opts.src);
			instances.push(this);
		}
	},
}));

const { appearance } = vi.hoisted(() => ({
	appearance: {
		alertSound: "ClassicyAlertQuack",
		alertVolume: 100,
		activeTheme: { sound: { pack: "remote", disabled: [] as string[] } },
	},
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({ System: { Manager: { Appearance: appearance } } });
		const useAppManager = Object.assign(
			(selector: (s: unknown) => unknown): unknown => selector(state()),
			{ getState: state },
		);
		return { useAppManager };
	},
);

const sprites = {
	ClassicyBeep: [0, 100] as [number, number],
	ClassicyAlertQuack: [100, 100] as [number, number],
};

beforeEach(() => {
	created.length = 0;
	instances.length = 0;
	resetClassicySoundPacks();
	registerClassicySoundPack({
		id: "platinum",
		name: "Platinum",
		src: ["platinum.ogg"],
		sprite: sprites,
		alerts: [{ value: "ClassicyAlertQuack", label: "Quack" }],
	});
	registerClassicySoundPack({
		id: "remote",
		name: "Remote",
		src: ["remote.ogg"],
		sprite: { ClassicyBeep: [0, 100] },
	});
});

afterEach(() => {
	vi.useRealTimers();
});

const plays = () =>
	instances.flatMap((h) => h.play.mock.calls.map((c) => c[0]));

/** Plays `sound` once, from a mount effect (as the boot chime does). */
const PlayOnMount = ({ type, sound }: { type: string; sound?: string }) => {
	const dispatch = useSoundDispatch();
	const done = useRef(false);
	useEffect(() => {
		if (done.current) return;
		done.current = true;
		dispatch({ type, sound });
	}, [dispatch, type, sound]);
	return null;
};

let dispatchRef: ReturnType<typeof useSoundDispatch> = () => undefined;
const Dispatcher = () => {
	dispatchRef = useSoundDispatch();
	return null;
};

describe("ClassicySoundManagerProvider under StrictMode", () => {
	it("builds one Howl per pack", () => {
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<Dispatcher />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		expect(created).toEqual([["remote.ogg"], ["platinum.ogg"]]);
	});

	it("plays one request once", () => {
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<Dispatcher />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		act(() =>
			dispatchRef({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }),
		);
		expect(plays()).toEqual(["ClassicyBeep"]);
		act(() => dispatchRef({ type: "ClassicyAlertSound" }));
		// The alert the remote pack lacks plays once, on the stand-in.
		expect(plays()).toEqual(["ClassicyBeep", "ClassicyAlertQuack"]);
		act(() =>
			dispatchRef({ type: "ClassicySoundPlayError", sound: "ClassicyBeep" }),
		);
		// Two players: compare as a multiset.
		expect(plays().sort()).toEqual([
			"ClassicyAlertQuack",
			"ClassicyBeep",
			"ClassicyBeep",
		]);
	});

	it("plays a sound a child asks for on mount, once the players exist", () => {
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<PlayOnMount type="ClassicySoundPlay" sound="ClassicyBeep" />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		// StrictMode runs the child's mount effect twice; its ref keeps to one
		// dispatch, which waits for the players and then plays once.
		expect(plays()).toEqual(["ClassicyBeep"]);
	});

	it("unloads its players when it really unmounts, not at StrictMode's rehearsal", () => {
		vi.useFakeTimers();
		const { unmount } = render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<Dispatcher />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		act(() => {
			vi.runOnlyPendingTimers();
		});
		expect(instances.every((h) => h.unload.mock.calls.length === 0)).toBe(true);
		unmount();
		act(() => {
			vi.runOnlyPendingTimers();
		});
		expect(instances.every((h) => h.unload.mock.calls.length === 1)).toBe(true);
	});
});
