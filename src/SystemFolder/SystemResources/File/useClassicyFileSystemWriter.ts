import { useCallback } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const MIME_BY_TYPE: Partial<Record<ClassicyFileSystemEntryFileType, string>> = {
	[ClassicyFileSystemEntryFileType.TextFile]: "text/plain",
	[ClassicyFileSystemEntryFileType.Markdown]: "text/markdown",
};

export type ClassicyFileWriter = {
	/**
	 * Writes `content` back into the existing file at `path`, stamping
	 * `_modifiedOn` with the current Classicy clock. Returns false when no file
	 * lives at that path.
	 */
	saveToPath: (path: string, content: string) => boolean;
	/**
	 * Creates (or overwrites) a file named `name` inside the folder at
	 * `parentPath` (empty string = file-system root). Returns the new file's full
	 * colon-joined path, or null when the name is invalid or the parent is not a
	 * folder.
	 */
	createFile: (
		parentPath: string,
		name: string,
		content: string,
		type: ClassicyFileSystemEntryFileType,
	) => string | null;
};

/**
 * File-system write helpers that keep every consumer in sync. Each call mutates
 * the passed ClassicyFileSystem in place, persists a snapshot to localStorage
 * (mirroring the pattern SimpleText's format toggle already used), and then
 * dispatches ClassicyAppFileSystemChanged so useClassicyFileSystem rebuilds
 * every component's instance from the fresh snapshot — without which a saved
 * file would remain invisible to the Finder and other apps.
 */
export function useClassicyFileSystemWriter(
	fs: ClassicyFileSystem,
): ClassicyFileWriter {
	const dispatch = useAppManagerDispatch();
	const dateTime = useAppManager(
		(state) => state.System.Manager.DateAndTime.dateTime,
	);

	const now = useCallback(() => {
		const parsed = new Date(dateTime);
		return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	}, [dateTime]);

	const persist = useCallback(() => {
		try {
			localStorage.setItem(fs.storageKey, fs.snapshot());
		} catch (e) {
			console.error(
				"[useClassicyFileSystemWriter] Failed to persist file system",
				e,
			);
		}
		dispatch({ type: "ClassicyAppFileSystemChanged" });
	}, [fs, dispatch]);

	const saveToPath = useCallback(
		(path: string, content: string): boolean => {
			const entry = fs.resolve(path) as ClassicyFileSystemEntry | undefined;
			if (!entry || typeof entry !== "object") {
				return false;
			}
			entry._data = content;
			entry._modifiedOn = now();
			persist();
			return true;
		},
		[fs, now, persist],
	);

	const createFile = useCallback(
		(
			parentPath: string,
			name: string,
			content: string,
			type: ClassicyFileSystemEntryFileType,
		): string | null => {
			const trimmed = name.trim();
			if (
				trimmed === "" ||
				trimmed.includes(fs.separator) ||
				RESERVED_KEYS.has(trimmed)
			) {
				return null;
			}

			const parent = (parentPath ? fs.resolve(parentPath) : fs.fs) as
				| ClassicyFileSystemEntry
				| undefined;
			if (!parent || typeof parent !== "object") {
				return null;
			}

			const timestamp = now();
			parent[trimmed] = {
				_type: type,
				_mimeType: MIME_BY_TYPE[type] ?? "text/plain",
				_data: content,
				_createdOn: timestamp,
				_modifiedOn: timestamp,
			} as ClassicyFileSystemEntry;

			persist();
			return parentPath ? `${parentPath}${fs.separator}${trimmed}` : trimmed;
		},
		[fs, now, persist],
	);

	return { saveToPath, createFile };
}
