/**
 * HyperCard plugin API — lets a host application (e.g. an external app that
 * consumes Classicy as a library) extend the HyperCard player with its own
 * display and logic without Classicy depending on that app.
 *
 * Four decoupled registries, mirroring the library's existing extension pattern
 * (`registerClassicyIcons`, `registerAppEventHandler`): register at app entry,
 * before rendering. Stacks reference plugins by name in their JSON.
 *
 *   - registerHyperCardPart(type, Component)          custom display parts
 *   - registerHyperCardCommand(name, { run })          custom logic (sync or blocking)
 *   - registerHyperCardEffectHandler(name, handler)    async side-effects (fetch, play, …)
 *   - registerHyperCardStack(id, name, stack)          add a stack to File → Open
 */

import type { FC } from "react";
import type { HCEvalValue } from "@/SystemFolder/HyperCard/HyperCardExpression";
import type {
	HCContainerRef,
	HCEventName,
	HCPart,
	HCStack,
	HCValue,
} from "@/SystemFolder/HyperCard/HyperCardModel";

// ---------------------------------------------------------------------------
// Custom parts (display + interactive)
// ---------------------------------------------------------------------------

/** Props every registered HyperCard part component receives. */
export interface HyperCardPartProps {
	/** The authored part definition (id, rect, options, …). */
	part: HCPart;
	partId: string;
	stackId: string;
	/** `part.options` — static "settings" applied to the embed. */
	options: Record<string, unknown>;
	/** `part.locked` — e.g. lock a map's pan/zoom controls. */
	locked: boolean;
	/** Current value in this part's field slot. */
	value: string;
	/** Commit a value back into this part's field slot (readable by scripts). */
	setValue: (value: string) => void;
	/** Trigger this part's own script (default `onMouseUp`). */
	fire: (event?: HCEventName) => void;
	/** Read a stack variable. */
	getVariable: (name: string) => HCValue | undefined;
	/** Evaluate a HyperCard expression against the current stack state. */
	resolve: (expr: string) => string;
}

export type HyperCardPartComponent = FC<HyperCardPartProps>;

// ---------------------------------------------------------------------------
// Custom commands (logic) — sync + blocking
// ---------------------------------------------------------------------------

/**
 * The context a command handler runs with, inside the pure reducer. Pure
 * commands mutate via get/set; async commands call `await(...)` to suspend the
 * stack until a matching effect handler resolves.
 */
export interface HCCommandContext {
	getVar: (name: string) => HCValue | undefined;
	setVar: (name: string, value: HCValue) => void;
	getField: (partId: string) => string | undefined;
	setField: (partId: string, value: string) => void;
	evaluate: (expr: string) => HCEvalValue;
	show: (partId: string, visible: boolean) => void;
	go: (to: string) => void;
	/** Queue a fire-and-forget custom effect for the component to handle async. */
	queueEffect: (name: string, args?: Record<string, unknown>) => void;
	/**
	 * Suspend the stack and queue a custom effect; the matching effect handler
	 * must call `api.resolve(value)` to bind the result (to `it` and the optional
	 * container) and resume execution — the same mechanism as `ask`/`answer`.
	 */
	await: (
		name: string,
		args?: Record<string, unknown>,
		into?: HCContainerRef,
	) => void;
}

/** An action object dispatched to a command handler (`do` is the command name). */
export type HCCommandAction = { do: string } & Record<string, unknown>;

export interface HCCommandSpec {
	run: (ctx: HCCommandContext, action: HCCommandAction) => void;
}

// ---------------------------------------------------------------------------
// Custom effect handlers (component-side, async)
// ---------------------------------------------------------------------------

export interface HyperCardEffectApi {
	/** Resume a blocking command with a result (no-op for fire-and-forget). */
	resolve: (value: string) => void;
	setField: (partId: string, value: string) => void;
	setVariable: (name: string, value: HCValue) => void;
	stackId: string;
}

export type HyperCardEffectHandler = (
	args: Record<string, unknown>,
	api: HyperCardEffectApi,
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

const partRegistry = new Map<string, HyperCardPartComponent>();
const commandRegistry = new Map<string, HCCommandSpec>();
const effectRegistry = new Map<string, HyperCardEffectHandler>();
const stackRegistry = new Map<
	string,
	{ id: string; name: string; stack: HCStack }
>();

/** Register a custom display part rendered by its `type` name. */
export function registerHyperCardPart(
	type: string,
	component: HyperCardPartComponent,
): void {
	partRegistry.set(type, component);
}

export function getHyperCardPart(
	type: string,
): HyperCardPartComponent | undefined {
	return partRegistry.get(type);
}

/** Register a custom command (a stack action with `do: name`). */
export function registerHyperCardCommand(
	name: string,
	spec: HCCommandSpec,
): void {
	commandRegistry.set(name, spec);
}

export function getHyperCardCommand(name: string): HCCommandSpec | undefined {
	return commandRegistry.get(name);
}

/** Register a component-side async handler for a custom effect. */
export function registerHyperCardEffectHandler(
	name: string,
	handler: HyperCardEffectHandler,
): void {
	effectRegistry.set(name, handler);
}

export function getHyperCardEffectHandler(
	name: string,
): HyperCardEffectHandler | undefined {
	return effectRegistry.get(name);
}

/** Register a stack so it appears in HyperCard's File → Open menu. */
export function registerHyperCardStack(
	id: string,
	name: string,
	stack: HCStack,
): void {
	stackRegistry.set(id, { id, name, stack });
}

export function getRegisteredStacks(): {
	id: string;
	name: string;
	stack: HCStack;
}[] {
	return Array.from(stackRegistry.values());
}
