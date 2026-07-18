import { describe, expect, it } from "vitest";
import {
	getTargetHandlers,
	targetLabel,
	validateHandlers,
} from "@/SystemFolder/HyperCard/Editor/HyperCardScriptModel";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

const stack: HCStack = {
	name: "Demo",
	backgrounds: [{ id: "bg1", script: { onOpenBackground: [{ do: "beep" }] } }],
	cards: [
		{
			id: "c1",
			background: "bg1",
			parts: [
				{
					id: "b1",
					type: "button",
					script: { onMouseUp: [{ do: "go", to: "next" }] },
				},
			],
		},
		{ id: "c2" },
	],
	stackScript: { onOpenStack: [{ do: "beep" }] },
};

const at = { currentCardId: "c1", layer: "card" as const };

describe("getTargetHandlers", () => {
	it("resolves each target kind", () => {
		expect(
			getTargetHandlers(stack, at, { kind: "part", partId: "b1" }),
		).toEqual({ onMouseUp: [{ do: "go", to: "next" }] });
		expect(getTargetHandlers(stack, at, { kind: "card" })).toEqual({});
		expect(getTargetHandlers(stack, at, { kind: "background" })).toEqual({
			onOpenBackground: [{ do: "beep" }],
		});
		expect(getTargetHandlers(stack, at, { kind: "stack" })).toEqual({
			onOpenStack: [{ do: "beep" }],
		});
	});

	it("returns undefined for missing targets", () => {
		expect(
			getTargetHandlers(stack, at, { kind: "part", partId: "nope" }),
		).toBeUndefined();
		expect(
			getTargetHandlers(
				stack,
				{ currentCardId: "c2", layer: "card" },
				{ kind: "background" },
			),
		).toBeUndefined();
	});
});

describe("targetLabel", () => {
	it("labels targets", () => {
		expect(targetLabel({ kind: "part", partId: "b1" })).toBe('Part "b1"');
		expect(targetLabel({ kind: "stack" })).toBe("Stack Script");
	});
});

describe("validateHandlers", () => {
	it("accepts well-formed handlers including nested actions", () => {
		const result = validateHandlers({
			onMouseUp: [
				{ do: "if", condition: "1 > 0", then: [{ do: "beep" }], else: [] },
				{ do: "repeat", times: 2, body: [{ do: "play", sound: "boop" }] },
			],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects unknown events, non-arrays, and do-less actions", () => {
		expect(validateHandlers({ onSneeze: [] }).ok).toBe(false);
		expect(validateHandlers({ onMouseUp: {} }).ok).toBe(false);
		expect(validateHandlers({ onMouseUp: [{ to: "next" }] }).ok).toBe(false);
		expect(
			validateHandlers({ onMouseUp: [{ do: "if", then: [{ nope: 1 }] }] }).ok,
		).toBe(false);
		expect(validateHandlers("nope").ok).toBe(false);
	});
});
