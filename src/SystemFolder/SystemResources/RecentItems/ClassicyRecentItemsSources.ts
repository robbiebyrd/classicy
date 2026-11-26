/**
 * Host sources of recent items: `registerClassicyRecentItemsSource({ id,
 * kind, list })` adds a host's own items (rt911's recently viewed pages, say)
 * to Recent Applications or Recent Documents, merged with the remembered ones
 * by time and capped at the same count. A source's items are the host's:
 * Classicy reads them when the Apple menu draws and never stores them.
 * Story 0226-a6f.
 */
import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyRecentItemKind } from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";

/** One item a source lists. */
export interface ClassicyRecentItemsSourceItem {
	/** Unique within the source; defaults to `path`, then `appId`, then `name`. */
	key?: string;
	/** The name the submenu shows. */
	name: string;
	/** When it was last used: a `Date` or milliseconds since the epoch. */
	at: number | Date;
	/** Choosing it opens this app (`ClassicyAppOpen`). */
	appId?: string;
	/** Choosing it opens this file-system path, as the Finder would. */
	path?: string;
	/** Choosing it calls this instead; it wins over `appId` and `path`. */
	open?: () => void;
}

/** A host's recent items for one list. */
export interface ClassicyRecentItemsSource {
	/** Unique; registering an id again replaces that source. */
	id: string;
	/** The list its items join. */
	kind: ClassicyRecentItemKind;
	/** The items now. Called whenever the Apple menu is drawn: keep it cheap. */
	list: () => readonly ClassicyRecentItemsSourceItem[];
	/**
	 * Optional: call `onChange` when the items change, so an Apple menu on
	 * screen redraws; return the unsubscribe. Without it the items are read
	 * again whenever the menu bar redraws.
	 */
	subscribe?: (onChange: () => void) => () => void;
}

/** A source's item as the Apple menu takes it. */
export interface ClassicyRecentItemsSourceEntry {
	kind: ClassicyRecentItemKind;
	sourceId: string;
	/** Unique within the source. */
	key: string;
	name: string;
	at: number;
	appId?: string;
	path?: string;
	open?: () => void;
}

interface Registration {
	source: ClassicyRecentItemsSource;
	unsubscribe?: () => void;
}

const registrations = new Map<string, Registration>();
const listeners = new Set<() => void>();
let revision = 0;
const warned = new Set<string>();

const publish = () => {
	revision += 1;
	for (const listener of listeners) listener();
};

const warnOnce = (sourceId: string, message: string, detail?: unknown) => {
	if (warned.has(`${sourceId}\u0000${message}`)) return;
	warned.add(`${sourceId}\u0000${message}`);
	classicyLog("warn", "ClassicyRecentItems", message, {
		source: sourceId,
		...(detail === undefined ? {} : { error: detail }),
	});
};

/** Stop listening to a source's changes; its own unsubscribe may throw. */
const release = (registration: Registration | undefined) => {
	try {
		registration?.unsubscribe?.();
	} catch (error) {
		warnOnce(registration?.source.id ?? "", "Source unsubscribe threw", error);
	}
};

/**
 * Remove the source `id`. Returns whether one was registered.
 */
export function unregisterClassicyRecentItemsSource(id: string): boolean {
	const registration = registrations.get(id);
	if (!registration) return false;
	registrations.delete(id);
	release(registration);
	publish();
	return true;
}

/**
 * Add a host's recent items to Recent Applications (`kind: "application"`)
 * or Recent Documents (`kind: "document"`). Call it at module scope or from
 * an effect; registering an `id` again replaces that source. Returns the
 * unregister.
 */
export function registerClassicyRecentItemsSource(
	source: ClassicyRecentItemsSource,
): () => void {
	if (
		!source ||
		typeof source.id !== "string" ||
		source.id === "" ||
		(source.kind !== "application" && source.kind !== "document") ||
		typeof source.list !== "function"
	) {
		classicyLog(
			"warn",
			"ClassicyRecentItems",
			"Ignoring a recent items source without an id, a kind (application or document) and a list function",
			{ id: source?.id },
		);
		return () => {};
	}
	release(registrations.get(source.id));
	const registration: Registration = { source };
	registrations.set(source.id, registration);
	if (typeof source.subscribe === "function") {
		try {
			const unsubscribe = source.subscribe(() => {
				if (registrations.get(source.id) === registration) publish();
			});
			if (typeof unsubscribe === "function") {
				registration.unsubscribe = unsubscribe;
			}
		} catch (error) {
			warnOnce(source.id, "Source subscribe threw", error);
		}
	}
	publish();
	return () => {
		if (registrations.get(source.id) === registration) {
			unregisterClassicyRecentItemsSource(source.id);
		}
	};
}

/** Every registered source, in registration order. */
export function listClassicyRecentItemsSources(): ClassicyRecentItemsSource[] {
	return [...registrations.values()].map((r) => r.source);
}

/** Be told when a source registers, unregisters or reports a change. */
export function subscribeClassicyRecentItemsSources(
	listener: () => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** A number that changes whenever the sources or their items change. */
export const useClassicyRecentItemsSourcesRevision = (): number =>
	useSyncExternalStore(
		subscribeClassicyRecentItemsSources,
		() => revision,
		() => revision,
	);

const toTime = (at: unknown): number | undefined => {
	const ms = at instanceof Date ? at.getTime() : at;
	return typeof ms === "number" && Number.isFinite(ms) ? ms : undefined;
};

/**
 * The items every source of `kind` lists now, checked: an item needs a name,
 * a time and something to open (`open`, `appId` or `path`); others are
 * skipped, and a source whose `list` throws or returns no array gives none,
 * each warned once per source.
 */
export function readClassicyRecentItemsSourceEntries(
	kind: ClassicyRecentItemKind,
): ClassicyRecentItemsSourceEntry[] {
	const entries: ClassicyRecentItemsSourceEntry[] = [];
	for (const { source } of registrations.values()) {
		if (source.kind !== kind) continue;
		let items: unknown;
		try {
			items = source.list();
		} catch (error) {
			warnOnce(source.id, "Source list threw; it gives no items", error);
			continue;
		}
		if (!Array.isArray(items)) {
			warnOnce(source.id, "Source list returned no array; it gives no items");
			continue;
		}
		for (const raw of items as ClassicyRecentItemsSourceItem[]) {
			const at = toTime(raw?.at);
			const name = typeof raw?.name === "string" ? raw.name : "";
			const open = typeof raw?.open === "function" ? raw.open : undefined;
			const appId =
				typeof raw?.appId === "string" && raw.appId !== ""
					? raw.appId
					: undefined;
			const path =
				typeof raw?.path === "string" && raw.path !== "" ? raw.path : undefined;
			if (at === undefined || name === "" || !(open || appId || path)) {
				warnOnce(
					source.id,
					"Skipping source items without a name, a time and an open, appId or path",
				);
				continue;
			}
			const key =
				typeof raw.key === "string" && raw.key !== ""
					? raw.key
					: (path ?? appId ?? name);
			entries.push({
				kind,
				sourceId: source.id,
				key,
				name,
				at,
				...(appId ? { appId } : {}),
				...(path ? { path } : {}),
				...(open ? { open } : {}),
			});
		}
	}
	return entries;
}

/** Tests: forget every source and warning. */
export function resetClassicyRecentItemsSourcesForTests(): void {
	for (const registration of registrations.values()) release(registration);
	registrations.clear();
	warned.clear();
	publish();
}
