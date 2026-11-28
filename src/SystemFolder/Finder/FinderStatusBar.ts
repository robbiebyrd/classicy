import { useEffect, useState } from "react";
import { classicyFormatByteSize } from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Explorer's status bar in a folder window (Windows 98 SE's defview, under a
 * package's `layout.finder.commands` "windows"; WIG Ch.7 "Status Bars",
 * p.96): its three parts, from shell32.dll's strings.
 *
 * - The objects: with nothing selected, "%s object(s)" (6467), or "%s
 *   object(s) (plus %s hidden)" (6466) while hidden items are left out; with
 *   a selection, "%s object(s) selected" (6468).
 * - Their size: with nothing selected, the folder's files' (its folders
 *   count nothing, as Explorer added no folder's contents); with a
 *   selection, the selected files'; as StrFormatByteSize writes it
 *   (`classicyFormatByteSize`), empty while it is being measured.
 * - The zone, "My Computer": every Classicy folder is on the computer, the
 *   zone Internet Explorer named local files.
 */
export type ClassicyExplorerStatus = {
	objects: string;
	size: string;
	zone: string;
};

/** The zone part's text (the Local Machine zone's name). */
export const CLASSICY_EXPLORER_STATUS_ZONE = "My Computer";

/** The objects part's text. */
export const classicyExplorerStatusObjects = (
	count: number,
	hidden: number,
	selected: number,
): string =>
	selected > 0
		? `${selected} object(s) selected`
		: hidden > 0
			? `${count} object(s) (plus ${hidden} hidden)`
			: `${count} object(s)`;

/** A size part's text: empty while unknown or not measurable. */
export const classicyExplorerStatusSize = (
	bytes: number | undefined,
): string =>
	bytes === undefined || bytes < 0 ? "" : classicyFormatByteSize(bytes);

/** The files a size part adds up: the selection's, else the folder's own. */
export const classicyExplorerStatusFiles = (
	fs: ClassicyFileSystem,
	folder: string,
	selected: readonly string[],
): string[] => {
	const paths =
		selected.length > 0
			? [...selected]
			: Object.keys(fs.resolve(folder) ?? {})
					.filter((key) => !key.startsWith("_"))
					.map((key) => `${folder}${fs.separator}${key}`);
	return paths.filter((path) => {
		const entry = fs.resolve(path);
		return (
			entry !== undefined &&
			entry._type !== ClassicyFileSystemEntryFileType.Directory &&
			entry._type !== ClassicyFileSystemEntryFileType.Drive &&
			entry._invisible !== true
		);
	});
};

/**
 * The size part's bytes for `folder` with `selected` chosen, measured
 * asynchronously (`fs.size`, as the header's size is): `undefined` while it
 * is measured, unmeasurable files counting nothing.
 */
export const useClassicyExplorerStatusSize = (
	fs: ClassicyFileSystem,
	folder: string,
	selected: readonly string[],
	enabled: boolean,
): number | undefined => {
	const [bytes, setBytes] = useState<number | undefined>(undefined);
	const key = selected.join("\n");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `selected`
	useEffect(() => {
		if (!enabled) return;
		let canceled = false;
		setBytes(undefined);
		const files = classicyExplorerStatusFiles(fs, folder, selected);
		Promise.all(files.map((path) => fs.size(path))).then((sizes) => {
			if (!canceled)
				setBytes(sizes.reduce((sum, size) => sum + Math.max(0, size), 0));
		});
		return () => {
			canceled = true;
		};
	}, [fs, folder, key, enabled]);
	return enabled ? bytes : undefined;
};
