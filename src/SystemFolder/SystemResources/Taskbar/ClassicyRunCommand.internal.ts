import {
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type {
	ActionMessage,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { classicyStartupDisk } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { runClassicyWindowCommand } from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * What the Windows shell's Run dialog opens (plan 0020-w98 E2; Windows 98
 * SE's shell32 Run dialog, `RunFileDlg`, which hands the text to
 * `ShellExecuteEx`): an http(s) URL, a file or folder by its path, or a
 * program by its name. Internal: not exported from the package.
 */

/** The Finder's app id: running it opens a window, as `explorer` does. */
export const CLASSICY_RUN_FINDER_APP_ID = "Finder.app";

/** What a Run command names. */
export type ClassicyRunTarget =
	/** An http(s) URL, opened through `ClassicyDesktopOpenUrl`. */
	| { kind: "url"; url: string }
	/** A folder or a drive, by its path: a Finder window on it. */
	| { kind: "folder"; path: string }
	/** A file, by its path, opened through Finder's open. */
	| { kind: "file"; path: string }
	/** A program, opened with its internal identity (`ClassicyAppOpen`). */
	| { kind: "app"; app: { id: string; name: string; icon: string } }
	/** Nothing it names exists: Windows' "Cannot find the file" message. */
	| { kind: "missing"; name: string };

export type ClassicyRunCommandContext = {
	/** The store's apps (`System.Manager.Applications.apps`). */
	apps: Readonly<Record<string, ClassicyStoreSystemApp>>;
	/** The apps mounted now (`useClassicyMountedApps`, `isClassicyAppMounted`). */
	isMounted: (appId: string) => boolean;
	/** The active package's display overrides, so a program runs by the name shown. */
	overrides: ClassicyAppIdentityOverrides;
	/** The file system, whose paths the command may name. */
	fs: ClassicyFileSystem;
};

/** The folder kinds a path may name: a Finder window opens on each. */
const FOLDER_TYPES: ReadonlySet<string> = new Set([
	ClassicyFileSystemEntryFileType.Directory,
	ClassicyFileSystemEntryFileType.Drive,
]);

/**
 * The text as `ShellExecute` takes it: trimmed, and unquoted when the whole
 * of it is in double quotes (a path typed with spaces, `"Macintosh HD:My
 * Folder"`).
 */
export const classicyRunCommandText = (command: string): string => {
	const trimmed = command.trim();
	return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
		? trimmed.slice(1, -1).trim()
		: trimmed;
};

/** Whether `text` is an absolute http(s) URL (a relative one is a path here). */
const isHttpUrl = (text: string): boolean => {
	if (!/^https?:\/\//i.test(text)) return false;
	try {
		const url = new URL(text);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

/** An entry key that names an item (not a metadata field). */
const isItemKey = (key: string): boolean => !key.startsWith("_");

/**
 * The canonical path of the item `segments` name, walked case-insensitively
 * as Windows' file system is, an exact name winning over one that differs in
 * case; undefined when a segment names nothing.
 */
const resolveSegments = (
	fs: ClassicyFileSystem,
	segments: readonly string[],
): { path: string; type: string } | undefined => {
	let node: unknown = fs.fs;
	const names: string[] = [];
	for (const segment of segments) {
		if (!node || typeof node !== "object") return undefined;
		const entries = node as Record<string, unknown>;
		let key: string | undefined;
		if (isItemKey(segment) && Object.hasOwn(entries, segment)) key = segment;
		else {
			const lower = segment.toLocaleLowerCase();
			key = Object.keys(entries).find(
				(name) => isItemKey(name) && name.toLocaleLowerCase() === lower,
			);
		}
		if (key === undefined) return undefined;
		const next = entries[key];
		if (!next || typeof next !== "object" || !("_type" in next))
			return undefined;
		names.push(key);
		node = next;
	}
	if (names.length === 0) return undefined;
	return {
		path: names.join(fs.separator),
		type: String((node as { _type: unknown })._type),
	};
};

/** The path `text` names, split on the file system's separator or Windows' `\`. */
const resolvePath = (fs: ClassicyFileSystem, text: string) => {
	const segments = text
		.split(fs.separator)
		.flatMap((part) => part.split("\\"))
		.filter((part) => part !== "");
	return segments.length > 0 ? resolveSegments(fs, segments) : undefined;
};

/** A program `text` names: its id (with or without `.app`), its name or the name shown. */
const resolveApp = (
	text: string,
	{ apps, isMounted, overrides }: ClassicyRunCommandContext,
): ClassicyStoreSystemApp | undefined => {
	const lower = text.toLocaleLowerCase();
	const candidates = Object.values(apps).filter(
		(app) =>
			app &&
			typeof app.id === "string" &&
			app.extension !== true &&
			isMounted(app.id),
	);
	const named = (name: (app: ClassicyStoreSystemApp) => string | undefined) =>
		candidates.find((app) => name(app)?.toLocaleLowerCase() === lower);
	return (
		named((app) => app.id) ??
		named((app) => app.id.replace(/\.app$/i, "")) ??
		named((app) => app.name) ??
		named(
			(app) =>
				classicyAppIdentityFrom(overrides, app.id, {
					name: app.name,
					icon: app.icon,
				}).name,
		)
	);
};

/**
 * What `command` opens, in `ShellExecute`'s order: an http(s) URL; a path
 * (one with a separator first, as a path is what it names); a program by its
 * id or name (the internal one or the one the active package shows); a bare
 * name at the root of the tree (a drive, the Trash). Anything else is
 * `missing`. Pure.
 */
export const classicyResolveRunCommand = (
	command: string,
	context: ClassicyRunCommandContext,
): ClassicyRunTarget => {
	const text = classicyRunCommandText(command);
	if (text === "") return { kind: "missing", name: text };
	if (isHttpUrl(text)) return { kind: "url", url: text };
	const { fs } = context;
	const hasSeparator = text.includes(fs.separator) || text.includes("\\");
	const asPath = () => {
		const entry = resolvePath(fs, text);
		if (!entry) return undefined;
		return FOLDER_TYPES.has(entry.type)
			? ({ kind: "folder", path: entry.path } as const)
			: ({ kind: "file", path: entry.path } as const);
	};
	if (hasSeparator) return asPath() ?? { kind: "missing", name: text };
	const app = resolveApp(text, context);
	if (app)
		return {
			kind: "app",
			app: { id: app.id, name: app.name, icon: app.icon },
		};
	return asPath() ?? { kind: "missing", name: text };
};

/**
 * Brings a Finder window on `path` forward, restoring it when minimized, or,
 * with none open, opens one (Finder's folder windows open from its
 * `openPaths`), as Windows' Explorer does for a folder already open.
 */
export const openClassicyFolderWindow = (
	path: string,
	dispatch: (action: ActionMessage) => void,
): void => {
	const finder =
		useAppManager.getState().System.Manager.Applications.apps[
			CLASSICY_RUN_FINDER_APP_ID
		];
	const record = getAppWindow(finder, path);
	if (record && !record.closed)
		runClassicyWindowCommand(CLASSICY_RUN_FINDER_APP_ID, path, {
			type: record.collapsed ? "restore" : "activate",
		});
	else dispatch({ type: "ClassicyAppFinderOpenFolder", path });
};

/**
 * Opens what a Run command resolved to: a URL through
 * `ClassicyDesktopOpenUrl`, a folder in a Finder window
 * (`openClassicyFolderWindow`), a file through Finder's open
 * (`ClassicyAppFinderOpenFile`, which lists it under Start ▸ Documents), a
 * program through `ClassicyAppOpen`, the Finder itself by a window on the
 * startup disk, as `explorer` opens one. Returns false for `missing`, which
 * opens nothing.
 */
export const runClassicyRunTarget = (
	target: ClassicyRunTarget,
	fs: ClassicyFileSystem,
	dispatch: (action: ActionMessage) => void,
): boolean => {
	switch (target.kind) {
		case "url":
			dispatch({ type: "ClassicyDesktopOpenUrl", url: target.url });
			return true;
		case "folder":
			openClassicyFolderWindow(target.path, dispatch);
			return true;
		case "file":
			dispatch({
				type: "ClassicyAppFinderOpenFile",
				file: fs.resolve(target.path),
				path: target.path,
			});
			return true;
		case "app": {
			if (target.app.id === CLASSICY_RUN_FINDER_APP_ID) {
				const disk = classicyStartupDisk(fs);
				if (disk) {
					openClassicyFolderWindow(disk, dispatch);
					return true;
				}
			}
			dispatch({ type: "ClassicyAppOpen", app: target.app });
			return true;
		}
		case "missing":
			return false;
	}
};

/**
 * Windows' message when a Run command names nothing (shell32's string 8449,
 * Windows 98 SE), its caption the name typed.
 */
export const classicyRunMissingMessage = (name: string): string =>
	`Cannot find the file '${name}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.`;
