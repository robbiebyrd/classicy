import { act, StrictMode, useEffect, useReducer, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
	ClassicySoundStateEventReducer,
	initialPlayer,
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { seedSoundState } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import {
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Story 0225-ci7, fix round 2: the re-review's probes, kept as regression
// tests. Every Howler call is logged in order, per player (`<src> <call>`).

const { log } = vi.hoisted(() => ({ log: [] as string[] }));
vi.mock("howler", () => ({
	Howl: class {
		src: string;
		play = vi.fn((s: string) => {
			log.push(`${this.src} play ${s}`);
			return 7;
		});
		stop = vi.fn(() => {
			log.push(`${this.src} stop`);
		});
		volume = vi.fn((...a: unknown[]) => {
			log.push(`${this.src} volume ${a.join(",")}`);
		});
		unload = vi.fn(() => {
			log.push(`${this.src} unload`);
		});
		playing = vi.fn().mockReturnValue(false);
		constructor(opts: { src: string[] }) {
			this.src = opts.src[0];
			log.push(`new ${this.src}`);
		}
	},
}));

const { appearance } = vi.hoisted(() => ({
	appearance: {
		alertSound: "ClassicyAlertQuack",
		alertVolume: 50,
		activeTheme: { sound: { pack: "platinum", disabled: [] as string[] } },
	},
}));
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({ System: { Manager: { Appearance: appearance } } });
		return {
			useAppManager: Object.assign(
				(sel: (s: unknown) => unknown) => sel(state()),
				{ getState: state },
			),
		};
	},
);

const sprites = {
	ClassicyBeep: [0, 100] as [number, number],
	ClassicyAlertQuack: [100, 100] as [number, number],
};
const alerts = [{ value: "ClassicyAlertQuack", label: "Quack" }];

beforeEach(() => {
	log.length = 0;
	appearance.activeTheme.sound.pack = "platinum";
	appearance.alertVolume = 50;
	resetClassicySoundPacks();
	registerClassicySoundPack({
		id: "platinum",
		name: "Platinum",
		src: ["platinum.ogg"],
		sprite: sprites,
		alerts,
	});
	registerClassicySoundPack({
		id: "remote",
		name: "Remote",
		src: ["remote.ogg"],
		sprite: sprites,
		alerts,
	});
});

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

let dispatch: ReturnType<typeof useSoundDispatch> = () => undefined;
const Dispatcher = () => {
	dispatch = useSoundDispatch();
	return null;
};

/** The calls on `src` from its first play on, in order. */
const afterPlay = (src: string) => {
	const own = log.filter((l) => l.startsWith(`${src} `));
	return own.slice(own.findIndex((l) => l.includes(" play ")));
};

describe("review S2: an alert keeps system gain × alert volume", () => {
	it("when a child plays it from its mount effect, in the provider's first commit", () => {
		render(
			<ClassicySoundManagerProvider>
				<PlayOnMount type="ClassicyAlertSound" />
			</ClassicySoundManagerProvider>,
		);
		// The whole-player gain is set before the alert, never after it.
		expect(afterPlay("platinum.ogg")).toEqual([
			"platinum.ogg play ClassicyAlertQuack",
			"platinum.ogg volume 0.5,7",
		]);
	});

	it("under StrictMode too, playing once", () => {
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<PlayOnMount type="ClassicyAlertSound" />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		expect(log.filter((l) => l.startsWith("new "))).toEqual([
			"new platinum.ogg",
		]);
		expect(afterPlay("platinum.ogg")).toEqual([
			"platinum.ogg play ClassicyAlertQuack",
			"platinum.ogg volume 0.5,7",
		]);
	});

	it("when a pack switch lands in the same batch", () => {
		const ui = () => (
			<ClassicySoundManagerProvider>
				<Dispatcher />
			</ClassicySoundManagerProvider>
		);
		const r = render(ui());
		act(() => dispatch({ type: "ClassicyVolumeSet", volume: 40 }));
		log.length = 0;
		appearance.activeTheme.sound.pack = "remote";
		act(() => {
			r.rerender(ui());
			dispatch({ type: "ClassicyAlertSound" });
		});
		// The alert played (on the pack drawn when it was queued) at gain ×
		// alert volume, and nothing set that player's whole gain after it:
		// the new pack's player got its gain, the one already at it none.
		const played = log.findIndex((l) => l.endsWith(" play ClassicyAlertQuack"));
		expect(played).toBeGreaterThanOrEqual(0);
		const src = log[played].split(" ")[0];
		expect(log[played + 1]).toBe(`${src} volume 0.2,7`);
		expect(
			log
				.slice(played + 1)
				.filter((l) => l.startsWith(`${src} volume`) && !l.includes(",")),
		).toEqual([]);
		expect(log).toContain("remote.ogg volume 0.4");
	});
});

describe("review S3: a command is judged by the state it was queued under", () => {
	it("a play followed by a mute in one batch plays", () => {
		render(
			<ClassicySoundManagerProvider>
				<Dispatcher />
			</ClassicySoundManagerProvider>,
		);
		log.length = 0;
		act(() => {
			dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" });
			dispatch({ type: "ClassicySoundDisable", disabled: ["*"] });
		});
		expect(log).toContain("platinum.ogg play ClassicyBeep");
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(
			log.filter((l) => l === "platinum.ogg play ClassicyBeep"),
		).toHaveLength(1);
	});
});

describe("review S1: ClassicySoundSet takes effect under Classicy's provider", () => {
	it("plays on the host's player", () => {
		render(
			<ClassicySoundManagerProvider>
				<Dispatcher />
			</ClassicySoundManagerProvider>,
		);
		log.length = 0;
		const host = {
			play: vi.fn(() => 1),
			stop: vi.fn(),
			volume: vi.fn(),
			playing: vi.fn(() => false),
			unload: vi.fn(),
		};
		act(() =>
			dispatch({ type: "ClassicySoundSet", soundPlayer: host as never }),
		);
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(host.play).toHaveBeenCalledTimes(1);
		expect(host.play).toHaveBeenCalledWith("ClassicyBeep");
		expect(log).not.toContain("platinum.ogg play ClassicyBeep");
	});

	const hostPlayer = () => ({
		play: vi.fn(() => 1),
		stop: vi.fn(),
		volume: vi.fn(),
		playing: vi.fn(() => false),
		unload: vi.fn(),
	});

	// Re-review 2, N1: a child's mount effect runs before the provider's
	// players are built; the provider's first ClassicySoundSetPlayers must
	// leave the host's player in place.
	const SetOnMount = ({
		player,
	}: {
		player: ReturnType<typeof hostPlayer>;
	}) => {
		const soundDispatch = useSoundDispatch();
		useEffect(() => {
			soundDispatch({ type: "ClassicySoundSet", soundPlayer: player as never });
		}, [soundDispatch, player]);
		return null;
	};

	it("keeps a player the host sets from a mount effect", () => {
		const host = hostPlayer();
		render(
			<ClassicySoundManagerProvider>
				<SetOnMount player={host} />
				<Dispatcher />
			</ClassicySoundManagerProvider>,
		);
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(host.play).toHaveBeenCalledTimes(1);
		expect(host.play).toHaveBeenCalledWith("ClassicyBeep");
		expect(log).not.toContain("platinum.ogg play ClassicyBeep");
	});

	it("keeps it under StrictMode too", () => {
		const host = hostPlayer();
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<SetOnMount player={host} />
					<Dispatcher />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(host.play).toHaveBeenCalledTimes(1);
		expect(log).not.toContain("platinum.ogg play ClassicyBeep");
	});

	it("gives way to the new pack's player when the pack changes", () => {
		const host = hostPlayer();
		const ui = () => (
			<ClassicySoundManagerProvider>
				<SetOnMount player={host} />
				<Dispatcher />
			</ClassicySoundManagerProvider>
		);
		const r = render(ui());
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(host.play).toHaveBeenCalledTimes(1);
		appearance.activeTheme.sound.pack = "remote";
		act(() => r.rerender(ui()));
		log.length = 0;
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		// A pack load replaces the host's player, as it always did.
		expect(host.play).toHaveBeenCalledTimes(1);
		expect(log).toContain("remote.ogg play ClassicyBeep");
	});

	// Re-review 3, N2: once a pack load has replaced the host's player,
	// going back to its pack plays on that pack's player, not on the pack
	// just left (whose Howl the provider has unloaded) nor on the host's.
	const backToFirstPack = (setHost: "mount" | "after mount") => {
		const host = hostPlayer();
		const ui = () => (
			<ClassicySoundManagerProvider>
				{setHost === "mount" && <SetOnMount player={host} />}
				<Dispatcher />
			</ClassicySoundManagerProvider>
		);
		const r = render(ui());
		if (setHost === "after mount")
			act(() =>
				dispatch({ type: "ClassicySoundSet", soundPlayer: host as never }),
			);
		appearance.activeTheme.sound.pack = "remote";
		act(() => r.rerender(ui()));
		appearance.activeTheme.sound.pack = "platinum";
		act(() => r.rerender(ui()));
		log.length = 0;
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(host.play).not.toHaveBeenCalled();
		expect(log).toContain("platinum.ogg play ClassicyBeep");
		expect(log).not.toContain("remote.ogg play ClassicyBeep");
	};

	it("plays on the first pack's player after A, B, A (host set on mount)", () =>
		backToFirstPack("mount"));

	it("plays on the first pack's player after A, B, A (host set after mount)", () =>
		backToFirstPack("after mount"));
});

// A provider of the host's own on the exported (deprecated) reducer, as a
// host could have built before the reducer was made pure.
const HostProvider = ({ children }: { children: React.ReactNode }) => {
	const [sound, soundDispatch] = useReducer(
		ClassicySoundStateEventReducer,
		initialPlayer,
		(base) => seedSoundState(base, "platinum", false),
	);
	return (
		<ClassicySoundManagerContext.Provider value={sound}>
			<ClassicySoundDispatchContext.Provider value={soundDispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		</ClassicySoundManagerContext.Provider>
	);
};

let hostSound: ReturnType<typeof useSound> | undefined;
const HostProbe = () => {
	dispatch = useSoundDispatch();
	hostSound = useSound();
	return null;
};

describe("review S1: a host provider on the exported reducer", () => {
	it("plays once per request and keeps no queue", () => {
		render(
			<HostProvider>
				<HostProbe />
			</HostProvider>,
		);
		expect(log).toEqual(["new platinum.ogg"]);
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		act(() => dispatch({ type: "ClassicySoundPlay", sound: "ClassicyBeep" }));
		expect(
			log.filter((l) => l === "platinum.ogg play ClassicyBeep"),
		).toHaveLength(2);
		expect(hostSound?.commands ?? []).toEqual([]);
	});
});

describe("unmount", () => {
	it("unloads the players after the tick, once really gone", () => {
		vi.useFakeTimers();
		try {
			const r = render(
				<ClassicySoundManagerProvider>
					<Dispatcher />
				</ClassicySoundManagerProvider>,
			);
			log.length = 0;
			r.unmount();
			vi.runAllTimers();
			expect(log).toEqual(["platinum.ogg unload"]);
		} finally {
			vi.useRealTimers();
		}
	});
});
