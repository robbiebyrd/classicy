/**
 * Recent Items (Apple Menu Options, Mac OS 8; System 7.5 introduced it): the
 * applications and documents used most recently, remembered in the desktop
 * state (`System.Manager.Desktop.recentItems`) and listed by the Apple menu's
 * Recent Applications and Recent Documents submenus.
 *
 * Store-free and reducer-safe: the kernel calls `recordClassicyRecentApp`
 * from `openApp` (every launch: the Apple menu, a desktop icon, a document
 * that opens its app) and `recordClassicyRecentDocument` from the generic
 * OpenFile queue and Finder's open routing; the `ClassicyDesktopRecentItems*`
 * actions, routed here by the kernel, are the Apple Menu Options control
 * panel's. Story 0226-a6f.
 *
 * Reference (Mac OS 8.1 and System 7.5.3, observed on Infinite Mac): the
 * panel defaults to remembering 10 documents and 10 applications (each 0 to
 * 99); a use moves the item to the front of what is remembered, and the
 * oldest past the count is forgotten; turning tracking off removes the
 * submenus and forgets what they held.
 */
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { isClassicyControlPanelApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyControlPanelApps.internal";

/** The lists Recent Items keeps. (The Mac's Recent Servers has no Classicy counterpart.) */
export type ClassicyRecentItemKind = "application" | "document";

/** Every kind, in the Apple menu's order. */
export const CLASSICY_RECENT_ITEM_KINDS: readonly ClassicyRecentItemKind[] = [
	"application",
	"document",
];

/** One remembered use. */
export interface ClassicyRecentItem {
	kind: ClassicyRecentItemKind;
	/** The application's id (`kind: "application"`). */
	appId?: string;
	/** The document's file-system path (`kind: "document"`). */
	path?: string;
	/**
	 * The name it was remembered by: an application's internal name (an
	 * Appearance Package's display name is applied when the menu draws it),
	 * a document's file name when it was opened.
	 */
	name: string;
	/** When it was last used, in milliseconds since the epoch. */
	at: number;
}

/** `System.Manager.Desktop.recentItems`, persisted with the desktop. */
export interface ClassicyStoreRecentItems {
	/** "Remember recently used items". */
	enabled: boolean;
	/** How many of each kind are remembered, 0 to 99. */
	counts: Record<ClassicyRecentItemKind, number>;
	/** Most recent first, at most `counts[kind]` of each kind. */
	items: ClassicyRecentItem[];
}

/** Apple Menu Options' default for each count (Mac OS 8.1, System 7.5.3). */
export const CLASSICY_RECENT_ITEMS_DEFAULT_COUNT = 10;
/** The largest count its two-digit fields hold (999 typed is stored as 99). */
export const CLASSICY_RECENT_ITEMS_MAX_COUNT = 99;

/** Recent Items as a first session has it: on, 10 of each, nothing yet. */
export const defaultClassicyRecentItemsState =
	(): ClassicyStoreRecentItems => ({
		enabled: true,
		counts: {
			application: CLASSICY_RECENT_ITEMS_DEFAULT_COUNT,
			document: CLASSICY_RECENT_ITEMS_DEFAULT_COUNT,
		},
		items: [],
	});

const isKind = (value: unknown): value is ClassicyRecentItemKind =>
	value === "application" || value === "document";

/** A count as stored: a whole number from 0 to 99, or `fallback`. */
export const clampClassicyRecentItemsCount = (
	value: unknown,
	fallback = CLASSICY_RECENT_ITEMS_DEFAULT_COUNT,
): number => {
	const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
	if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
	return Math.min(CLASSICY_RECENT_ITEMS_MAX_COUNT, Math.max(0, Math.trunc(n)));
};

/** What the item stands for, unique per kind: its app id or its path. */
export const classicyRecentItemTarget = (
	item: Pick<ClassicyRecentItem, "kind" | "appId" | "path">,
): string | undefined => (item.kind === "application" ? item.appId : item.path);

/** The item's identity within the lists: its kind and its target. */
export const classicyRecentItemKey = (
	item: Pick<ClassicyRecentItem, "kind" | "appId" | "path">,
): string => `${item.kind}:${classicyRecentItemTarget(item) ?? ""}`;

/** `value` as a remembered item, or undefined when it is not one. */
export const toClassicyRecentItem = (
	value: unknown,
): ClassicyRecentItem | undefined => {
	if (!value || typeof value !== "object") return undefined;
	const raw = value as Record<string, unknown>;
	if (!isKind(raw.kind)) return undefined;
	const target = raw.kind === "application" ? raw.appId : raw.path;
	if (typeof target !== "string" || target === "") return undefined;
	if (typeof raw.name !== "string" || raw.name === "") return undefined;
	if (typeof raw.at !== "number" || !Number.isFinite(raw.at)) return undefined;
	return raw.kind === "application"
		? { kind: "application", appId: target, name: raw.name, at: raw.at }
		: { kind: "document", path: target, name: raw.name, at: raw.at };
};

/**
 * `items` most recent first, one per key (the newest use wins), at most
 * `counts[kind]` of each kind. Equal times keep their given order.
 */
export const capClassicyRecentItems = (
	items: readonly ClassicyRecentItem[],
	counts: Record<ClassicyRecentItemKind, number>,
): ClassicyRecentItem[] => {
	const seen = new Set<string>();
	const kept: Record<ClassicyRecentItemKind, number> = {
		application: 0,
		document: 0,
	};
	const ordered = items
		.map((item, index) => ({ item, index }))
		.sort((a, b) => b.item.at - a.item.at || a.index - b.index)
		.map(({ item }) => item);
	const result: ClassicyRecentItem[] = [];
	for (const item of ordered) {
		const key = classicyRecentItemKey(item);
		if (seen.has(key)) continue;
		seen.add(key);
		if (kept[item.kind] >= counts[item.kind]) continue;
		kept[item.kind] += 1;
		result.push(item);
	}
	return result;
};

/**
 * `value` (the stored `recentItems`, from any build or none) as a valid
 * state: defaults for what is missing or malformed, counts clamped, items
 * that are not items dropped, and the rest capped.
 */
export const normalizeClassicyRecentItems = (
	value: unknown,
): ClassicyStoreRecentItems => {
	const defaults = defaultClassicyRecentItemsState();
	if (!value || typeof value !== "object") return defaults;
	const raw = value as Record<string, unknown>;
	const rawCounts =
		raw.counts && typeof raw.counts === "object"
			? (raw.counts as Record<string, unknown>)
			: {};
	const counts = {
		application: clampClassicyRecentItemsCount(rawCounts.application),
		document: clampClassicyRecentItemsCount(rawCounts.document),
	};
	const enabled =
		typeof raw.enabled === "boolean" ? raw.enabled : defaults.enabled;
	const items = Array.isArray(raw.items)
		? raw.items.flatMap((entry) => {
				const item = toClassicyRecentItem(entry);
				return item ? [item] : [];
			})
		: [];
	return {
		enabled,
		counts,
		items: enabled ? capClassicyRecentItems(items, counts) : [],
	};
};

/** The store's Recent Items, normalized (a hand-built store may have none). */
export const classicyRecentItemsOf = (
	ds: ClassicyStore,
): ClassicyStoreRecentItems =>
	normalizeClassicyRecentItems(ds.System?.Manager?.Desktop?.recentItems);

/** Write Recent Items; a store built by hand with no desktop slice keeps none. */
const writeRecentItems = (
	ds: ClassicyStore,
	next: ClassicyStoreRecentItems,
): ClassicyStore => {
	const desktop = ds.System?.Manager?.Desktop;
	if (desktop) desktop.recentItems = next;
	return ds;
};

/**
 * Remember a use of `item`: it moves to the front of its list, and the
 * oldest past the list's count is forgotten. Nothing is remembered while
 * tracking is off.
 */
export function recordClassicyRecentItem(
	ds: ClassicyStore,
	item: ClassicyRecentItem,
): ClassicyStore {
	const valid = toClassicyRecentItem(item);
	if (!valid) return ds;
	const state = classicyRecentItemsOf(ds);
	if (!state.enabled) return ds;
	const key = classicyRecentItemKey(valid);
	return writeRecentItems(ds, {
		...state,
		items: capClassicyRecentItems(
			[valid, ...state.items.filter((i) => classicyRecentItemKey(i) !== key)],
			state.counts,
		),
	});
}

/** The Finder, always running, is never a recent application. */
const FINDER_APP_ID = "Finder.app";

/**
 * Remember that the app `appId` was opened. Only an app the store knows is
 * remembered, by its internal name: never the Finder, an extension, or an
 * app whose manifest marks it a control panel (`registerApp({ controlPanel:
 * true })`): Apple Menu Options remembered applications, and a control panel
 * opened from the Apple menu was not added (Mac OS 8.1).
 */
export function recordClassicyRecentApp(
	ds: ClassicyStore,
	appId: string,
): ClassicyStore {
	if (appId === FINDER_APP_ID) return ds;
	const apps = ds.System.Manager.Applications.apps;
	if (!Object.hasOwn(apps, appId)) return ds;
	const app = apps[appId];
	if (!app || app.extension) return ds;
	if (isClassicyControlPanelApp(appId)) return ds;
	return recordClassicyRecentItem(ds, {
		kind: "application",
		appId,
		name: app.name,
		at: Date.now(),
	});
}

/** The file name a Classicy path ends with (`:` separates its parts). */
export const classicyRecentDocumentName = (path: string): string =>
	path
		.split(":")
		.filter((part) => part !== "")
		.pop() ?? path;

/** Remember that the document at `path` was opened. */
export function recordClassicyRecentDocument(
	ds: ClassicyStore,
	path: string,
): ClassicyStore {
	if (typeof path !== "string" || path === "") return ds;
	return recordClassicyRecentItem(ds, {
		kind: "document",
		path,
		name: classicyRecentDocumentName(path),
		at: Date.now(),
	});
}

/** Forget one item (its kind and app id or path). */
export function forgetClassicyRecentItem(
	ds: ClassicyStore,
	item: Pick<ClassicyRecentItem, "kind" | "appId" | "path">,
): ClassicyStore {
	const state = classicyRecentItemsOf(ds);
	const key = classicyRecentItemKey(item);
	if (!state.items.some((i) => classicyRecentItemKey(i) === key)) return ds;
	return writeRecentItems(ds, {
		...state,
		items: state.items.filter((i) => classicyRecentItemKey(i) !== key),
	});
}

/**
 * Follow documents moved by the Finder (`ClassicyAppFinderPathsMoved`), as
 * the Mac's Recent Documents aliases did (the Alias Manager finds a target
 * that was moved or renamed on its volume): a moved document, or one inside
 * a moved folder, keeps its place under its new path.
 */
export function followClassicyRecentDocumentMoves(
	ds: ClassicyStore,
	moves: readonly { from: string; to: string }[],
): ClassicyStore {
	if (moves.length === 0) return ds;
	const state = classicyRecentItemsOf(ds);
	let changed = false;
	const items = state.items.map((item) => {
		if (item.kind !== "document" || !item.path) return item;
		for (const { from, to } of moves) {
			if (item.path === from || item.path.startsWith(`${from}:`)) {
				changed = true;
				return { ...item, path: to + item.path.slice(from.length) };
			}
		}
		return item;
	});
	if (!changed) return ds;
	return writeRecentItems(ds, {
		...state,
		items: capClassicyRecentItems(items, state.counts),
	});
}

/**
 * The alert for a remembered item that cannot be opened: the Finder's, word
 * for word, since a Recent Items entry was an alias (Mac OS 8.1).
 */
export const classicyRecentItemMissingMessage = (name: string): string =>
	`The alias “${name}” could not be opened, because the original item could not be found.`;

const hasKindAndTarget = (
	action: Record<string, unknown>,
): action is Record<string, unknown> & {
	kind: ClassicyRecentItemKind;
	appId?: string;
	path?: string;
} =>
	isKind(action.kind) &&
	typeof (action.kind === "application" ? action.appId : action.path) ===
		"string";

/**
 * The `ClassicyDesktopRecentItems*` actions (the Apple Menu Options control
 * panel and the Apple menu), routed here by the kernel ahead of the other
 * `ClassicyDesktop*` actions:
 *
 * - `ClassicyDesktopRecentItemsSetEnabled { enabled }`: turning tracking off
 *   forgets every item, as the Mac emptied its Recent folders.
 * - `ClassicyDesktopRecentItemsSetCount { kind, count }`: clamped to 0–99;
 *   items past the new count are forgotten.
 * - `ClassicyDesktopRecentItemsForget { kind, appId | path }`.
 * - `ClassicyDesktopRecentItemsMissing { kind, appId | path, name? }`: an item
 *   chosen in the Apple menu that cannot be opened: the Finder's alert, and
 *   the item is forgotten. The alert names it by `name`, the name the menu
 *   showed (an app's display name), else by the name it was remembered by.
 */
export const classicyRecentItemsEventHandler = (
	ds: ClassicyStore,
	action: Record<string, unknown> & { type: string },
): ClassicyStore => {
	switch (action.type) {
		case "ClassicyDesktopRecentItemsSetEnabled": {
			if (typeof action.enabled !== "boolean") break;
			const state = classicyRecentItemsOf(ds);
			return writeRecentItems(ds, {
				...state,
				enabled: action.enabled,
				items: action.enabled ? state.items : [],
			});
		}
		case "ClassicyDesktopRecentItemsSetCount": {
			if (!isKind(action.kind)) break;
			const state = classicyRecentItemsOf(ds);
			const count = clampClassicyRecentItemsCount(
				action.count,
				state.counts[action.kind],
			);
			const counts = { ...state.counts, [action.kind]: count };
			return writeRecentItems(ds, {
				...state,
				counts,
				items: capClassicyRecentItems(state.items, counts),
			});
		}
		case "ClassicyDesktopRecentItemsForget": {
			if (!hasKindAndTarget(action)) break;
			return forgetClassicyRecentItem(ds, action);
		}
		case "ClassicyDesktopRecentItemsMissing": {
			if (!hasKindAndTarget(action)) break;
			const key = classicyRecentItemKey(action);
			const stored = classicyRecentItemsOf(ds).items.find(
				(i) => classicyRecentItemKey(i) === key,
			);
			const name =
				typeof action.name === "string" && action.name !== ""
					? action.name
					: stored?.name;
			ds = forgetClassicyRecentItem(ds, action);
			if (name && ds.System?.Manager?.Desktop) {
				ds.System.Manager.Desktop.errorDialog = {
					message: classicyRecentItemMissingMessage(name),
				};
			}
			return ds;
		}
	}
	return ds;
};
