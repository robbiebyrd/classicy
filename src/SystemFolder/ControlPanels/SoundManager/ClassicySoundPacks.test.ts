import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logModule from "@/SystemFolder/SystemResources/Log/ClassicyLog";
// Platinum's committed sprite sheet JSON, in its package (plan 0015-kxa §3.3).
import platinumJson from "../../../../packages/appearance/platinum/src/assets/sounds/platinum/platinum.json";
import {
	CLASSICY_ALERT_SOUNDS,
	DEFAULT_ALERT_SOUND,
} from "./ClassicyAlertSounds";
import soundLabels from "./ClassicySoundManagerLabels.json";
import {
	CLASSICY_CONTRACT_ALERT_SPRITE_IDS,
	CLASSICY_OPTIONAL_SOUND_SPRITE_IDS,
	CLASSICY_OPTIONAL_SOUND_SPRITES,
	CLASSICY_SOUND_SPRITE_IDS,
	ClassicySoundPackSchema,
	classicySoundPackMissingSprites,
	getClassicySoundPack,
	isClassicyOptionalSoundSprite,
	listClassicySoundPacks,
	registerClassicySoundPack,
	resetClassicySoundPacks,
	subscribeClassicySoundPacks,
	useClassicySoundPacks,
} from "./ClassicySoundPacks";

const pack = (over = {}) => ({
	id: "remote",
	name: "Remote",
	src: [
		"https://cdn.example.com/remote.ogg",
		"https://cdn.example.com/remote.mp3",
	],
	sprite: { ClassicyBeep: [0, 100] as [number, number] },
	...over,
});

const contractIds = new Set<string>(CLASSICY_SOUND_SPRITE_IDS);

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory())
			return name === "__tests__" ? [] : sourceFiles(full);
		if (!/\.(ts|tsx)$/.test(name) || /\.(test|stories)\./.test(name)) return [];
		return [full];
	});

describe("ClassicySoundPacks", () => {
	beforeEach(resetClassicySoundPacks);

	it("registers a pack whose src are https URLs and lists it in order", () => {
		registerClassicySoundPack(pack());
		registerClassicySoundPack(pack({ id: "other", name: "Other" }));
		expect(listClassicySoundPacks().map((p) => p.id)).toEqual([
			"remote",
			"other",
		]);
		expect(getClassicySoundPack("remote")?.src[0]).toBe(
			"https://cdn.example.com/remote.ogg",
		);
	});

	it("re-registering an id replaces the pack and keeps its position", () => {
		registerClassicySoundPack(pack());
		registerClassicySoundPack(pack({ id: "other", name: "Other" }));
		registerClassicySoundPack(pack({ name: "Remote 2" }));
		expect(listClassicySoundPacks().map((p) => p.id)).toEqual([
			"remote",
			"other",
		]);
		expect(getClassicySoundPack("remote")?.name).toBe("Remote 2");
	});

	it("rejects an invalid pack with a warning and does not register it", () => {
		const spy = vi.spyOn(logModule, "classicyLog").mockImplementation(() => {});
		registerClassicySoundPack(pack({ id: "Bad Id" }) as never);
		expect(getClassicySoundPack("Bad Id")).toBeUndefined();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toBe("warn");
		expect(spy.mock.calls[0][1]).toBe("ClassicySoundPacks");
		registerClassicySoundPack(pack({ src: [] }) as never);
		expect(getClassicySoundPack("remote")).toBeUndefined();
		expect(listClassicySoundPacks()).toEqual([]);
		spy.mockRestore();
	});

	it("notifies subscribers once per registration and stops after unsubscribe", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicySoundPacks(listener);
		registerClassicySoundPack(pack());
		expect(listener).toHaveBeenCalledTimes(1);
		registerClassicySoundPack(pack({ id: "other", name: "Other" }));
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		registerClassicySoundPack(pack({ id: "third", name: "Third" }));
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("useClassicySoundPacks re-renders a component when a pack registers after mount", () => {
		const Probe = () =>
			createElement(
				"span",
				{ "data-testid": "ids" },
				useClassicySoundPacks()
					.map((p) => p.id)
					.join(","),
			);
		const { getByTestId } = render(createElement(Probe));
		expect(getByTestId("ids").textContent).toBe("");
		act(() => registerClassicySoundPack(pack()));
		expect(getByTestId("ids").textContent).toBe("remote");
	});

	it("CLASSICY_SOUND_SPRITE_IDS equals the Platinum sprite JSON key set", () => {
		expect([...CLASSICY_SOUND_SPRITE_IDS].sort()).toEqual(
			Object.keys(platinumJson.sprite).sort(),
		);
		expect(CLASSICY_SOUND_SPRITE_IDS).toHaveLength(41);
	});

	it("every label id and alert sound is a contract id", () => {
		for (const l of soundLabels) expect(contractIds.has(l.id)).toBe(true);
		expect(contractIds.has(DEFAULT_ALERT_SOUND)).toBe(true);
		for (const a of CLASSICY_ALERT_SOUNDS)
			expect(contractIds.has(a.value)).toBe(true);
	});

	it("every sound literal dispatched in src is a contract or optional id", () => {
		const found: string[] = [];
		// The core's src and Platinum's, in its workspace package (plan
		// 0015-kxa §3.1), whose hooks play the control sounds.
		for (const file of [
			...sourceFiles(path.resolve(__dirname, "../../..")),
			...sourceFiles(
				path.resolve(__dirname, "../../../../packages/appearance/platinum/src"),
			),
		]) {
			const text = readFileSync(file, "utf8");
			for (const m of text.matchAll(/sound:\s*["']([A-Za-z0-9_]+)["']/g))
				found.push(m[1]);
			// Appearance Package hooks play sprites through the sound bridge:
			// `playClassicyAppearanceSound("…")`, or a package hooks module's
			// `sound("…")` helper (Platinum's control sounds).
			const bridge =
				path.basename(file) === "hooks.ts"
					? /(?:\bsound|playClassicyAppearanceSound)\(\s*["']([A-Za-z0-9_]+)["']/g
					: /playClassicyAppearanceSound\(\s*["']([A-Za-z0-9_]+)["']/g;
			for (const m of text.matchAll(bridge)) found.push(m[1]);
		}
		expect(
			new Set(
				found.filter(
					(id) => !contractIds.has(id) && !isClassicyOptionalSoundSprite(id),
				),
			),
		).toEqual(new Set());
		// The optional ids are dispatched too (ClassicyDesktop's Empty Trash).
		for (const id of CLASSICY_OPTIONAL_SOUND_SPRITE_IDS)
			expect(found).toContain(id);
		expect(found.length).toBeGreaterThan(20);
	});

	it("classicySoundPackMissingSprites lists contract ids a pack lacks", () => {
		registerClassicySoundPack(pack());
		const missing = classicySoundPackMissingSprites(
			getClassicySoundPack("remote") as never,
		);
		expect(missing).toHaveLength(40);
		expect(missing).not.toContain("ClassicyBeep");
	});

	it("a pack JSON with relative src parses and a copy with https src validates identically", () => {
		const remote = {
			...platinumJson,
			src: platinumJson.src.map(
				(s) => `https://cdn.example.com/sounds/${s.split("/").pop()}`,
			),
		};
		const relative = ClassicySoundPackSchema.safeParse(platinumJson);
		const absolute = ClassicySoundPackSchema.safeParse(remote);
		expect(relative.success).toBe(true);
		expect(absolute.success).toBe(true);
		if (relative.success && absolute.success)
			expect(absolute.data.id).toBe(relative.data.id);
	});
});

// Sprites a pack may leave out (Windows 98's Empty Recycle Bin sound): never
// part of the contract, so no pack that lacks one is reported for it, and
// Platinum's pack, the fallback for the contract's ids, defines none.
describe("CLASSICY_OPTIONAL_SOUND_SPRITE_IDS", () => {
	it("are the optional sprites' ids, none of them a contract id", () => {
		expect(CLASSICY_OPTIONAL_SOUND_SPRITE_IDS).toEqual(["ClassicyTrashEmpty"]);
		expect(CLASSICY_OPTIONAL_SOUND_SPRITES.map((s) => s.id)).toEqual(
			CLASSICY_OPTIONAL_SOUND_SPRITE_IDS,
		);
		for (const id of CLASSICY_OPTIONAL_SOUND_SPRITE_IDS) {
			expect(contractIds.has(id)).toBe(false);
			expect(isClassicyOptionalSoundSprite(id)).toBe(true);
		}
		expect(isClassicyOptionalSoundSprite("ClassicyBeep")).toBe(false);
	});

	// Platinum's pack, the default pack, defines none, so it never stands in
	// for one (System 7's and Windows 98's packages pin their own packs).
	it("are in no stock label and no Platinum sprite", () => {
		for (const id of CLASSICY_OPTIONAL_SOUND_SPRITE_IDS) {
			expect(soundLabels.map((l) => l.id)).not.toContain(id);
			expect(Object.keys(platinumJson.sprite)).not.toContain(id);
		}
	});

	it("are never listed missing", () => {
		const missing = classicySoundPackMissingSprites(pack() as never);
		for (const id of CLASSICY_OPTIONAL_SOUND_SPRITE_IDS)
			expect(missing).not.toContain(id);
	});
});

describe("alertTypeSounds", () => {
	it("validates a sprite per alert type and strips other keys", () => {
		const parsed = ClassicySoundPackSchema.parse(
			pack({
				alertTypeSounds: { note: "ClassicyBeep", question: "ClassicyBeep" },
			}),
		);
		expect(parsed.alertTypeSounds).toEqual({ note: "ClassicyBeep" });
		expect(
			ClassicySoundPackSchema.safeParse(pack({ alertTypeSounds: { stop: "" } }))
				.success,
		).toBe(false);
		expect(
			ClassicySoundPackSchema.parse(pack()).alertTypeSounds,
		).toBeUndefined();
	});
});

describe("CLASSICY_CONTRACT_ALERT_SPRITE_IDS", () => {
	it("is a subset of the sprite contract", () => {
		const contract: readonly string[] = CLASSICY_SOUND_SPRITE_IDS;
		for (const id of CLASSICY_CONTRACT_ALERT_SPRITE_IDS)
			expect(contract).toContain(id);
		expect(CLASSICY_CONTRACT_ALERT_SPRITE_IDS).toHaveLength(7);
	});
});
