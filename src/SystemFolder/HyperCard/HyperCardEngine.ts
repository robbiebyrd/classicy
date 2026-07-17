/**
 * HyperCard interpreter engine.
 *
 * A synchronous, pure work-list interpreter over an {@link HCOpenStack}'s
 * runtime. It runs entirely inside the Immer reducer, so it can neither sleep
 * nor perform effects: blocking operations (ask/answer/wait/visual) SUSPEND by
 * recording state and a resume token, and side-effects (beep/play/openApp) are
 * queued for the component to consume.
 *
 * Control state is fully reified in `runtime.frames` (no host recursion), so the
 * frame stack *is* the continuation — suspend = stop stepping, resume = flip
 * status back to "running" and drive again.
 */

import {
	coerceBool,
	coerceNumber,
	coerceString,
	evaluate,
	evaluateToBool,
	evaluateToNumber,
	type HCEvalContext,
} from "@/SystemFolder/HyperCard/HyperCardExpression";
import type {
	HCAction,
	HCContainerRef,
	HCEventHandlers,
	HCValue,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardCommand,
	type HCCommandAction,
	type HCCommandContext,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";
import {
	fieldKey,
	findPart,
	getBackgroundForCard,
	getCard,
	type HCOpenStack,
	type HCRuntime,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

/** Hard guard: max interpreter steps per dispatch (prevents tab-freezing loops). */
export const STEP_BUDGET = 100_000;
/** Hard guard: max chained navigations within a single run. */
export const NAV_DEPTH_CAP = 64;
/** Hard guard: max counted-repeat iterations. */
export const REPEAT_CAP = 100_000;
const HISTORY_CAP = 200;

// Internal (engine-only) actions used to sequence navigation.
type InternalAction =
	| { do: "@closeCard" }
	| { do: "@switchCard"; to: string; back: boolean }
	| { do: "@transition"; effect: string }
	| { do: "@openCard" };

type EngineAction = HCAction | InternalAction;

// ---------------------------------------------------------------------------
// Evaluation context + container access
// ---------------------------------------------------------------------------

export function makeEvalContext(open: HCOpenStack): HCEvalContext {
	return {
		getVar: (n) => open.variables[n],
		getField: (id) => readFieldValue(open, id),
	};
}

function readFieldValue(open: HCOpenStack, partId: string): string | undefined {
	const card = getCard(open.stack, open.currentCardId);
	if (!card) return undefined;
	const found = findPart(open.stack, card, partId);
	if (!found) return undefined;
	const key = fieldKey(found.part, open.currentCardId, found.backgroundId);
	return open.fieldValues[key] ?? found.part.content ?? "";
}

function writeField(open: HCOpenStack, partId: string, text: string): void {
	const card = getCard(open.stack, open.currentCardId);
	if (!card) return;
	const found = findPart(open.stack, card, partId);
	if (!found) return;
	const key = fieldKey(found.part, open.currentCardId, found.backgroundId);
	open.fieldValues[key] = text;
	open.fieldRev[key] = (open.fieldRev[key] ?? 0) + 1;
}

function writeContainer(
	open: HCOpenStack,
	ref: HCContainerRef,
	value: HCValue | boolean,
): void {
	if (ref.var) {
		open.variables[ref.var] =
			typeof value === "number" ? value : coerceString(value);
	} else if (ref.field) {
		writeField(open, ref.field, coerceString(value));
	}
}

function readContainerNumber(open: HCOpenStack, ref: HCContainerRef): number {
	if (ref.var) return coerceNumber(open.variables[ref.var] ?? 0);
	if (ref.field) return coerceNumber(readFieldValue(open, ref.field) ?? 0);
	return 0;
}

// ---------------------------------------------------------------------------
// Handler collection
// ---------------------------------------------------------------------------

function handlerActions(
	handlers: HCEventHandlers | undefined,
	event: keyof HCEventHandlers,
): HCAction[] {
	return handlers?.[event] ?? [];
}

function openCardActions(open: HCOpenStack, cardId: string): HCAction[] {
	const card = getCard(open.stack, cardId);
	if (!card) return [];
	const bg = getBackgroundForCard(open.stack, card);
	return [
		...handlerActions(bg?.script, "onOpenBackground"),
		...handlerActions(bg?.script, "onOpenCard"),
		...handlerActions(card.script, "onOpenCard"),
	];
}

function closeCardActions(open: HCOpenStack, cardId: string): HCAction[] {
	const card = getCard(open.stack, cardId);
	if (!card) return [];
	const bg = getBackgroundForCard(open.stack, card);
	return [
		...handlerActions(card.script, "onCloseCard"),
		...handlerActions(bg?.script, "onCloseCard"),
	];
}

// ---------------------------------------------------------------------------
// Effects & suspensions
// ---------------------------------------------------------------------------

function nextToken(rt: HCRuntime): string {
	return `t${rt.seq++}`;
}

function pushFrame(rt: HCRuntime, body: EngineAction[]): void {
	rt.frames.push({ kind: "seq", body: body as HCAction[], ip: 0 });
}

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

function execAction(open: HCOpenStack, action: EngineAction): void {
	const rt = open.runtime;
	const ctx = makeEvalContext(open);

	switch (action.do) {
		case "go": {
			const target = resolveGoTarget(open, action.to);
			if (!target) break;
			const effect = rt.pendingVisual;
			rt.pendingVisual = undefined;
			const navSeq: EngineAction[] = [
				{ do: "@closeCard" },
				{ do: "@switchCard", to: target.toCardId, back: target.back },
				...(effect ? [{ do: "@transition", effect } as EngineAction] : []),
				{ do: "@openCard" },
			];
			pushFrame(rt, navSeq);
			break;
		}
		case "put":
			writeContainer(open, action, evaluate(action.value, ctx));
			break;
		case "add":
			writeContainer(
				open,
				action,
				readContainerNumber(open, action) + evaluateToNumber(action.value, ctx),
			);
			break;
		case "subtract":
			writeContainer(
				open,
				action,
				readContainerNumber(open, action) - evaluateToNumber(action.value, ctx),
			);
			break;
		case "multiply":
			writeContainer(
				open,
				action,
				readContainerNumber(open, action) * evaluateToNumber(action.value, ctx),
			);
			break;
		case "divide":
			writeContainer(
				open,
				action,
				readContainerNumber(open, action) / evaluateToNumber(action.value, ctx),
			);
			break;
		case "set": {
			const prop = action.property.toLowerCase();
			const val = evaluate(action.value, ctx);
			if (prop === "visible" || prop === "visibility") {
				if (action.part) open.partVisibility[action.part] = coerceBool(val);
			} else if (prop === "text" || prop === "content") {
				if (action.part) writeField(open, action.part, coerceString(val));
			}
			break;
		}
		case "show":
			open.partVisibility[action.part] = true;
			break;
		case "hide":
			open.partVisibility[action.part] = false;
			break;
		case "beep":
			rt.pendingEffects.push({ id: rt.seq++, kind: "beep" });
			break;
		case "play":
			rt.pendingEffects.push({
				id: rt.seq++,
				kind: "play",
				sound: action.sound,
			});
			break;
		case "openApp":
			rt.pendingEffects.push({
				id: rt.seq++,
				kind: "openApp",
				appId: action.app,
				event: action.event,
				data: action.data,
			});
			break;
		case "answer": {
			const token = nextToken(rt);
			rt.dialog = {
				kind: "answer",
				message: coerceString(evaluate(action.message, ctx)),
				buttons: action.buttons ?? ["OK"],
				token,
			};
			rt.status = "awaitingDialog";
			rt.resume = { token, container: containerOf(action) };
			break;
		}
		case "ask": {
			const token = nextToken(rt);
			rt.dialog = {
				kind: "ask",
				message: coerceString(evaluate(action.prompt, ctx)),
				defaultValue: action.default
					? coerceString(evaluate(action.default, ctx))
					: "",
				token,
			};
			rt.status = "awaitingDialog";
			rt.resume = { token, container: containerOf(action) };
			break;
		}
		case "visual":
			rt.pendingVisual = action.effect;
			break;
		case "wait": {
			const token = nextToken(rt);
			rt.wait = { ms: Math.max(0, action.ms), token };
			rt.status = "awaitingWait";
			rt.resume = { token };
			break;
		}
		case "if": {
			const branch = evaluateToBool(action.condition, ctx)
				? action.then
				: (action.else ?? []);
			pushFrame(rt, branch);
			break;
		}
		case "repeat": {
			const remaining =
				action.while !== undefined
					? Number.POSITIVE_INFINITY
					: Math.min(action.times ?? 0, REPEAT_CAP);
			rt.frames.push({
				kind: "repeat",
				body: action.body,
				ip: 0,
				remaining,
				while: action.while,
			});
			break;
		}
		// --- internal navigation actions ---
		case "@closeCard":
			pushFrame(rt, closeCardActions(open, open.currentCardId));
			break;
		case "@switchCard":
			doSwitch(open, action.to, action.back);
			break;
		case "@transition": {
			const token = nextToken(rt);
			rt.transition = {
				effect: action.effect,
				toCardId: open.currentCardId,
				token,
			};
			rt.status = "awaitingTransition";
			rt.resume = { token };
			break;
		}
		case "@openCard":
			pushFrame(rt, openCardActions(open, open.currentCardId));
			break;
		default: {
			// Unknown `do` → a plugin-registered command (registerHyperCardCommand).
			// `action` is exhaustive-`never` here per the closed union, but at
			// runtime a JSON stack can carry any command name, so cast.
			const pluginAction = action as unknown as HCCommandAction;
			const cmd = getHyperCardCommand(pluginAction.do);
			if (cmd) {
				cmd.run(makeCommandContext(open), pluginAction);
			} else if (process.env.NODE_ENV !== "production") {
				console.warn(`[HyperCard] Unknown command "${pluginAction.do}"`);
			}
			break;
		}
	}
}

/** Build the context a plugin command runs with, backed by the open stack. */
function makeCommandContext(open: HCOpenStack): HCCommandContext {
	const rt = open.runtime;
	return {
		getVar: (n) => open.variables[n],
		setVar: (n, v) => {
			open.variables[n] = v;
		},
		getField: (id) => readFieldValue(open, id),
		setField: (id, v) => writeField(open, id, v),
		evaluate: (expr) => evaluate(expr, makeEvalContext(open)),
		show: (partId, visible) => {
			open.partVisibility[partId] = visible;
		},
		go: (to) => pushFrame(rt, [{ do: "go", to }]),
		queueEffect: (name, args) => {
			rt.pendingEffects.push({
				id: rt.seq++,
				kind: "custom",
				name,
				args: args ?? {},
			});
		},
		await: (name, args, into) => {
			const token = nextToken(rt);
			rt.pendingEffects.push({
				id: rt.seq++,
				kind: "custom",
				name,
				args: args ?? {},
				token,
			});
			rt.status = "awaitingCustom";
			rt.resume = { token, container: into };
		},
	};
}

function containerOf(a: HCContainerRef): HCContainerRef | undefined {
	if (a.var) return { var: a.var };
	if (a.field) return { field: a.field };
	return undefined;
}

function resolveGoTarget(
	open: HCOpenStack,
	ref: string,
): { toCardId: string; back: boolean } | undefined {
	if (ref.trim().toLowerCase() === "back") {
		if (open.history.length === 0) return undefined;
		return { toCardId: open.history[open.history.length - 1], back: true };
	}
	const stack = open.stack;
	const idx = stack.cards.findIndex((c) => c.id === open.currentCardId);
	const n = stack.cards.length;
	let id: string | undefined;
	switch (ref.trim().toLowerCase()) {
		case "next":
			id = stack.cards[(idx + 1 + n) % n]?.id;
			break;
		case "prev":
		case "previous":
			id = stack.cards[(idx - 1 + n) % n]?.id;
			break;
		case "first":
			id = stack.cards[0]?.id;
			break;
		case "last":
			id = stack.cards[n - 1]?.id;
			break;
		default:
			id =
				stack.cards.find((c) => c.id === ref)?.id ??
				stack.cards.find((c) => c.name === ref)?.id;
	}
	if (!id) return undefined;
	return { toCardId: id, back: false };
}

function doSwitch(open: HCOpenStack, toId: string, back: boolean): void {
	const rt = open.runtime;
	rt.navDepth += 1;
	if (rt.navDepth > NAV_DEPTH_CAP) {
		abort(open);
		return;
	}
	if (back) {
		open.history.pop();
	} else {
		open.history.push(open.currentCardId);
		if (open.history.length > HISTORY_CAP) open.history.shift();
	}
	open.currentCardId = toId;
}

// ---------------------------------------------------------------------------
// The step machine + driver
// ---------------------------------------------------------------------------

function step(open: HCOpenStack): void {
	const rt = open.runtime;
	const top = rt.frames[rt.frames.length - 1];
	if (!top) {
		rt.status = "idle";
		return;
	}
	if (top.kind === "seq") {
		if (top.ip >= top.body.length) {
			rt.frames.pop();
			return;
		}
		execAction(open, top.body[top.ip++] as EngineAction);
		return;
	}
	// repeat
	if (top.while !== undefined) {
		if (!evaluateToBool(top.while, makeEvalContext(open))) {
			rt.frames.pop();
			return;
		}
	} else {
		if (top.remaining <= 0) {
			rt.frames.pop();
			return;
		}
		top.remaining -= 1;
	}
	rt.frames.push({ kind: "seq", body: top.body, ip: 0 });
}

/** Drive the interpreter until it drains or suspends. */
export function drive(open: HCOpenStack): void {
	const rt = open.runtime;
	while (rt.status === "running") {
		if (rt.steps++ > STEP_BUDGET) {
			abort(open);
			return;
		}
		if (rt.frames.length === 0) {
			rt.status = "idle";
			rt.navDepth = 0;
			return;
		}
		step(open);
	}
}

function abort(open: HCOpenStack): void {
	const rt = open.runtime;
	rt.frames = [];
	rt.status = "idle";
	rt.navDepth = 0;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Begin running an action list. Dropped (re-entrancy gate) if the interpreter
 * is already busy — HyperCard is modally blocking during ask/answer/wait.
 */
export function startRun(open: HCOpenStack, actions: EngineAction[]): void {
	const rt = open.runtime;
	if (rt.status !== "idle") return;
	rt.frames = [{ kind: "seq", body: actions as HCAction[], ip: 0 }];
	rt.status = "running";
	rt.steps = 0;
	rt.navDepth = 0;
	drive(open);
}

/** Run a stack's onOpenStack handler then the current card's onOpenCard. */
export function runStackOpen(open: HCOpenStack): void {
	const onOpen = open.stack.stackScript?.onOpenStack ?? [];
	startRun(open, [...onOpen, { do: "@openCard" }]);
}

/** Run the handler for an event on a specific part (e.g. a button's onMouseUp). */
export function runPartEvent(
	open: HCOpenStack,
	partId: string,
	event: keyof HCEventHandlers,
): void {
	const card = getCard(open.stack, open.currentCardId);
	if (!card) return;
	const found = findPart(open.stack, card, partId);
	if (!found) return;
	const actions = handlerActions(found.part.script, event);
	if (actions.length === 0) return;
	startRun(open, actions);
}

/** Resume a suspended `answer`/`ask` with the user's response. */
export function resumeDialog(
	open: HCOpenStack,
	result: string,
	token?: string,
): void {
	const rt = open.runtime;
	if (rt.status !== "awaitingDialog" || !rt.dialog) return;
	if (token !== undefined && rt.resume?.token !== token) return;
	const container = rt.resume?.container;
	open.variables.it = result;
	if (container) writeContainer(open, container, result);
	rt.dialog = undefined;
	rt.resume = undefined;
	rt.status = "running";
	drive(open);
}

/** Resume a suspended `wait` when its timer fires. */
export function resumeWait(open: HCOpenStack, token?: string): void {
	const rt = open.runtime;
	if (rt.status !== "awaitingWait") return;
	if (token !== undefined && rt.wait?.token !== token) return;
	rt.wait = undefined;
	rt.resume = undefined;
	rt.status = "running";
	drive(open);
}

/** Resume a suspended card transition when its animation completes. */
export function resumeTransition(open: HCOpenStack, token?: string): void {
	const rt = open.runtime;
	if (rt.status !== "awaitingTransition") return;
	if (token !== undefined && rt.transition?.token !== token) return;
	rt.transition = undefined;
	rt.resume = undefined;
	rt.status = "running";
	drive(open);
}

/** Resume a blocking plugin command (ctx.await) with the handler's result. */
export function resumeCustom(
	open: HCOpenStack,
	result: string,
	token?: string,
): void {
	const rt = open.runtime;
	if (rt.status !== "awaitingCustom") return;
	if (token !== undefined && rt.resume?.token !== token) return;
	const container = rt.resume?.container;
	open.variables.it = result;
	if (container) writeContainer(open, container, result);
	rt.resume = undefined;
	rt.status = "running";
	drive(open);
}

/** Remove consumed pending effects by id (idempotent). */
export function consumeEffects(open: HCOpenStack, ids: number[]): void {
	const set = new Set(ids);
	open.runtime.pendingEffects = open.runtime.pendingEffects.filter(
		(e) => !set.has(e.id),
	);
}
