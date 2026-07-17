/**
 * HyperCard stack model — the authored, JSON-serializable description of a
 * stack. This is the "document" a HyperCard stack file contains: a stack of
 * cards, each holding parts (buttons, fields, …) with placement, content, and
 * declarative behaviour.
 *
 * Behaviour is expressed as ordered lists of typed {@link HCAction} objects per
 * event (no HyperTalk text parser). Value strings inside actions are evaluated
 * by HyperCardExpression.ts; control state is executed by HyperCardEngine.ts.
 */

/** Default classic HyperCard card size, in pixels. */
export const DEFAULT_CARD_SIZE: [number, number] = [512, 342];

export type HCValue = string | number;

/** Rectangle as [x, y, width, height], in card-local pixels. */
export type HCRect = [number, number, number, number];

/**
 * Built-in part types. Plugins may register additional types (rendered by name
 * via registerHyperCardPart), so `HCPart.type` is a widened `string` — this
 * union documents the built-ins and gives authoring autocomplete.
 */
export type HCBuiltinPartType =
	| "button"
	| "field"
	| "checkbox"
	| "radio"
	| "popup"
	| "slider"
	| "progress"
	| "label"
	| "image"
	| "group";

export type HCPartType = HCBuiltinPartType | (string & {});

export interface HCPartStyle {
	/** Button visual style. */
	shape?: "rectangle" | "roundRect" | "transparent" | "default";
	align?: "left" | "center" | "right";
	fontSize?: "small" | "medium" | "large";
}

export interface HCPart {
	id: string;
	name?: string;
	type: HCPartType;
	/** Absolute placement within the card canvas. */
	rect?: HCRect;
	/** Initial visibility (default true). */
	visible?: boolean;
	/** Authored content — a field's default text, a label's text, etc. */
	content?: string;
	/**
	 * Fields only: when true the field's text is shared across every card that
	 * uses the same background; otherwise it is card-specific.
	 */
	shared?: boolean;
	/** Fields only: locked fields are display-only (rendered as a label). */
	locked?: boolean;
	style?: HCPartStyle;
	/** Component-specific extras: popup `choices`, slider `min`/`max`, image `src`, field `multiline`, radio `family`, … */
	options?: Record<string, unknown>;
	/** Part-level message handlers (onMouseUp, …). */
	script?: HCEventHandlers;
}

export interface HCCard {
	id: string;
	name?: string;
	/** Reference to a {@link HCBackground} id. */
	background?: string;
	parts?: HCPart[];
	script?: HCEventHandlers;
}

export interface HCBackground {
	id: string;
	name?: string;
	parts?: HCPart[];
	script?: HCEventHandlers;
}

export interface HCEventHandlers {
	onOpenStack?: HCAction[];
	onCloseStack?: HCAction[];
	onOpenCard?: HCAction[];
	onCloseCard?: HCAction[];
	onOpenBackground?: HCAction[];
	onMouseUp?: HCAction[];
	onMouseDown?: HCAction[];
	onIdle?: HCAction[];
}

export type HCEventName = keyof HCEventHandlers;

export const HC_EVENT_NAMES: HCEventName[] = [
	"onOpenStack",
	"onCloseStack",
	"onOpenCard",
	"onCloseCard",
	"onOpenBackground",
	"onMouseUp",
	"onMouseDown",
	"onIdle",
];

/** A container reference — a variable or a field — that a value is written to. */
export interface HCContainerRef {
	/** Variable name. */
	var?: string;
	/** Field (part) id. */
	field?: string;
}

/**
 * A single declarative action. Discriminated by `do`. Value-bearing keys
 * (`value`, `to`, `condition`, …) are expression strings unless noted.
 */
export type HCAction =
	// Navigation. `to`: next | prev | first | last | back | <cardId> | <cardName>
	| { do: "go"; to: string }
	// Put a value into a field or variable.
	| ({ do: "put"; value: string } & HCContainerRef)
	// Arithmetic on a field or variable container.
	| ({ do: "add"; value: string } & HCContainerRef)
	| ({ do: "subtract"; value: string } & HCContainerRef)
	| ({ do: "multiply"; value: string } & HCContainerRef)
	| ({ do: "divide"; value: string } & HCContainerRef)
	// Set a part/card property (e.g. visible) to a value.
	| { do: "set"; part?: string; property: string; value: string }
	| { do: "show"; part: string }
	| { do: "hide"; part: string }
	| { do: "beep" }
	| { do: "play"; sound: string }
	// Modal message; the clicked button label is written to `it` (or the container).
	| ({ do: "answer"; message: string; buttons?: string[] } & HCContainerRef)
	// Modal prompt; the entered text is written to `it` (or the container).
	| ({ do: "ask"; prompt: string; default?: string } & HCContainerRef)
	// Visual effect applied to the next `go`.
	| { do: "visual"; effect: string }
	| { do: "wait"; ms: number }
	| { do: "if"; condition: string; then: HCAction[]; else?: HCAction[] }
	| { do: "repeat"; times?: number; while?: string; body: HCAction[] }
	// Hand off to another Classicy app via dispatchToPlugin.
	| {
			do: "openApp";
			app: string;
			event?: string;
			data?: Record<string, unknown>;
	  };

/**
 * A plugin command action — `do` is a registered command name
 * (see registerHyperCardCommand). Deliberately NOT part of the {@link HCAction}
 * union: a `{ do: string }` member would collapse the discriminated union and
 * break narrowing of the built-in actions. Stacks are JSON (untyped), so plugin
 * commands validate fine at runtime; the engine handles them in its default case.
 */
export type HCPluginAction = { do: string } & Record<string, unknown>;

export interface HCStack {
	name: string;
	/** HyperCard major version this stack targets ("1" | "2"); informational. */
	version?: string;
	/** Card canvas size [w, h]; defaults to {@link DEFAULT_CARD_SIZE}. */
	size?: [number, number];
	/** Stack-global variables, seeded into the runtime. */
	variables?: Record<string, HCValue>;
	backgrounds?: HCBackground[];
	cards: HCCard[];
	stackScript?: HCEventHandlers;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type HCValidateResult =
	| { ok: true; stack: HCStack }
	| { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate an untrusted parsed-JSON value as an {@link HCStack}. Returns the
 * typed stack on success or a list of human-readable errors. Kept intentionally
 * lenient about optional fields — only structural invariants the engine relies
 * on (ids, a non-empty cards array, part types) are enforced.
 */
export function validateStack(raw: unknown): HCValidateResult {
	const errors: string[] = [];

	if (!isObject(raw)) {
		return { ok: false, errors: ["Stack must be a JSON object."] };
	}
	if (typeof raw.name !== "string" || raw.name.length === 0) {
		errors.push("Stack.name must be a non-empty string.");
	}
	if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
		errors.push("Stack.cards must be a non-empty array.");
		return { ok: false, errors };
	}

	const cardIds = new Set<string>();
	raw.cards.forEach((card, i) => {
		if (!isObject(card)) {
			errors.push(`Card ${i} must be an object.`);
			return;
		}
		if (typeof card.id !== "string" || card.id.length === 0) {
			errors.push(`Card ${i} is missing a string id.`);
		} else if (cardIds.has(card.id)) {
			errors.push(`Duplicate card id "${card.id}".`);
		} else {
			cardIds.add(card.id);
		}
		if (card.parts !== undefined) {
			validateParts(card.parts, `card "${String(card.id)}"`, errors);
		}
	});

	if (raw.backgrounds !== undefined) {
		if (!Array.isArray(raw.backgrounds)) {
			errors.push("Stack.backgrounds must be an array.");
		} else {
			raw.backgrounds.forEach((bg, i) => {
				if (!isObject(bg) || typeof bg.id !== "string") {
					errors.push(`Background ${i} is missing a string id.`);
					return;
				}
				if (bg.parts !== undefined) {
					validateParts(bg.parts, `background "${bg.id}"`, errors);
				}
			});
		}
	}

	if (errors.length > 0) return { ok: false, errors };
	return { ok: true, stack: raw as unknown as HCStack };
}

function validateParts(parts: unknown, where: string, errors: string[]): void {
	if (!Array.isArray(parts)) {
		errors.push(`Parts of ${where} must be an array.`);
		return;
	}
	const ids = new Set<string>();
	parts.forEach((part, i) => {
		if (!isObject(part)) {
			errors.push(`Part ${i} of ${where} must be an object.`);
			return;
		}
		if (typeof part.id !== "string" || part.id.length === 0) {
			errors.push(`Part ${i} of ${where} is missing a string id.`);
		} else if (ids.has(part.id)) {
			errors.push(`Duplicate part id "${part.id}" in ${where}.`);
		} else {
			ids.add(part.id);
		}
		// Any non-empty string type is valid: unknown types resolve to a
		// plugin-registered part (registerHyperCardPart) or a placeholder at render.
		if (typeof part.type !== "string" || part.type.length === 0) {
			errors.push(
				`Part "${String(part.id)}" of ${where} is missing a string type.`,
			);
		}
	});
}
