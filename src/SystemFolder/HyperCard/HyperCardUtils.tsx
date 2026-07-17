/**
 * HyperCard runtime state — the mutable, per-open-stack state the interpreter
 * and the React component share through `apps["HyperCard.app"].data`.
 *
 * Persisted deltas (currentCardId, variables, field overrides, visibility) are
 * keyed by stable ids; all transient interpreter state lives under `runtime`,
 * which is stripped before persistence (see sanitizeStateForPersistence).
 */

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type {
	HCAction,
	HCBackground,
	HCCard,
	HCContainerRef,
	HCPart,
	HCStack,
	HCValue,
} from "@/SystemFolder/HyperCard/HyperCardModel";

export const HyperCardAppInfo = {
	id: "HyperCard.app",
	name: "HyperCard",
	icon: ClassicyIcons.system.files.application,
} as const;

/** Prefix for all HyperCard action types routed to the app reducer. */
export const HYPERCARD_EVENT_PREFIX = "ClassicyAppHyperCard";

// ---------------------------------------------------------------------------
// Interpreter runtime (ephemeral — never persisted)
// ---------------------------------------------------------------------------

/**
 * A reified interpreter frame. The frame stack fully captures control state so
 * it can be serialized/suspended at any instant (no host recursion). `if`
 * branches simply push a `seq` frame for the chosen branch.
 */
export type HCFrame =
	| { kind: "seq"; body: HCAction[]; ip: number }
	| {
			kind: "repeat";
			body: HCAction[];
			ip: number;
			/** Remaining iterations for a counted repeat (Infinity for while-loops). */
			remaining: number;
			/** Condition expression for a `while` repeat; re-checked each iteration. */
			while?: string;
	  };

export type HCRunStatus =
	| "idle"
	| "running"
	| "awaitingDialog"
	| "awaitingWait"
	| "awaitingTransition"
	| "awaitingCustom";

export type HCPendingEffect =
	| { id: number; kind: "beep" }
	| { id: number; kind: "play"; sound: string }
	| {
			id: number;
			kind: "openApp";
			appId: string;
			event?: string;
			data?: Record<string, unknown>;
	  }
	// A plugin effect: handled by a registered effect handler in the component.
	// `token` is present when a blocking command is awaiting resolution.
	| {
			id: number;
			kind: "custom";
			name: string;
			args: Record<string, unknown>;
			token?: string;
	  };

export interface HCDialog {
	kind: "answer" | "ask";
	message: string;
	buttons?: string[];
	/** ask only: seeded default text. */
	defaultValue?: string;
	token: string;
}

export interface HCTransition {
	effect: string;
	toCardId: string;
	token: string;
}

export interface HCRuntime {
	frames: HCFrame[];
	status: HCRunStatus;
	/** Where a dialog/wait/transition result resumes; token guards stale resumes. */
	resume?: { token: string; container?: HCContainerRef };
	/** Per-dispatch step budget guard. */
	steps: number;
	/** Single monotonic counter for effect ids and suspend tokens (deterministic — not Date.now/random). */
	seq: number;
	pendingEffects: HCPendingEffect[];
	dialog?: HCDialog;
	transition?: HCTransition;
	/** Pending `wait`; the component sets a timer and resumes on the token. */
	wait?: { ms: number; token: string };
	/** One-shot visual effect set by `visual`, applied to the next `go`. */
	pendingVisual?: string;
	/** Navigation depth guard against go-loops within a single run. */
	navDepth: number;
}

export function makeInitialRuntime(): HCRuntime {
	return {
		frames: [],
		status: "idle",
		steps: 0,
		seq: 0,
		pendingEffects: [],
		navDepth: 0,
	};
}

// ---------------------------------------------------------------------------
// Per-open-stack + app data
// ---------------------------------------------------------------------------

export interface HCOpenStack {
	/** Reference to the stack source (bundle key / url); re-parsed on open. */
	stackSource: string;
	/** Parsed stack — held in memory for the session, re-hydrated on load. */
	stack: HCStack;
	currentCardId: string;
	/** Card ids visited, for `go back`. */
	history: string[];
	variables: Record<string, HCValue>;
	/** Field value OVERRIDES only, keyed by {@link fieldKey}. */
	fieldValues: Record<string, string>;
	partVisibility: Record<string, boolean>;
	/** Bumped by programmatic put/set to force an input remount. */
	fieldRev: Record<string, number>;
	runtime: HCRuntime;
}

export interface HyperCardData {
	activeStackId?: string;
	openStacks: Record<string, HCOpenStack>;
}

export function isHyperCardData(d: unknown): d is HyperCardData {
	if (typeof d !== "object" || d === null) return false;
	const data = d as Record<string, unknown>;
	if (typeof data.openStacks !== "object" || data.openStacks === null) {
		return false;
	}
	return Object.values(data.openStacks as Record<string, unknown>).every(
		(s) =>
			typeof s === "object" &&
			s !== null &&
			typeof (s as HCOpenStack).currentCardId === "string" &&
			typeof (s as HCOpenStack).stack === "object",
	);
}

// ---------------------------------------------------------------------------
// Field keys
// ---------------------------------------------------------------------------

/**
 * Compute the storage key for a field's value. Shared fields collapse to a
 * single per-background entry; all other fields are per-card.
 */
export function fieldKey(
	part: Pick<HCPart, "id" | "shared">,
	cardId: string,
	backgroundId?: string,
): string {
	if (part.shared && backgroundId) {
		return `bg:${backgroundId}:${part.id}`;
	}
	return `card:${cardId}:${part.id}`;
}

// ---------------------------------------------------------------------------
// Stack navigation helpers
// ---------------------------------------------------------------------------

export function findCardIndexById(stack: HCStack, id: string): number {
	return stack.cards.findIndex((c) => c.id === id);
}

export function getCard(stack: HCStack, cardId: string): HCCard | undefined {
	return stack.cards.find((c) => c.id === cardId);
}

export function getBackgroundForCard(
	stack: HCStack,
	card: HCCard,
): HCBackground | undefined {
	if (!card.background) return undefined;
	return stack.backgrounds?.find((b) => b.id === card.background);
}

/**
 * Resolve a `go` target reference to a card id. Handles the keywords
 * next/prev/previous/first/last and matches by card id then card name.
 * Returns undefined for `back` (handled via history) or an unknown reference.
 */
export function resolveCardRef(
	stack: HCStack,
	currentCardId: string,
	ref: string,
): string | undefined {
	const idx = findCardIndexById(stack, currentCardId);
	const n = stack.cards.length;
	switch (ref.trim().toLowerCase()) {
		case "next":
			return stack.cards[(idx + 1 + n) % n]?.id;
		case "prev":
		case "previous":
			return stack.cards[(idx - 1 + n) % n]?.id;
		case "first":
			return stack.cards[0]?.id;
		case "last":
			return stack.cards[n - 1]?.id;
		case "back":
			return undefined;
	}
	const byId = getCard(stack, ref);
	if (byId) return byId.id;
	const byName = stack.cards.find((c) => c.name === ref);
	return byName?.id;
}

/** Collect a card's effective parts: its background's parts then its own. */
export function collectCardParts(
	stack: HCStack,
	card: HCCard,
): { part: HCPart; backgroundId?: string }[] {
	const bg = getBackgroundForCard(stack, card);
	const bgParts = (bg?.parts ?? []).map((part) => ({
		part,
		backgroundId: bg?.id,
	}));
	const cardParts = (card.parts ?? []).map((part) => ({ part }));
	return [...bgParts, ...cardParts];
}

/** Find a part by id across a card and its background. */
export function findPart(
	stack: HCStack,
	card: HCCard,
	partId: string,
): { part: HCPart; backgroundId?: string } | undefined {
	return collectCardParts(stack, card).find((p) => p.part.id === partId);
}
