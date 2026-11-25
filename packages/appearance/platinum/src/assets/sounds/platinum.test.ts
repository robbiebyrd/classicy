import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assetSourceFile } from "@/__tests__/assetSourceFile";
import {
	CLASSICY_OPTIONAL_SOUND_SPRITE_IDS,
	CLASSICY_SOUND_SPRITE_IDS,
	classicySoundPackMissingSprites,
	getClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { platinumSoundPack } from "./platinum";
import platinumJson from "./platinum/platinum.json";

const PACK_JSON = "./platinum/platinum.json";

describe("platinum sound pack", () => {
	it("registers itself under id platinum on import", () => {
		expect(getClassicySoundPack("platinum")).toEqual(platinumSoundPack);
		expect(platinumSoundPack.name).toBe("Platinum");
	});

	it("carries every contract sprite and nothing else", () => {
		expect(Object.keys(platinumSoundPack.sprite).sort()).toEqual(
			[...CLASSICY_SOUND_SPRITE_IDS].sort(),
		);
		expect(classicySoundPackMissingSprites(platinumSoundPack)).toEqual([]);
	});

	// The optional sprites (Windows 98's Empty Trash sound) and the alert
	// type sounds are another pack's: Platinum's defines neither, so it plays
	// nothing when the Trash is emptied, stands in for no other pack's, and
	// plays its alert for every alert box.
	it("defines no optional sprite and no alert type sound", () => {
		for (const id of CLASSICY_OPTIONAL_SOUND_SPRITE_IDS)
			expect(Object.keys(platinumSoundPack.sprite)).not.toContain(id);
		expect(platinumSoundPack.alertTypeSounds).toBeUndefined();
	});

	it("declares its seven alerts with Sosumi as the default", () => {
		expect(platinumSoundPack.alerts?.map((a) => a.value)).toEqual([
			"ClassicyAlertBonk",
			"ClassicyAlertGrowl",
			"ClassicyAlertIndigo",
			"ClassicyAlertQuack",
			"ClassicyAlertSosumi",
			"ClassicyAlertTabitha",
			"ClassicyAlertWildEep",
		]);
		expect(platinumSoundPack.defaultAlert).toBe("ClassicyAlertSosumi");
		for (const a of platinumSoundPack.alerts ?? [])
			expect(platinumSoundPack.sprite).toHaveProperty(a.value);
	});

	it("has two src URLs whose basenames match the JSON", () => {
		expect(platinumSoundPack.src.map((u) => u.split("/").pop())).toEqual([
			"platinum.ogg",
			"platinum.m4a",
		]);
	});

	it("loads its two sprite files from the package's own src/assets/sounds/platinum", () => {
		// Moved out of the core's assets/sounds (plan 0015-kxa §3.3), beside
		// the JSON bin/make_audio_sprites.sh writes with them.
		const pkg = path.resolve(import.meta.dirname, "../../..");
		expect(
			platinumSoundPack.src.map((src) => assetSourceFile(src, pkg)),
		).toEqual(
			["ogg", "m4a"].map((ext) =>
				path.join(pkg, "src/assets/sounds/platinum", `platinum.${ext}`),
			),
		);
	});

	it("keeps the four loop sprites flagged", () => {
		for (const id of [
			"ClassicyWindowMoveIdle",
			"ClassicyWindowMoveMoving",
			"ClassicyWindowResizeIdle",
			"ClassicyWindowResizeResizing",
		]) {
			expect(platinumSoundPack.sprite[id][2]).toBe(true);
		}
	});

	it("the committed pack JSON carries id, name and relative src", () => {
		expect(platinumJson.id).toBe("platinum");
		expect(platinumJson.name).toBe("Platinum");
		expect(platinumJson.src).toEqual(["./platinum.ogg", "./platinum.m4a"]);
	});
});

describe("platinum sound pack src consistency check", () => {
	const loadPlatinum = async (src: string[]) => {
		vi.resetModules();
		const log = vi.fn();
		vi.doMock("@/SystemFolder/SystemResources/Log/ClassicyLog", () => ({
			classicyLog: log,
		}));
		vi.doMock(PACK_JSON, () => ({
			default: { ...platinumJson, src },
		}));
		await import("./platinum");
		return log;
	};

	afterEach(() => {
		vi.doUnmock("@/SystemFolder/SystemResources/Log/ClassicyLog");
		vi.doUnmock(PACK_JSON);
		vi.resetModules();
	});

	it("logs an error when the JSON names a file that is not bundled", async () => {
		const log = await loadPlatinum(["./platinum.ogg", "./other.m4a"]);
		expect(log).toHaveBeenCalledWith(
			"error",
			"ClassicySoundPacks",
			expect.stringContaining("platinum.json src does not match"),
		);
	});

	it("stays silent for the committed JSON", async () => {
		const log = await loadPlatinum(platinumJson.src);
		expect(log).not.toHaveBeenCalled();
	});
});
