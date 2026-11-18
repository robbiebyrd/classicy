import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	classicyPackAlerts,
	classicyPackDefaultAlert,
	resolveClassicyAlertSound,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import {
	type ClassicySoundActionTypes,
	type ClassicySoundState,
	ClassicySoundStateEventReducer,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";
import {
	type ClassicySoundPack,
	classicySoundPackMissingSprites,
	getClassicySoundPack,
	registerClassicySoundPack,
	resetClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

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

const sprite = (...ids: string[]) =>
	Object.fromEntries(ids.map((id) => [id, [0, 100] as [number, number]]));

const platinum: ClassicySoundPack = {
	id: "platinum",
	name: "Platinum",
	src: ["p.mp3"],
	sprite: sprite("ClassicyAlertQuack", "ClassicyAlertSosumi"),
	alerts: [
		{ value: "ClassicyAlertQuack", label: "Quack" },
		{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	],
	defaultAlert: "ClassicyAlertSosumi",
};
const system7: ClassicySoundPack = {
	id: "system-7",
	name: "System 7",
	src: ["s.mp3"],
	sprite: sprite(
		"ClassicyAlertSimpleBeep",
		"ClassicyAlertDroplet",
		"ClassicyAlertQuack",
	),
	alerts: [
		{ value: "ClassicyAlertSimpleBeep", label: "Simple Beep" },
		{ value: "ClassicyAlertDroplet", label: "Droplet" },
		{ value: "ClassicyAlertQuack", label: "Quack" },
	],
	defaultAlert: "ClassicyAlertSimpleBeep",
};

beforeEach(() => {
	resetClassicySoundPacks();
	registerClassicySoundPack(platinum);
	registerClassicySoundPack(system7);
});

describe("pack alerts", () => {
	it("lists the pack's own alerts in order", () => {
		expect(
			classicyPackAlerts(getClassicySoundPack("system-7")).map((a) => a.label),
		).toEqual(["Simple Beep", "Droplet", "Quack"]);
		expect(classicyPackAlerts(getClassicySoundPack("platinum"))).toHaveLength(
			2,
		);
	});

	it("keeps the stored choice when the pack offers it", () => {
		expect(
			resolveClassicyAlertSound(
				getClassicySoundPack("system-7"),
				"ClassicyAlertQuack",
			),
		).toBe("ClassicyAlertQuack");
	});

	it("stands the pack default in for a stored choice the pack lacks", () => {
		expect(
			resolveClassicyAlertSound(
				getClassicySoundPack("system-7"),
				"ClassicyAlertSosumi",
			),
		).toBe("ClassicyAlertSimpleBeep");
		expect(
			resolveClassicyAlertSound(getClassicySoundPack("system-7"), undefined),
		).toBe("ClassicyAlertSimpleBeep");
		expect(
			resolveClassicyAlertSound(getClassicySoundPack("platinum"), "nope"),
		).toBe("ClassicyAlertSosumi");
	});

	it("falls back to the first alert when the default is not an alert", () => {
		const pack = { ...system7, defaultAlert: "ClassicyAlertGone" };
		expect(classicyPackDefaultAlert(pack)).toBe("ClassicyAlertSimpleBeep");
	});

	it("an empty alerts list means none, and nothing resolves", () => {
		const silent = { ...system7, id: "quiet", alerts: [] };
		expect(classicyPackAlerts(silent)).toEqual([]);
		expect(
			resolveClassicyAlertSound(silent, "ClassicyAlertQuack"),
		).toBeUndefined();
	});

	it("a pack that declares no alerts takes the default pack's", () => {
		const bare: ClassicySoundPack = {
			id: "bare",
			name: "Bare",
			src: ["b.mp3"],
			sprite: sprite("x"),
		};
		expect(classicyPackAlerts(bare)).toEqual(platinum.alerts);
		expect(resolveClassicyAlertSound(bare, undefined)).toBe(
			"ClassicyAlertSosumi",
		);
	});

	it("with no pack known, keeps the stored choice or Platinum's default", () => {
		expect(resolveClassicyAlertSound(undefined, "ClassicyAlertQuack")).toBe(
			"ClassicyAlertQuack",
		);
		expect(resolveClassicyAlertSound(undefined, undefined)).toBe(
			"ClassicyAlertSosumi",
		);
	});

	it("does not require ClassicyAlert* sprites of a pack that declares alerts, but each alert it declares", () => {
		const missing = classicySoundPackMissingSprites(system7);
		expect(missing).not.toContain("ClassicyAlertBonk");
		expect(missing).toContain("ClassicyBeep");
		expect(
			classicySoundPackMissingSprites({
				...system7,
				alerts: [{ value: "ClassicyAlertGhost", label: "Ghost" }],
			}),
		).toContain("ClassicyAlertGhost");
	});
});

const stateFor = (packId: string, alertSound?: string): ClassicySoundState => {
	const pack = getClassicySoundPack(packId);
	return {
		soundPlayer: new MockHowl() as never,
		packId,
		sprites: new Set(Object.keys(pack?.sprite ?? {})),
		fallbackPlayer: null,
		disabled: [],
		labels: [],
		alertSound,
	};
};
const alertAction = (type: string) => ({
	type: type as ClassicySoundActionTypes,
});

describe("alerts play from the active pack", () => {
	it("plays the stored alert when the pack has it", () => {
		const ss = stateFor("system-7", "ClassicyAlertDroplet");
		ClassicySoundStateEventReducer(ss, alertAction("ClassicyAlertSound"));
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertDroplet");
	});

	it("plays the pack default when it lacks the stored alert, leaving the stored value", () => {
		const ss = stateFor("system-7", "ClassicyAlertSosumi");
		const next = ClassicySoundStateEventReducer(
			ss,
			alertAction("ClassicySoundPlayError"),
		);
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith(
			"ClassicyAlertSimpleBeep",
		);
		expect(next.alertSound).toBe("ClassicyAlertSosumi");
	});

	it("switching back to the pack that has the stored alert plays it again", () => {
		const ss = stateFor("platinum", "ClassicyAlertSosumi");
		ClassicySoundStateEventReducer(ss, alertAction("ClassicyAlertSound"));
		expect(ss.soundPlayer?.play).toHaveBeenCalledWith("ClassicyAlertSosumi");
	});

	it("plays nothing for a pack with no alerts", () => {
		registerClassicySoundPack({ ...system7, id: "quiet", alerts: [] });
		const ss = stateFor("quiet", "ClassicyAlertQuack");
		expect(() =>
			ClassicySoundStateEventReducer(ss, alertAction("ClassicyAlertSound")),
		).not.toThrow();
		expect(ss.soundPlayer?.play).not.toHaveBeenCalled();
	});
});
