import { type ComponentType, useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * One Control Strip module: a small button that pops up a menu of status and
 * commands (HIGOS8 Figure 6-15) or another surface such as a slider (Figure
 * 2-16). HIGOS8 p.125: a module belonging to a control panel should include a
 * command that opens that control panel.
 *
 * The function forms of `icon` and `menuItems`, and the `content` component,
 * run inside the Classicy providers — each module renders as its own
 * component — so they may call hooks (`useAppManager`, `useAppManagerDispatch`,
 * `useSound`, …). A function form is called as a hook: keep its hook calls
 * unconditional, like any hook.
 */
export type ClassicyControlStripModuleDefinition = {
	/** Global id. Built-in ids are in `CLASSICY_CONTROL_STRIP_MODULE_IDS`. */
	id: string;
	/**
	 * The app or extension that owns the module. When set, the module shows
	 * only while a `ClassicyApp` with this id is mounted, and only this owner
	 * may replace the registration. Omit it for a module that should show for
	 * as long as it is registered.
	 */
	appId?: string;
	/** Accessible name ("Sound"), also the module's name in the Control Strip control panel. */
	label: string;
	/** Module icon, drawn at 16 px; a hook form may change it with state. */
	icon: string | (() => string);
	/**
	 * The module file's 32 px icon in System Folder:Control Strip Modules.
	 * Defaults to the generic module file icon.
	 */
	fileIcon?: string;
	/**
	 * Position among the modules: lower comes first; ties keep registration
	 * order. Defaults to `CLASSICY_CONTROL_STRIP_DEFAULT_ORDER`. The user's
	 * own order from the Control Strip control panel overrides it.
	 */
	order?: number;
	/**
	 * The module's menu. A disabled item with the `classicyControlStripStatus`
	 * class renders as an italic status line, like Figure 6-15's
	 * "No Users Connected".
	 */
	menuItems?: ClassicyMenuItem[] | (() => ClassicyMenuItem[]);
	/** A surface other than a menu. Ignored when `menuItems` is set. */
	content?: ComponentType;
};

/** A registered module, as the strip and the control panel see it. */
export type ClassicyControlStripModuleRegistration = {
	readonly definition: ClassicyControlStripModuleDefinition;
	/** Registration order, kept when the owner replaces the module. */
	readonly sequence: number;
	/**
	 * Bumped on every replacement. The strip keys each module's component on
	 * it, so a replacement remounts it with a fresh set of hooks.
	 */
	readonly revision: number;
};

/** The ids of Classicy's own modules, for `controlStrip={{ disabledModules }}`. */
export const CLASSICY_CONTROL_STRIP_MODULE_IDS = {
	sound: "classicy-sound",
	screenSaver: "classicy-screen-saver",
} as const;

/** The order a module gets when it declares none: after the built-ins. */
export const CLASSICY_CONTROL_STRIP_DEFAULT_ORDER = 100;

const registry = new Map<string, ClassicyControlStripModuleRegistration>();
const listeners = new Set<() => void>();
let nextSequence = 0;
let snapshot: readonly ClassicyControlStripModuleRegistration[] = [];

const byDeclaredOrder = (
	a: ClassicyControlStripModuleRegistration,
	b: ClassicyControlStripModuleRegistration,
) =>
	(a.definition.order ?? CLASSICY_CONTROL_STRIP_DEFAULT_ORDER) -
		(b.definition.order ?? CLASSICY_CONTROL_STRIP_DEFAULT_ORDER) ||
	a.sequence - b.sequence;

const publish = () => {
	snapshot = Array.from(registry.values()).sort(byDeclaredOrder);
	for (const listener of listeners) listener();
};

/**
 * Add a module to the Control Strip. Call it at module scope, typically next
 * to the owning app's `registerApp` call; the strip updates live, so a later
 * registration (a lazily loaded extension) appears as soon as it is made.
 *
 * Re-registering an id with the same `appId` replaces the module in place
 * (like `registerClassicyScreenSaver`). Registering an id that a different
 * `appId` already owns is ignored with a warning. Returns the definition in
 * force afterwards.
 */
export function registerClassicyControlStripModule(
	definition: ClassicyControlStripModuleDefinition,
): ClassicyControlStripModuleDefinition {
	const existing = registry.get(definition.id);
	if (existing && existing.definition.appId !== definition.appId) {
		classicyLog(
			"warn",
			"ClassicyControlStrip",
			`Module "${definition.id}" is already registered by ${
				existing.definition.appId ?? "the host"
			}; ignoring the registration from ${definition.appId ?? "the host"}.`,
		);
		return existing.definition;
	}
	registry.set(definition.id, {
		definition,
		sequence: existing?.sequence ?? nextSequence++,
		revision: (existing?.revision ?? -1) + 1,
	});
	publish();
	return definition;
}

/** Remove a module. Returns whether one was registered under that id. */
export function unregisterClassicyControlStripModule(id: string): boolean {
	if (!registry.delete(id)) return false;
	publish();
	return true;
}

export const getClassicyControlStripModule = (
	id: string,
): ClassicyControlStripModuleDefinition | undefined =>
	registry.get(id)?.definition;

/** Every registered module, in declared order (`order`, then registration). */
export const listClassicyControlStripModules =
	(): ClassicyControlStripModuleDefinition[] =>
		snapshot.map((r) => r.definition);

export function subscribeClassicyControlStripModules(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Every registration in declared order; re-renders on any change. */
export const useClassicyControlStripRegistrations =
	(): readonly ClassicyControlStripModuleRegistration[] =>
		useSyncExternalStore(
			subscribeClassicyControlStripModules,
			() => snapshot,
			() => snapshot,
		);

// The mounted strip's `disabledModules`, published so the Control Strip
// control panel — which has no access to the strip's props — leaves them out.
// Runtime-only, like the registry itself.
let hostDisabledModules: readonly string[] = [];
const hostDisabledListeners = new Set<() => void>();

/**
 * Publish the host's disabled module ids. `ClassicyControlStrip` calls this
 * with its `disabledModules` prop while mounted, and clears it on unmount.
 */
export function setClassicyControlStripDisabledModules(
	ids: readonly string[],
): void {
	if (
		ids.length === hostDisabledModules.length &&
		ids.every((id, i) => id === hostDisabledModules[i])
	)
		return;
	hostDisabledModules = [...ids];
	for (const listener of hostDisabledListeners) listener();
}

const subscribeHostDisabledModules = (listener: () => void) => {
	hostDisabledListeners.add(listener);
	return () => {
		hostDisabledListeners.delete(listener);
	};
};

/** The mounted strip's host-disabled module ids. */
export const useClassicyControlStripDisabledModules = (): readonly string[] =>
	useSyncExternalStore(
		subscribeHostDisabledModules,
		() => hostDisabledModules,
		() => hostDisabledModules,
	);

export type ClassicyControlStripArrangement = {
	/** Host-disabled ids: never shown, and not offered to the user. */
	disabledModules?: readonly string[];
	/** User-hidden ids (persisted): offered in the control panel, not shown. */
	hiddenModules?: readonly string[];
	/** The user's order (persisted). Listed ids lead, in this order. */
	moduleOrder?: readonly string[];
	/** Mounted app ids; a module with an `appId` needs its app among them. */
	mountedApps: ReadonlySet<string>;
};

/**
 * The modules available to the user, in display order: registrations whose
 * owner is mounted and which the host has not disabled. Ids in `moduleOrder`
 * lead, in that order; the rest follow in declared order — so a module
 * registered after the user rearranged the strip joins at the end of its
 * declared position among the unlisted ones.
 *
 * User-hidden modules are kept (the control panel lists them); filter with
 * `hiddenModules` for what the strip draws.
 */
export function arrangeClassicyControlStripModules<
	T extends ClassicyControlStripModuleRegistration,
>(
	registrations: readonly T[],
	{
		disabledModules = [],
		moduleOrder = [],
		mountedApps,
	}: ClassicyControlStripArrangement,
): T[] {
	const available = registrations.filter(
		(r) =>
			!disabledModules.includes(r.definition.id) &&
			(r.definition.appId === undefined || mountedApps.has(r.definition.appId)),
	);
	const rank = (id: string) => {
		const index = moduleOrder.indexOf(id);
		return index === -1 ? Number.POSITIVE_INFINITY : index;
	};
	// Array.prototype.sort is stable, so unlisted modules keep declared order.
	return available
		.map((r, declared) => ({ r, declared }))
		.sort(
			(a, b) =>
				rank(a.r.definition.id) - rank(b.r.definition.id) ||
				a.declared - b.declared,
		)
		.map(({ r }) => r);
}

/**
 * The menu item that opens a module's control panel — HIGOS8 p.125: a module
 * belonging to a control panel must offer a way to open it (Figure 6-15's
 * "Open File Sharing Control Panel"). `dispatch` is `useAppManagerDispatch()`.
 */
export const classicyControlStripOpenControlPanelItem = (
	dispatch: (action: { type: string; [key: string]: unknown }) => void,
	panelName: string,
	app: { id: string; name: string; icon: string },
): ClassicyMenuItem => ({
	id: `open-${app.id}`,
	title: `Open ${panelName} Control Panel`,
	onClickFunc: () => dispatch({ type: "ClassicyAppOpen", app }),
});
