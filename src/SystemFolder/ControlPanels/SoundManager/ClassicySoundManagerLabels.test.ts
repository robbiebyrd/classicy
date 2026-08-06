import platinumJson from "@snd/platinum/platinum.json";
import { describe, expect, it } from "vitest";
import soundLabels from "./ClassicySoundManagerLabels.json";

// Guards the two invariants HyperCard's SoundField (and the Sound control
// panel) depend on: every real Howler sprite is reachable from a label, and
// every label actually points at a playable sprite. Drift in either
// direction is silent otherwise — an unlabeled sprite just never shows up in
// a picker, and a dead label renders an option that can never play.
describe("ClassicySoundManagerLabels <-> platinum.json sprite map", () => {
	const spriteIds = new Set(Object.keys(platinumJson.sprite));
	const labelIds = new Set(soundLabels.map((l) => l.id));

	it("has a label for every sprite in the Howler sprite map", () => {
		const unlabeled = [...spriteIds].filter((id) => !labelIds.has(id));
		expect(unlabeled).toEqual([]);
	});

	it("has no label pointing at a sprite that doesn't exist", () => {
		const dead = [...labelIds].filter((id) => !spriteIds.has(id));
		expect(dead).toEqual([]);
	});

	it("has no duplicate label ids", () => {
		expect(labelIds.size).toBe(soundLabels.length);
	});
});
