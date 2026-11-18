import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assetSourceFile } from "@/__tests__/assetSourceFile";
import {
	classicyPackAlerts,
	classicyPackDefaultAlert,
	resolveClassicyAlertSound,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { system7SoundPack } from "./system7";
import system7Json from "./system7/system7.json";

// System 7.5's alert sounds (plan 0018-dbd §4.2): the six the Sound control
// panel lists, Simple Beep the default, exported from the System file's
// `snd ` resources by bin/export-assets.mjs and built into a sprite sheet by
// bin/make_audio_sprites.sh.

const SIX = [
	{ value: "ClassicyAlertDroplet", label: "Droplet" },
	{ value: "ClassicyAlertIndigo", label: "Indigo" },
	{ value: "ClassicyAlertQuack", label: "Quack" },
	{ value: "ClassicyAlertSimpleBeep", label: "Simple Beep" },
	{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	{ value: "ClassicyAlertWildEep", label: "Wild Eep" },
];

const pkg = path.resolve(import.meta.dirname, "../../..");
const sprites = path.join(pkg, "src/assets/sounds/system7/sprites");

describe("System 7's sound pack", () => {
	it("declares the Sound control panel's six alerts, Simple Beep the default", () => {
		expect(system7SoundPack.alerts).toEqual(SIX);
		expect(system7SoundPack.defaultAlert).toBe("ClassicyAlertSimpleBeep");
		expect(classicyPackAlerts(system7SoundPack)).toEqual(SIX);
		expect(classicyPackDefaultAlert(system7SoundPack)).toBe(
			"ClassicyAlertSimpleBeep",
		);
	});

	it("carries a sprite for each alert and the beep, and nothing else", () => {
		expect(Object.keys(system7SoundPack.sprite).sort()).toEqual(
			[...SIX.map((a) => a.value), "ClassicyBeep"].sort(),
		);
		for (const [start, duration, loop] of Object.values(
			system7SoundPack.sprite,
		)) {
			expect(start).toBeGreaterThanOrEqual(0);
			expect(duration).toBeGreaterThan(0);
			expect(loop).toBeFalsy();
		}
		// The beep is Simple Beep again.
		expect(system7SoundPack.sprite.ClassicyBeep[1]).toBe(
			system7SoundPack.sprite.ClassicyAlertSimpleBeep[1],
		);
	});

	it("builds its sheet from one WAV per sprite, the beep a copy of Simple Beep", () => {
		for (const id of Object.keys(system7SoundPack.sprite))
			expect(
				readFileSync(path.join(sprites, `${id}.wav`)).toString("latin1", 0, 4),
				id,
			).toBe("RIFF");
		expect(
			readFileSync(path.join(sprites, "ClassicyBeep.wav")).equals(
				readFileSync(path.join(sprites, "ClassicyAlertSimpleBeep.wav")),
			),
		).toBe(true);
	});

	it("loads its four sprite files from the package's src/assets/sounds/system7", () => {
		expect(
			system7SoundPack.src.map((src) => assetSourceFile(src, pkg)),
		).toEqual(
			["ogg", "m4a", "mp3", "ac3"].map((ext) =>
				path.join(pkg, "src/assets/sounds/system7", `system7.${ext}`),
			),
		);
		expect(system7Json.src).toEqual([
			"./system7.ogg",
			"./system7.m4a",
			"./system7.mp3",
			"./system7.ac3",
		]);
	});

	it("plays Simple Beep for a stored alert it lacks", () => {
		expect(
			resolveClassicyAlertSound(system7SoundPack, "ClassicyAlertBonk"),
		).toBe("ClassicyAlertSimpleBeep");
		expect(
			resolveClassicyAlertSound(system7SoundPack, "ClassicyAlertDroplet"),
		).toBe("ClassicyAlertDroplet");
	});
});

describe("System 7's sound pack src consistency check", () => {
	const loadSystem7 = async (src: string[]) => {
		vi.resetModules();
		const log = vi.fn();
		vi.doMock("@/SystemFolder/SystemResources/Log/ClassicyLog", () => ({
			classicyLog: log,
		}));
		vi.doMock("./system7/system7.json", () => ({
			default: { ...system7Json, src },
		}));
		await import("./system7");
		return log;
	};

	afterEach(() => {
		vi.doUnmock("@/SystemFolder/SystemResources/Log/ClassicyLog");
		vi.doUnmock("./system7/system7.json");
		vi.resetModules();
	});

	it("logs an error when the JSON names a file that is not bundled", async () => {
		const log = await loadSystem7([
			"./system7.ogg",
			"./system7.m4a",
			"./system7.mp3",
			"./other.ac3",
		]);
		expect(log).toHaveBeenCalledWith(
			"error",
			"ClassicySoundPacks",
			expect.stringContaining("system7.json src does not match"),
		);
	});

	it("stays silent for the committed JSON", async () => {
		const log = await loadSystem7(system7Json.src);
		expect(log).not.toHaveBeenCalled();
	});
});
