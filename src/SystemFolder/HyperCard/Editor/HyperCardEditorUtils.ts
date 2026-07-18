/**
 * HyperCard editor state — the per-stack editing session the ClassicyAppHCEdit*
 * reducer owns, kept beside (not inside) the player's HCOpenStack records.
 *
 * The draft HCStack is treated as an IMMUTABLE VALUE: every mutation goes
 * through {@link applyEdit}, which produces a new draft via a nested Immer
 * produce and pushes the previous value onto the undo stack. Structural sharing
 * makes each undo entry cost only the touched path, so no patch plumbing or
 * full-document snapshots are needed.
 */

import { current, isDraft, produce } from "immer";
import type { HCPart, HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

/**
 * Action-type prefix for the editor reducer. Deliberately NOT
 * "ClassicyAppHyperCardEdit": the kernel router picks the first registered
 * prefix the action type startsWith, and the player owns "ClassicyAppHyperCard".
 */
export const HYPERCARD_EDIT_EVENT_PREFIX = "ClassicyAppHCEdit";

export const MAX_UNDO = 100;

export type HCEditorTool = "browse" | "pointer";

/** What a script-editor session is pointed at. */
export type HCScriptTarget =
	| { kind: "part"; partId: string }
	| { kind: "card" }
	| { kind: "background" }
	| { kind: "stack" };

export interface HCEditState {
	/** The edited stack — replaced wholesale by {@link applyEdit}, never mutated. */
	draft: HCStack;
	currentCardId: string;
	/**
	 * Deep copy of the stack as it was when the edit session was entered.
	 * Optional so sessions persisted before this field existed don't crash on
	 * rehydrate. Restored onto the player's open stack on a discarding Exit so
	 * a Browse-preview overwrite doesn't leak into "Stop Editing (Discard)".
	 */
	pristine?: HCStack;
	/** Which layer edits target: the card's own parts or its background's. */
	layer: "card" | "background";
	tool: HCEditorTool;
	selectedPartId?: string;
	/** A part type armed for click-to-place from the tools palette. */
	placing?: string;
	clipboard?: HCPart;
	undo: HCStack[];
	redo: HCStack[];
	dirty: boolean;
	/** Open script-editor session, if any. */
	script?: { target: HCScriptTarget };
}

/** Editor slice stored as a sibling key on apps["HyperCard.app"].data. */
export interface HyperCardEditorData {
	edits?: Record<string, HCEditState>;
}

/**
 * Apply a mutation to the draft as an immutable update, recording undo. Safe
 * both inside the kernel's Immer dispatch (draft) and on plain objects (tests):
 * the previous value is unwrapped via current() before producing from it.
 */
export function applyEdit(
	edit: HCEditState,
	mutator: (draft: HCStack) => void,
): void {
	const prev = isDraft(edit.draft)
		? (current(edit.draft) as HCStack)
		: edit.draft;
	const next = produce(prev, mutator);
	if (next === prev) return;
	edit.undo.push(prev);
	if (edit.undo.length > MAX_UNDO) edit.undo.shift();
	edit.redo = [];
	edit.draft = next;
	edit.dirty = true;
}

/**
 * WRITE path: the parts array edits target for a card + layer, creating an
 * empty array on the owner when absent so callers can push into it. Only call
 * inside applyEdit mutators — outside them the draft is frozen by Immer and
 * the on-demand assignment would throw. Returns undefined when the card (or,
 * for the background layer, its background) doesn't exist.
 */
export function layerParts(
	stack: HCStack,
	cardId: string,
	layer: "card" | "background",
): HCPart[] | undefined {
	const card = stack.cards.find((c) => c.id === cardId);
	if (!card) return undefined;
	if (layer === "card") {
		card.parts ??= [];
		return card.parts;
	}
	if (!card.background) return undefined;
	const bg = stack.backgrounds?.find((b) => b.id === card.background);
	if (!bg) return undefined;
	bg.parts ??= [];
	return bg.parts;
}

/** READ path: same lookup as {@link layerParts} but never assigns — safe on the frozen draft. */
export function peekLayerParts(
	stack: HCStack,
	cardId: string,
	layer: "card" | "background",
): HCPart[] | undefined {
	const card = stack.cards.find((c) => c.id === cardId);
	if (!card) return undefined;
	if (layer === "card") return card.parts;
	if (!card.background) return undefined;
	return stack.backgrounds?.find((b) => b.id === card.background)?.parts;
}

/** Deterministic next free id of the form `${type}${n}` across the whole stack. */
export function nextPartId(stack: HCStack, type: string): string {
	const ids = new Set<string>();
	for (const c of stack.cards) for (const p of c.parts ?? []) ids.add(p.id);
	for (const b of stack.backgrounds ?? [])
		for (const p of b.parts ?? []) ids.add(p.id);
	let n = 1;
	while (ids.has(`${type}${n}`)) n++;
	return `${type}${n}`;
}

/** Deterministic next free id of the form `card${n}`. */
export function nextCardId(stack: HCStack): string {
	const ids = new Set(stack.cards.map((c) => c.id));
	let n = 1;
	while (ids.has(`card${n}`)) n++;
	return `card${n}`;
}

export interface HCPartDescriptor {
	type: string;
	label: string;
	defaultSize: [number, number];
	defaultOptions?: Record<string, unknown>;
	defaultContent?: string;
}

/** Palette entries + creation defaults for the built-in part types. */
export const BUILTIN_PART_DESCRIPTORS: HCPartDescriptor[] = [
	{ type: "button", label: "Button", defaultSize: [100, 24] },
	{ type: "field", label: "Field", defaultSize: [160, 24] },
	{ type: "checkbox", label: "Checkbox", defaultSize: [140, 20] },
	{
		type: "radio",
		label: "Radio Group",
		defaultSize: [140, 60],
		defaultOptions: { choices: ["One", "Two"] },
	},
	{
		type: "popup",
		label: "Pop-up Menu",
		defaultSize: [160, 24],
		defaultOptions: { choices: ["One", "Two"] },
	},
	{
		type: "slider",
		label: "Slider",
		defaultSize: [160, 24],
		defaultOptions: { min: 0, max: 100, step: 1 },
	},
	{
		type: "progress",
		label: "Progress Bar",
		defaultSize: [160, 16],
		defaultOptions: { max: 100 },
	},
	{
		type: "label",
		label: "Label",
		defaultSize: [160, 20],
		defaultContent: "Label",
	},
	{
		type: "image",
		label: "Image",
		defaultSize: [120, 90],
		defaultOptions: { src: "" },
	},
	{ type: "group", label: "Group", defaultSize: [200, 120] },
];

export function getPartDescriptor(type: string): HCPartDescriptor | undefined {
	return BUILTIN_PART_DESCRIPTORS.find((d) => d.type === type);
}
