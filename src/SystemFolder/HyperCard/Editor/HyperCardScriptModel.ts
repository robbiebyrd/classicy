/**
 * Script-editor model: resolve a script target to its event-handler object,
 * and validate raw JSON as HCEventHandlers. Validation is structural only —
 * `do` names are NOT checked against the verb list, because plugin commands
 * are legal `do` values (the engine resolves them at run time).
 */

import type {
	HCEditState,
	HCScriptTarget,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import {
	HC_EVENT_NAMES,
	type HCEventHandlers,
	type HCStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";

export function getTargetHandlers(
	draft: HCStack,
	edit: Pick<HCEditState, "currentCardId" | "layer">,
	target: HCScriptTarget,
): HCEventHandlers | undefined {
	const card = draft.cards.find((c) => c.id === edit.currentCardId);
	if (!card) return undefined;
	switch (target.kind) {
		case "part": {
			const parts =
				edit.layer === "background"
					? draft.backgrounds?.find((b) => b.id === card.background)?.parts
					: card.parts;
			const part = parts?.find((p) => p.id === target.partId);
			return part ? (part.script ?? {}) : undefined;
		}
		case "card":
			return card.script ?? {};
		case "background": {
			const bg = draft.backgrounds?.find((b) => b.id === card.background);
			return bg ? (bg.script ?? {}) : undefined;
		}
		case "stack":
			return draft.stackScript ?? {};
	}
}

export function targetLabel(target: HCScriptTarget): string {
	switch (target.kind) {
		case "part":
			return `Part “${target.partId}”`;
		case "card":
			return "Card Script";
		case "background":
			return "Background Script";
		case "stack":
			return "Stack Script";
	}
}

export function validateHandlers(
	raw: unknown,
): { ok: true; handlers: HCEventHandlers } | { ok: false; errors: string[] } {
	const errors: string[] = [];
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return {
			ok: false,
			errors: ["Script must be a JSON object of event handlers."],
		};
	}
	const eventNames = new Set<string>(HC_EVENT_NAMES);
	for (const [event, actions] of Object.entries(raw)) {
		if (!eventNames.has(event)) {
			errors.push(`Unknown event "${event}".`);
			continue;
		}
		validateActionList(actions, event, errors);
	}
	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, handlers: raw as HCEventHandlers };
}

function validateActionList(
	actions: unknown,
	where: string,
	errors: string[],
): void {
	if (!Array.isArray(actions)) {
		errors.push(`${where} must be an array of actions.`);
		return;
	}
	actions.forEach((action, i) => {
		if (
			typeof action !== "object" ||
			action === null ||
			Array.isArray(action)
		) {
			errors.push(`${where}[${i}] must be an object.`);
			return;
		}
		const a = action as Record<string, unknown>;
		if (typeof a.do !== "string" || a.do.length === 0) {
			errors.push(`${where}[${i}] is missing a string "do".`);
		}
		for (const nested of ["then", "else", "body"] as const) {
			if (a[nested] !== undefined) {
				validateActionList(a[nested], `${where}[${i}].${nested}`, errors);
			}
		}
	});
}
