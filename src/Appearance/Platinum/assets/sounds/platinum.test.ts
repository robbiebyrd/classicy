import platinumJson from "@snd/platinum/platinum.json";
import { describe, expect, it } from "vitest";
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
