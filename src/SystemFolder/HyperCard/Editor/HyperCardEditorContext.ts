/**
 * HyperCard editor event handler — routes ClassicyAppHCEdit* actions. A sibling
 * of the player's reducer (HyperCardContext): it owns per-stack edit sessions
 * under apps["HyperCard.app"].data.edits and never touches the player's
 * openStacks records (the draft is an independent deep copy).
 *
 * Prefix note: the kernel router is first-startsWith-match, so this prefix must
 * NOT start with "ClassicyAppHyperCard" (the player would swallow every action).
 */

import {
	type ActionMessage,
	type ClassicyStore,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	applyEdit,
	getPartDescriptor,
	type HCEditState,
	type HCScriptTarget,
	HYPERCARD_EDIT_EVENT_PREFIX,
	type HyperCardEditorData,
	layerParts,
	nextCardId,
	nextPartId,
	peekLayerParts,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import {
	DEFAULT_CARD_SIZE,
	type HCEventHandlers,
	type HCPart,
	type HCRect,
	type HCStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import { getHyperCardPartEditorMeta } from "@/SystemFolder/HyperCard/HyperCardPlugins";
import {
	type HCOpenStack,
	HyperCardAppInfo,
	resolveCardRef,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

const { id: APP_ID } = HyperCardAppInfo;

const MIN_PART_SIZE = 8;
const PASTE_OFFSET = 16;
const FALLBACK_SIZE: [number, number] = [120, 60];

function getEditorData(ds: ClassicyStore): HyperCardEditorData | undefined {
	const app = ds.System.Manager.Applications.apps[APP_ID];
	if (!app) return undefined;
	app.data ??= {};
	const data = app.data as HyperCardEditorData;
	data.edits ??= {};
	return data;
}

function getEdit(
	ds: ClassicyStore,
	action: ActionMessage,
): HCEditState | undefined {
	const stackId = action.stackId as string | undefined;
	if (!stackId) return undefined;
	return getEditorData(ds)?.edits?.[stackId];
}

function clampRect(rect: HCRect): HCRect {
	return [
		Math.max(0, Math.round(rect[0])),
		Math.max(0, Math.round(rect[1])),
		Math.max(MIN_PART_SIZE, Math.round(rect[2])),
		Math.max(MIN_PART_SIZE, Math.round(rect[3])),
	];
}

function findLayerPart(
	stack: HCStack,
	edit: Pick<HCEditState, "currentCardId" | "layer">,
	partId: string,
): HCPart | undefined {
	// peek, not layerParts: outside applyEdit mutators the draft is frozen.
	return peekLayerParts(stack, edit.currentCardId, edit.layer)?.find(
		(p) => p.id === partId,
	);
}

export const classicyHyperCardEditorEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const stackId = action.stackId as string | undefined;
	if (!stackId) return ds;

	switch (action.type) {
		case "ClassicyAppHCEditEnter": {
			const data = getEditorData(ds);
			if (!data) break;
			const existing = data.edits?.[stackId];
			if (existing) {
				existing.tool = "pointer";
				break;
			}
			const open = (
				ds.System.Manager.Applications.apps[APP_ID].data as {
					openStacks?: Record<string, HCOpenStack>;
				}
			).openStacks?.[stackId];
			if (!open) break;
			// biome-ignore lint/style/noNonNullAssertion: getEditorData seeded edits
			data.edits![stackId] = {
				draft: JSON.parse(JSON.stringify(open.stack)) as HCStack,
				currentCardId: open.currentCardId,
				layer: "card",
				tool: "pointer",
				undo: [],
				redo: [],
				dirty: false,
				pristine: JSON.parse(JSON.stringify(open.stack)) as HCStack,
			};
			break;
		}

		case "ClassicyAppHCEditExit": {
			const data = getEditorData(ds);
			const edit = data?.edits?.[stackId];
			if (edit?.pristine) {
				const open = (
					ds.System.Manager.Applications.apps[APP_ID].data as {
						openStacks?: Record<string, HCOpenStack>;
					}
				).openStacks?.[stackId];
				if (open) {
					const pristine = edit.pristine;
					open.stack = pristine;
					if (!pristine.cards.some((c) => c.id === open.currentCardId)) {
						open.currentCardId = pristine.cards[0].id;
					}
				}
			}
			if (data?.edits) delete data.edits[stackId];
			break;
		}

		case "ClassicyAppHCEditSetTool": {
			const edit = getEdit(ds, action);
			if (!edit) break;
			const tool = action.tool as HCEditState["tool"] | undefined;
			if (tool === "browse" || tool === "pointer") {
				edit.tool = tool;
				edit.placing = undefined;
			}
			break;
		}

		case "ClassicyAppHCEditSelect": {
			const edit = getEdit(ds, action);
			if (edit) edit.selectedPartId = action.partId as string | undefined;
			break;
		}

		case "ClassicyAppHCEditSetLayer": {
			const edit = getEdit(ds, action);
			if (!edit) break;
			const layer = action.layer as HCEditState["layer"] | undefined;
			if (layer === "card" || layer === "background") {
				edit.layer = layer;
				edit.selectedPartId = undefined;
			}
			break;
		}

		case "ClassicyAppHCEditSetCard": {
			const edit = getEdit(ds, action);
			if (!edit) break;
			const to = action.to as string | undefined;
			if (!to) break;
			const target = resolveCardRef(edit.draft, edit.currentCardId, to);
			if (target) {
				edit.currentCardId = target;
				edit.selectedPartId = undefined;
			}
			break;
		}

		case "ClassicyAppHCEditSetPlacing": {
			const edit = getEdit(ds, action);
			if (edit) edit.placing = action.partType as string | undefined;
			break;
		}

		case "ClassicyAppHCEditSetRect": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			const rect = action.rect as HCRect | undefined;
			if (!edit || !partId || !rect || rect.length !== 4) break;
			applyEdit(edit, (draft) => {
				const part = findLayerPart(draft, edit, partId);
				if (part) part.rect = clampRect(rect);
			});
			break;
		}

		case "ClassicyAppHCEditAddPart": {
			const edit = getEdit(ds, action);
			const partType = action.partType as string | undefined;
			const at = action.at as [number, number] | undefined;
			if (!edit || !partType || !at) break;
			const desc = getPartDescriptor(partType);
			const meta = getHyperCardPartEditorMeta(partType);
			const size = desc?.defaultSize ?? meta?.defaultSize ?? FALLBACK_SIZE;
			const defaultOptions = desc?.defaultOptions ?? meta?.defaultOptions;
			const defaultContent = desc?.defaultContent ?? meta?.defaultContent;
			const id = nextPartId(edit.draft, partType);
			applyEdit(edit, (draft) => {
				const parts = layerParts(draft, edit.currentCardId, edit.layer);
				if (!parts) return;
				const part: HCPart = {
					id,
					type: partType,
					rect: clampRect([at[0], at[1], size[0], size[1]]),
				};
				if (defaultOptions) {
					part.options = JSON.parse(JSON.stringify(defaultOptions));
				}
				if (defaultContent) part.content = defaultContent;
				parts.push(part);
			});
			edit.selectedPartId = id;
			edit.placing = undefined;
			break;
		}

		case "ClassicyAppHCEditDeletePart": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			if (!edit || !partId) break;
			applyEdit(edit, (draft) => {
				const parts = layerParts(draft, edit.currentCardId, edit.layer);
				if (!parts) return;
				const idx = parts.findIndex((p) => p.id === partId);
				if (idx >= 0) parts.splice(idx, 1);
			});
			if (edit.selectedPartId === partId) edit.selectedPartId = undefined;
			break;
		}

		case "ClassicyAppHCEditCopyPart": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			if (!edit || !partId) break;
			const part = findLayerPart(edit.draft, edit, partId);
			if (part) {
				edit.clipboard = JSON.parse(JSON.stringify(part)) as HCPart;
			}
			break;
		}

		case "ClassicyAppHCEditPastePart": {
			const edit = getEdit(ds, action);
			if (!edit?.clipboard) break;
			const source = edit.clipboard;
			const id = nextPartId(edit.draft, source.type);
			applyEdit(edit, (draft) => {
				const parts = layerParts(draft, edit.currentCardId, edit.layer);
				if (!parts) return;
				const copy = JSON.parse(JSON.stringify(source)) as HCPart;
				copy.id = id;
				const [x, y, w, h] = copy.rect ?? [0, 0, ...FALLBACK_SIZE];
				copy.rect = clampRect([x + PASTE_OFFSET, y + PASTE_OFFSET, w, h]);
				parts.push(copy);
			});
			edit.selectedPartId = id;
			break;
		}

		case "ClassicyAppHCEditUndo": {
			const edit = getEdit(ds, action);
			if (!edit || edit.undo.length === 0) break;
			// biome-ignore lint/style/noNonNullAssertion: length checked above
			const prev = edit.undo.pop()!;
			edit.redo.push(edit.draft);
			edit.draft = prev;
			edit.dirty = true;
			edit.selectedPartId = undefined;
			if (!edit.draft.cards.some((c) => c.id === edit.currentCardId)) {
				edit.currentCardId = edit.draft.cards[0].id;
			}
			break;
		}

		case "ClassicyAppHCEditRedo": {
			const edit = getEdit(ds, action);
			if (!edit || edit.redo.length === 0) break;
			// biome-ignore lint/style/noNonNullAssertion: length checked above
			const next = edit.redo.pop()!;
			edit.undo.push(edit.draft);
			edit.draft = next;
			edit.dirty = true;
			edit.selectedPartId = undefined;
			if (!edit.draft.cards.some((c) => c.id === edit.currentCardId)) {
				edit.currentCardId = edit.draft.cards[0].id;
			}
			break;
		}

		case "ClassicyAppHCEditAddCard": {
			const edit = getEdit(ds, action);
			if (!edit) break;
			const id = nextCardId(edit.draft);
			applyEdit(edit, (draft) => {
				const idx = draft.cards.findIndex((c) => c.id === edit.currentCardId);
				const background = idx >= 0 ? draft.cards[idx].background : undefined;
				draft.cards.splice(idx + 1, 0, {
					id,
					...(background ? { background } : {}),
				});
			});
			edit.currentCardId = id;
			edit.selectedPartId = undefined;
			break;
		}

		case "ClassicyAppHCEditDeleteCard": {
			const edit = getEdit(ds, action);
			if (!edit || edit.draft.cards.length <= 1) break;
			const idx = edit.draft.cards.findIndex(
				(c) => c.id === edit.currentCardId,
			);
			applyEdit(edit, (draft) => {
				const i = draft.cards.findIndex((c) => c.id === edit.currentCardId);
				if (i >= 0) draft.cards.splice(i, 1);
			});
			const fallback = edit.draft.cards[Math.max(0, idx - 1)];
			edit.currentCardId = fallback.id;
			edit.selectedPartId = undefined;
			break;
		}

		case "ClassicyAppHCEditSetPartProps": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			const props = action.props as
				| {
						id?: string;
						name?: string;
						content?: string;
						visible?: boolean;
						locked?: boolean;
						shared?: boolean;
				  }
				| undefined;
			if (!edit || !partId || !props) break;
			const wantsRename =
				typeof props.id === "string" &&
				props.id.length > 0 &&
				props.id !== partId;
			const allIds = new Set<string>();
			for (const c of edit.draft.cards)
				for (const p of c.parts ?? []) allIds.add(p.id);
			for (const b of edit.draft.backgrounds ?? [])
				for (const p of b.parts ?? []) allIds.add(p.id);
			const renameOk = wantsRename && !allIds.has(props.id as string);
			applyEdit(edit, (draft) => {
				const part = layerParts(draft, edit.currentCardId, edit.layer)?.find(
					(p) => p.id === partId,
				);
				if (!part) return;
				if (renameOk) part.id = props.id as string;
				if (typeof props.name === "string") part.name = props.name;
				if (typeof props.content === "string") part.content = props.content;
				if (typeof props.visible === "boolean") part.visible = props.visible;
				if (typeof props.locked === "boolean") part.locked = props.locked;
				if (typeof props.shared === "boolean") part.shared = props.shared;
			});
			if (renameOk && edit.selectedPartId === partId) {
				edit.selectedPartId = props.id as string;
			}
			break;
		}

		case "ClassicyAppHCEditSetPartStyle": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			const style = action.style as Record<string, string> | undefined;
			if (!edit || !partId || !style) break;
			applyEdit(edit, (draft) => {
				const part = layerParts(draft, edit.currentCardId, edit.layer)?.find(
					(p) => p.id === partId,
				);
				if (!part) return;
				const next: Record<string, string> = {
					...(part.style as Record<string, string> | undefined),
				};
				for (const [k, v] of Object.entries(style)) {
					if (v === "") delete next[k];
					else next[k] = v;
				}
				if (Object.keys(next).length === 0) part.style = undefined;
				else part.style = next as HCPart["style"];
			});
			break;
		}

		case "ClassicyAppHCEditSetPartOption": {
			const edit = getEdit(ds, action);
			const partId = action.partId as string | undefined;
			const key = action.key as string | undefined;
			if (!edit || !partId || !key) break;
			applyEdit(edit, (draft) => {
				const part = layerParts(draft, edit.currentCardId, edit.layer)?.find(
					(p) => p.id === partId,
				);
				if (!part) return;
				if (action.value === undefined) {
					if (!part.options) return;
					delete part.options[key];
					if (Object.keys(part.options).length === 0) part.options = undefined;
				} else {
					part.options ??= {};
					part.options[key] = action.value;
				}
			});
			break;
		}

		case "ClassicyAppHCEditSetCardProps": {
			const edit = getEdit(ds, action);
			const props = action.props as
				| { name?: string; background?: string }
				| undefined;
			if (!edit || !props) break;
			const backgroundIds = new Set(
				(edit.draft.backgrounds ?? []).map((b) => b.id),
			);
			applyEdit(edit, (draft) => {
				const card = draft.cards.find((c) => c.id === edit.currentCardId);
				if (!card) return;
				if (typeof props.name === "string") card.name = props.name;
				if (props.background === "") card.background = undefined;
				else if (
					typeof props.background === "string" &&
					backgroundIds.has(props.background)
				) {
					card.background = props.background;
				}
			});
			break;
		}

		case "ClassicyAppHCEditSetStackProps": {
			const edit = getEdit(ds, action);
			const props = action.props as
				| { name?: string; width?: number; height?: number }
				| undefined;
			if (!edit || !props) break;
			applyEdit(edit, (draft) => {
				if (typeof props.name === "string" && props.name.length > 0) {
					draft.name = props.name;
				}
				if (props.width !== undefined || props.height !== undefined) {
					const [w, h] = draft.size ?? DEFAULT_CARD_SIZE;
					draft.size = [
						Math.max(64, Math.round(Number(props.width ?? w))),
						Math.max(64, Math.round(Number(props.height ?? h))),
					];
				}
			});
			break;
		}

		case "ClassicyAppHCEditSetStackVariable": {
			const edit = getEdit(ds, action);
			const name = action.name as string | undefined;
			if (!edit || !name) break;
			applyEdit(edit, (draft) => {
				if (action.value === undefined) {
					if (draft.variables) delete draft.variables[name];
				} else {
					draft.variables ??= {};
					draft.variables[name] = action.value as string | number;
				}
			});
			break;
		}

		case "ClassicyAppHCEditShowScript": {
			const edit = getEdit(ds, action);
			const target = action.target as HCScriptTarget | undefined;
			if (edit && target) edit.script = { target };
			break;
		}

		case "ClassicyAppHCEditHideScript": {
			const edit = getEdit(ds, action);
			if (edit) edit.script = undefined;
			break;
		}

		case "ClassicyAppHCEditSetScript": {
			const edit = getEdit(ds, action);
			const target = action.target as HCScriptTarget | undefined;
			const handlers = action.handlers as HCEventHandlers | undefined;
			if (!edit || !target || typeof handlers !== "object" || handlers === null)
				break;
			const empty = Object.keys(handlers).length === 0;
			applyEdit(edit, (draft) => {
				const card = draft.cards.find((c) => c.id === edit.currentCardId);
				if (!card) return;
				switch (target.kind) {
					case "part": {
						const parts =
							edit.layer === "background"
								? draft.backgrounds?.find((b) => b.id === card.background)
										?.parts
								: card.parts;
						const part = parts?.find((p) => p.id === target.partId);
						if (part) part.script = empty ? undefined : handlers;
						break;
					}
					case "card":
						card.script = empty ? undefined : handlers;
						break;
					case "background": {
						const bg = draft.backgrounds?.find((b) => b.id === card.background);
						if (bg) bg.script = empty ? undefined : handlers;
						break;
					}
					case "stack":
						draft.stackScript = empty ? undefined : handlers;
						break;
				}
			});
			break;
		}

		case "ClassicyAppHCEditMarkSaved": {
			const edit = getEdit(ds, action);
			if (edit) edit.dirty = false;
			break;
		}
	}

	return ds;
};

// Self-register so the kernel router dispatches ClassicyAppHCEdit* events here.
registerAppEventHandler(
	HYPERCARD_EDIT_EVENT_PREFIX,
	classicyHyperCardEditorEventHandler,
);
