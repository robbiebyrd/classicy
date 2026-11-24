import type { Howl } from "howler";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicySoundActionTypes,
	type ClassicySoundState,
	classicySoundStateReducer,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Story 0225-ci7: the reducer ClassicySoundManagerProvider uses is pure
// (React calls a reducer twice in StrictMode), so it plays and builds
// nothing; the provider builds the players and runs the queued commands.
// The exported ClassicySoundStateEventReducer keeps its old behavior on top
// of it (ClassicySoundStateEventReducer.test.ts).

const { howlSources } = vi.hoisted(() => ({ howlSources: [] as string[][] }));
vi.mock("howler", () => ({
	Howl: class {
		constructor(opts?: { src?: string[] }) {
			howlSources.push(opts?.src ?? []);
		}
	},
}));

beforeEach(() => {
	howlSources.length = 0;
	resetClassicySoundPacks();
	registerClassicySoundPack({
		id: CLASSICY_DEFAULT_SOUND_PACK_ID,
		name: "Platinum",
		src: ["platinum.ogg"],
		sprite: { ClassicyBeep: [0, 100] },
	});
});

const player = () =>
	({
		play: vi.fn(),
		stop: vi.fn(),
		volume: vi.fn(),
		unload: vi.fn(),
		playing: vi.fn().mockReturnValue(false),
	}) as unknown as Howl;

const state = (over: Partial<ClassicySoundState> = {}): ClassicySoundState => ({
	soundPlayer: player(),
	packId: CLASSICY_DEFAULT_SOUND_PACK_ID,
	sprites: new Set(["ClassicyBeep"]),
	fallbackPlayer: null,
	disabled: [],
	labels: [],
	volume: 100,
	...over,
});

const commandTypes = [
	"ClassicySoundStop",
	"ClassicySoundPlay",
	"ClassicySoundPlayInterrupt",
	"ClassicySoundPlayError",
	"ClassicyAlertSound",
];

describe("classicySoundStateReducer", () => {
	it("queues plays and stops with the state they are judged by, playing nothing", () => {
		const ss = state({ alertVolume: 40, alertSound: "ClassicyBeep" });
		let next = ss;
		for (const type of commandTypes)
			next = classicySoundStateReducer(next, {
				type: type as ClassicySoundActionTypes,
				sound: "ClassicyBeep",
			});
		const p = ss.soundPlayer as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		expect(p.play).not.toHaveBeenCalled();
		expect(p.stop).not.toHaveBeenCalled();
		expect(p.volume).not.toHaveBeenCalled();
		expect(next.commands?.map((c) => [c.id, c.action.type])).toEqual(
			commandTypes.map((type, i) => [i + 1, type]),
		);
		expect(next.commands?.[0].policy).toEqual({
			disabled: [],
			alertSound: "ClassicyBeep",
			alertVolume: 40,
			volume: 100,
		});
		expect(ss.commands).toBeUndefined();
	});

	// Review S3: a command keeps the mute it was queued under.
	it("snapshots the mute: a play queued before a mute keeps the unmuted state", () => {
		let next = classicySoundStateReducer(state(), {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		});
		next = classicySoundStateReducer(next, {
			type: "ClassicySoundDisable" as ClassicySoundActionTypes,
			disabled: ["*"],
		});
		expect(next.disabled).toEqual(["*"]);
		expect(next.commands?.[0].policy.disabled).toEqual([]);
	});

	it("gives the same result for the same input, as StrictMode's second call needs", () => {
		const ss = state({ commands: [], nextCommandId: 7 });
		const action = {
			type: "ClassicySoundPlay" as ClassicySoundActionTypes,
			sound: "ClassicyBeep",
		};
		expect(classicySoundStateReducer(ss, action)).toEqual(
			classicySoundStateReducer(ss, action),
		);
	});

	it("drops the commands the provider ran", () => {
		let next = state();
		for (let i = 0; i < 3; i++)
			next = classicySoundStateReducer(next, {
				type: "ClassicySoundPlay" as ClassicySoundActionTypes,
				sound: "ClassicyBeep",
			});
		next = classicySoundStateReducer(next, {
			type: "ClassicySoundCommandsRun" as ClassicySoundActionTypes,
			through: 2,
		});
		expect(next.commands?.map((c) => c.id)).toEqual([3]);
		expect(
			classicySoundStateReducer(next, {
				type: "ClassicySoundCommandsRun" as ClassicySoundActionTypes,
				through: 2,
			}),
		).toBe(next);
	});

	it("builds no player and unloads none when a pack loads", () => {
		const previous = player();
		const next = classicySoundStateReducer(state({ soundPlayer: previous }), {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
			pack: {
				id: "remote",
				name: "Remote",
				src: ["remote.ogg"],
				sprite: { ClassicyBeep: [0, 100] },
			},
		});
		expect(howlSources).toEqual([]);
		expect(previous.unload).not.toHaveBeenCalled();
		expect(next.packId).toBe("remote");
		expect(next.fallbackPackId).toBe(CLASSICY_DEFAULT_SOUND_PACK_ID);
	});

	it("marks the players set for the state's pack, by the provider or ClassicySoundSet", () => {
		const host = player();
		const set = classicySoundStateReducer(state({ packId: "x" }), {
			type: "ClassicySoundSet" as ClassicySoundActionTypes,
			soundPlayer: host,
		});
		expect(set.soundPlayer).toBe(host);
		expect(set.playersPackId).toBe("x");
		const built = classicySoundStateReducer(state({ packId: "y" }), {
			type: "ClassicySoundSetPlayers" as ClassicySoundActionTypes,
			soundPlayer: host,
			fallbackPlayer: null,
		});
		expect(built.playersPackId).toBe("y");
	});

	// Re-review 2, N1: the provider's players for the pack leave a host's
	// own player in place; a pack load ends that.
	it("keeps a host's player through the provider's players for its pack", () => {
		const host = player();
		const built = player();
		const set = classicySoundStateReducer(state({ packId: "x" }), {
			type: "ClassicySoundSet" as ClassicySoundActionTypes,
			soundPlayer: host,
		});
		const after = classicySoundStateReducer(set, {
			type: "ClassicySoundSetPlayers" as ClassicySoundActionTypes,
			soundPlayer: built,
			fallbackPlayer: null,
		});
		expect(after.soundPlayer).toBe(host);
		const loaded = classicySoundStateReducer(after, {
			type: "ClassicySoundLoad" as ClassicySoundActionTypes,
			pack: {
				id: "remote",
				name: "Remote",
				src: ["remote.ogg"],
				sprite: { ClassicyBeep: [0, 100] },
			},
		});
		const replaced = classicySoundStateReducer(loaded, {
			type: "ClassicySoundSetPlayers" as ClassicySoundActionTypes,
			soundPlayer: built,
			fallbackPlayer: null,
		});
		expect(replaced.soundPlayer).toBe(built);
	});

	// Re-review 3, N2: the host's pack is forgotten once a load moves on,
	// so coming back to that pack takes the provider's player for it.
	it("forgets the host's pack after a load, so A, B, A takes A's player", () => {
		const host = player();
		const remote = player();
		const platinum = player();
		const pack = (id: string) => ({
			id,
			name: id,
			src: [`${id}.ogg`],
			sprite: { ClassicyBeep: [0, 100] as [number, number] },
		});
		const load = (ss: ClassicySoundState, id: string) =>
			classicySoundStateReducer(ss, {
				type: "ClassicySoundLoad" as ClassicySoundActionTypes,
				pack: pack(id),
			});
		const setPlayers = (ss: ClassicySoundState, soundPlayer: Howl) =>
			classicySoundStateReducer(ss, {
				type: "ClassicySoundSetPlayers" as ClassicySoundActionTypes,
				soundPlayer,
				fallbackPlayer: null,
			});
		let ss = classicySoundStateReducer(state({ packId: "platinum" }), {
			type: "ClassicySoundSet" as ClassicySoundActionTypes,
			soundPlayer: host,
		});
		ss = setPlayers(load(ss, "remote"), remote);
		expect(ss.soundPlayer).toBe(remote);
		expect(ss.hostPlayerPackId).toBeUndefined();
		ss = setPlayers(load(ss, "platinum"), platinum);
		expect(ss.soundPlayer).toBe(platinum);
	});
});
