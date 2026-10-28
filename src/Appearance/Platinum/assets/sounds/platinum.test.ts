import platinumJson from "@snd/platinum/platinum.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import { platinumSoundPack } from "@/Appearance/Platinum/assets/sounds/platinum";
import {
	CLASSICY_SOUND_SPRITE_IDS,
	classicySoundPackMissingSprites,
	getClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

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

	it("has four src URLs whose basenames match the JSON", () => {
		expect(platinumSoundPack.src.map((u) => u.split("/").pop())).toEqual([
			"platinum.ogg",
			"platinum.m4a",
			"platinum.mp3",
			"platinum.ac3",
		]);
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
		expect(platinumJson.src).toEqual([
			"./platinum.ogg",
			"./platinum.m4a",
			"./platinum.mp3",
			"./platinum.ac3",
		]);
	});
});

describe("platinum sound pack src consistency check", () => {
	const loadPlatinum = async (src: string[]) => {
		vi.resetModules();
		const log = vi.fn();
		vi.doMock("@/SystemFolder/SystemResources/Log/ClassicyLog", () => ({
			classicyLog: log,
		}));
		vi.doMock("@snd/platinum/platinum.json", () => ({
			default: { ...platinumJson, src },
		}));
		await import("@/Appearance/Platinum/assets/sounds/platinum");
		return log;
	};

	afterEach(() => {
		vi.doUnmock("@/SystemFolder/SystemResources/Log/ClassicyLog");
		vi.doUnmock("@snd/platinum/platinum.json");
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("logs an error when the JSON names a file that is not bundled", async () => {
		const log = await loadPlatinum([
			"./platinum.ogg",
			"./platinum.m4a",
			"./platinum.mp3",
			"./other.ac3",
		]);
		expect(log).toHaveBeenCalledWith(
			"error",
			"ClassicySoundPacks",
			expect.stringContaining("platinum.json src does not match"),
		);
	});

	it("stays silent when the bundler inlines the audio as data: URLs", async () => {
		class InlinedURL {
			href = "data:audio/ogg;base64,T2dnUwACAAAAAAAAAAA=";
		}
		vi.stubGlobal("URL", InlinedURL);
		const log = await loadPlatinum(platinumJson.src);
		expect(log).not.toHaveBeenCalled();
	});
});
