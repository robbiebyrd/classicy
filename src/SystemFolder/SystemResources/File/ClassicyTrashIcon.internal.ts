import { useSyncExternalStore } from "react";
import {
	subscribeClassicyAssets,
	useClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { CLASSICY_TRASH_PATH } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { classicyStoredTrashIcon } from "@/SystemFolder/SystemResources/File/ClassicyTrashStoredIcon.internal";

/** `classicyStoredTrashIcon`, read again whenever assets register. */
export const useClassicyStoredTrashIcon = (): string =>
	useSyncExternalStore(
		subscribeClassicyAssets,
		classicyStoredTrashIcon,
		classicyStoredTrashIcon,
	);

/**
 * What every surface draws for the Trash folder: the active package's Trash
 * art, full while anything is in it (`full`), else empty. Read at render.
 */
export const useClassicyTrashIcon = (full: boolean): string => {
	const fullIcon = useClassicyAsset("systemArt", "trashFull") ?? "";
	const emptyIcon = useClassicyAsset("systemArt", "trashEmpty") ?? "";
	return full ? fullIcon : emptyIcon;
};

/**
 * Is the entry `name`, listed in `folder`, the Trash itself? Only the root
 * holds it, however the root is spelled (`""`, `":"`). For listings, which
 * draw the Trash with the active package's art rather than its stored
 * `_icon`.
 */
export const isClassicyTrashFolder = (
	fs: ClassicyFileSystem,
	folder: string,
	name: string,
): boolean =>
	name === CLASSICY_TRASH_PATH && fs.pathArray(folder)?.length === 0;
