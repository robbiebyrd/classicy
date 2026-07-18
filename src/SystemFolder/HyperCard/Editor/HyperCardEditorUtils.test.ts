import { describe, expect, it } from "vitest";
import {
	applyEdit,
	BUILTIN_PART_DESCRIPTORS,
	type HCEditState,
	layerParts,
	MAX_UNDO,
	nextCardId,
	nextPartId,
	peekLayerParts,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

function makeStack(): HCStack {
	return {
		name: "Demo",
		backgrounds: [{ id: "bg1", parts: [{ id: "shared1", type: "label" }] }],
		cards: [
			{
				id: "c1",
				background: "bg1",
				parts: [{ id: "button1", type: "button", rect: [10, 10, 100, 24] }],
			},
			{ id: "c2" },
		],
	};
}

function makeEdit(stack: HCStack = makeStack()): HCEditState {
	return {
		draft: stack,
		currentCardId: "c1",
		layer: "card",
		tool: "pointer",
		undo: [],
		redo: [],
		dirty: false,
	};
}

describe("applyEdit", () => {
	it("replaces the draft immutably and records undo", () => {
		const edit = makeEdit();
		const before = edit.draft;
		applyEdit(edit, (d) => {
			d.cards[0].parts![0].rect = [50, 60, 100, 24];
		});
		expect(edit.draft).not.toBe(before);
		expect(before.cards[0].parts![0].rect).toEqual([10, 10, 100, 24]);
		expect(edit.draft.cards[0].parts![0].rect).toEqual([50, 60, 100, 24]);
		expect(edit.undo).toEqual([before]);
		expect(edit.dirty).toBe(true);
	});

	it("is a no-op (no undo entry, not dirty) when the mutator changes nothing", () => {
		const edit = makeEdit();
		applyEdit(edit, () => {});
		expect(edit.undo).toHaveLength(0);
		expect(edit.dirty).toBe(false);
	});

	it("clears redo on a new edit and caps undo at MAX_UNDO", () => {
		const edit = makeEdit();
		edit.redo = [makeStack()];
		for (let i = 0; i < MAX_UNDO + 5; i++) {
			applyEdit(edit, (d) => {
				d.cards[0].parts![0].rect = [i, i, 100, 24];
			});
		}
		expect(edit.redo).toHaveLength(0);
		expect(edit.undo).toHaveLength(MAX_UNDO);
	});
});

describe("layerParts", () => {
	it("returns card parts for the card layer, creating the array if missing", () => {
		const stack = makeStack();
		expect(layerParts(stack, "c1", "card")).toBe(stack.cards[0].parts);
		const created = layerParts(stack, "c2", "card");
		expect(created).toEqual([]);
		expect(stack.cards[1].parts).toBe(created);
	});

	it("returns background parts for the background layer, undefined when the card has none", () => {
		const stack = makeStack();
		expect(layerParts(stack, "c1", "background")).toBe(
			stack.backgrounds![0].parts,
		);
		expect(layerParts(stack, "c2", "background")).toBeUndefined();
		expect(layerParts(stack, "missing", "card")).toBeUndefined();
	});
});

describe("peekLayerParts", () => {
	it("reads without creating parts arrays — safe on frozen drafts", () => {
		const stack = makeStack();
		Object.freeze(stack.cards[1]);
		expect(peekLayerParts(stack, "c1", "card")).toBe(stack.cards[0].parts);
		expect(peekLayerParts(stack, "c2", "card")).toBeUndefined();
		expect(stack.cards[1].parts).toBeUndefined();
	});
});

describe("id generation", () => {
	it("derives the next free part id across cards and backgrounds", () => {
		const stack = makeStack();
		expect(nextPartId(stack, "button")).toBe("button2");
		expect(nextPartId(stack, "slider")).toBe("slider1");
	});

	it("derives the next free card id", () => {
		expect(nextCardId(makeStack())).toBe("card1");
		expect(
			nextCardId({ name: "x", cards: [{ id: "card1" }, { id: "card2" }] }),
		).toBe("card3");
	});
});

describe("BUILTIN_PART_DESCRIPTORS", () => {
	it("covers all ten built-in part types with positive default sizes", () => {
		expect(BUILTIN_PART_DESCRIPTORS.map((d) => d.type).sort()).toEqual(
			[
				"button",
				"checkbox",
				"field",
				"group",
				"image",
				"label",
				"popup",
				"progress",
				"radio",
				"slider",
			].sort(),
		);
		for (const d of BUILTIN_PART_DESCRIPTORS) {
			expect(d.defaultSize[0]).toBeGreaterThan(0);
			expect(d.defaultSize[1]).toBeGreaterThan(0);
		}
	});
});
