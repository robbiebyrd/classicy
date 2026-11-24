/**
 * The Apple menu's Recent Applications and Recent Documents (Apple Menu
 * Options): what `ClassicyDesktopMenuBar` adds to the Apple menu.
 *
 * Reference (Mac OS 8.1, System 7.5.3 and Mac OS 8.5, observed on Infinite
 * Mac): each is an Apple Menu Items folder, so it sits among the Apple menu's
 * items in alphabetical order, with its folder icon; its submenu lists the
 * remembered items by name, alphabetically, with no icons; an empty one has
 * no submenu; with tracking off neither is in the menu. Choosing an item
 * opens it; one whose original is gone draws the Finder's alias alert.
 * Story 0226-a6f.
 */
import { useMemo, useRef } from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { isClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { openClassicyFileSystemPath } from "@/SystemFolder/SystemResources/File/ClassicyFileOpen";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	type ClassicyRecentItemKind,
	type ClassicyStoreRecentItems,
	classicyRecentItemKey,
	normalizeClassicyRecentItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
import {
	type ClassicyRecentItemsSourceEntry,
	readClassicyRecentItemsSourceEntries,
	useClassicyRecentItemsSourcesRevision,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItemsSources";

/** One item a Recent submenu lists: remembered, or a host source's. */
export interface ClassicyRecentMenuEntry {
	kind: ClassicyRecentItemKind;
	/** Unique within its list: a remembered item's key, or a source's. */
	key: string;
	/** The name it is listed by (a remembered app's internal name). */
	name: string;
	at: number;
	appId?: string;
	path?: string;
	open?: () => void;
	/** The host source it came from; absent for a remembered item. */
	sourceId?: string;
}

/** The Apple menu entry and the submenu title for each list. */
export const CLASSICY_RECENT_ITEMS_TITLES: Record<
	ClassicyRecentItemKind,
	string
> = {
	application: "Recent Applications",
	document: "Recent Documents",
};

/** A host item's key: its target's when it names one, so it meets a
 * remembered use of the same app or document, else its source's own. */
const sourceEntryKey = (entry: ClassicyRecentItemsSourceEntry): string => {
	if (entry.kind === "document" && entry.path) {
		return classicyRecentItemKey({ kind: "document", path: entry.path });
	}
	if (entry.kind === "application" && entry.appId) {
		return classicyRecentItemKey({ kind: "application", appId: entry.appId });
	}
	return `source:${entry.sourceId}:${entry.key}`;
};

/**
 * What the `kind` submenu lists: the remembered items and the host sources'
 * merged by time, one per app or document (the newest use wins), the newest
 * `counts[kind]` of them, in alphabetical order of `nameOf` (the name shown).
 * Nothing while tracking is off.
 */
export function classicyRecentMenuEntries(
	kind: ClassicyRecentItemKind,
	state: ClassicyStoreRecentItems,
	sourceEntries: readonly ClassicyRecentItemsSourceEntry[],
	nameOf: (entry: ClassicyRecentMenuEntry) => string = (e) => e.name,
): ClassicyRecentMenuEntry[] {
	if (!state.enabled) return [];
	const merged: ClassicyRecentMenuEntry[] = [
		...state.items
			.filter((item) => item.kind === kind)
			.map((item) => ({
				kind,
				key: classicyRecentItemKey(item),
				name: item.name,
				at: item.at,
				...(item.appId ? { appId: item.appId } : {}),
				...(item.path ? { path: item.path } : {}),
			})),
		...sourceEntries
			.filter((entry) => entry.kind === kind)
			.map((entry) => ({ ...entry, key: sourceEntryKey(entry) })),
	];
	const seen = new Set<string>();
	const newest = merged
		.map((entry, index) => ({ entry, index }))
		.sort((a, b) => b.entry.at - a.entry.at || a.index - b.index)
		.map(({ entry }) => entry)
		.filter((entry) => {
			if (seen.has(entry.key)) return false;
			seen.add(entry.key);
			return true;
		})
		.slice(0, state.counts[kind]);
	return newest
		.map((entry) => ({ ...entry, name: nameOf(entry) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The Apple menu's items with the Recent entries among them, in the Mac's
 * order: the items after the About section (its first divider) are listed
 * alphabetically, as the Mac listed its Apple Menu Items folder (HIG7 p.98:
 * "They appear in alphabetical order in the menu"; Recent Applications and
 * Recent Documents among them in System 7.5.3, Mac OS 8.1 and 8.5). The
 * Recent entries join the first group after that divider; a host's later
 * groups (set apart by dividers of their own) are each sorted on their own.
 * A menu with no divider keeps its order, the entries after it.
 */
export function withClassicyRecentItemsMenuItems(
	items: readonly ClassicyMenuItem[],
	recent: readonly ClassicyMenuItem[],
): ClassicyMenuItem[] {
	const divider = items.findIndex((item) => item.id === "spacer");
	if (divider < 0) return [...items, ...recent];
	const groups: ClassicyMenuItem[][] = [[]];
	for (const item of items.slice(divider + 1)) {
		if (item.id === "spacer") groups.push([]);
		else groups[groups.length - 1].push(item);
	}
	groups[0].push(...recent);
	const byTitle = (a: ClassicyMenuItem, b: ClassicyMenuItem) =>
		(a.title ?? "").localeCompare(b.title ?? "");
	return [
		...items.slice(0, divider + 1),
		...groups.flatMap((group, index) => [
			...(index > 0 ? [{ id: "spacer" }] : []),
			...[...group].sort(byTitle),
		]),
	];
}

const appRecord = (appId: string): ClassicyStoreSystemApp | undefined => {
	const apps = useAppManager.getState().System.Manager.Applications.apps;
	return Object.hasOwn(apps, appId) ? apps[appId] : undefined;
};

/**
 * The Apple menu's Recent Applications and Recent Documents entries, in that
 * order, or none while tracking is off. Each child item carries
 * `analyticsPrivate`, so its name never reaches an analytics payload.
 */
export function useClassicyRecentItemsMenuItems(): ClassicyMenuItem[] {
	const stored = useAppManager((s) => s.System.Manager.Desktop.recentItems);
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const overrides = useClassicyAppIdentityOverrides();
	const revision = useClassicyRecentItemsSourcesRevision();
	const applicationsIcon =
		useClassicyAsset("icons", "system.folders.applications") ?? "";
	const documentsIcon =
		useClassicyAsset("icons", "system.folders.recentDocuments") ?? "";
	const dispatch = useAppManagerDispatch();
	const getFileSystem = useClassicyFileSystemAccessor();

	const state = useMemo(() => normalizeClassicyRecentItems(stored), [stored]);

	// A source without `subscribe` is read on every render of the menu bar;
	// the entries are compared by value so the menu is rebuilt only when
	// what it lists changes.
	const entries: Record<ClassicyRecentItemKind, ClassicyRecentMenuEntry[]> = {
		application: classicyRecentMenuEntries(
			"application",
			state,
			state.enabled ? readClassicyRecentItemsSourceEntries("application") : [],
			(entry) =>
				entry.appId
					? classicyAppIdentityFrom(overrides, entry.appId, {
							name: Object.hasOwn(apps, entry.appId)
								? apps[entry.appId].name
								: entry.name,
							icon: "",
						}).name
					: entry.name,
		),
		document: classicyRecentMenuEntries(
			"document",
			state,
			state.enabled ? readClassicyRecentItemsSourceEntries("document") : [],
		),
	};
	// The latest entries, for the click handlers (a source's `open` may be a
	// new function on every read).
	const entriesRef = useRef(entries);
	entriesRef.current = entries;
	const signature = JSON.stringify(
		[entries.application, entries.document].map((list) =>
			list.map((e) => [e.key, e.name]),
		),
	);

	return useMemo(() => {
		// The entries are read through entriesRef (a source's `open` may be a
		// new function on every read); `signature` stands for them, and
		// `revision` for the sources.
		void signature;
		void revision;
		if (!state.enabled) return [];

		const missing = (entry: ClassicyRecentMenuEntry) =>
			dispatch({
				type: "ClassicyDesktopRecentItemsMissing",
				// What could not be opened: its path, else its application.
				...(entry.path
					? { kind: "document", path: entry.path }
					: { kind: "application", appId: entry.appId }),
				name: entry.name,
			});

		const openEntry = (kind: ClassicyRecentItemKind, key: string) => {
			const entry = entriesRef.current[kind].find((e) => e.key === key);
			if (!entry) return;
			if (entry.open) {
				try {
					entry.open();
				} catch (error) {
					classicyLog(
						"warn",
						"ClassicyRecentItems",
						"A recent items source's open threw",
						{ source: entry.sourceId, error },
					);
				}
				return;
			}
			if (entry.path) {
				if (!openClassicyFileSystemPath(getFileSystem(), entry.path, dispatch))
					missing(entry);
				return;
			}
			if (entry.appId) {
				const app = appRecord(entry.appId);
				if (!app || !isClassicyAppMounted(entry.appId)) {
					missing(entry);
					return;
				}
				dispatch({
					type: "ClassicyAppOpen",
					app: { id: app.id, name: app.name, icon: app.icon },
				});
			}
		};

		const entryFor = (
			kind: ClassicyRecentItemKind,
			image: string,
		): ClassicyMenuItem => {
			const list = entriesRef.current[kind];
			return {
				id: `apple-recent-${kind}s`,
				title: CLASSICY_RECENT_ITEMS_TITLES[kind],
				image,
				// Empty, it has no submenu; with no folder to open it is dimmed.
				...(list.length === 0
					? { disabled: true }
					: {
							menuChildren: list.map((entry, index) => ({
								id: `apple-recent-${kind}s-${index}`,
								title: entry.name,
								analyticsPrivate: true,
								onClickFunc: () => openEntry(kind, entry.key),
							})),
						}),
			};
		};

		return [
			entryFor("application", applicationsIcon),
			entryFor("document", documentsIcon),
		];
	}, [
		signature,
		revision,
		state.enabled,
		applicationsIcon,
		documentsIcon,
		dispatch,
		getFileSystem,
	]);
}
