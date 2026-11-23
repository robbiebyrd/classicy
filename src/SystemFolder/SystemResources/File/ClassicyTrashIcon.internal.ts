import { useSyncExternalStore } from "react";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	resolveClassicyAsset,
	subscribeClassicyAssets,
	useClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";

/**
 * The icon the Trash folder stores as its `_icon`: the default package's
 * empty-Trash art, from its base tree, whatever package or theme is active.
 * It is never the active package's art, so a package or theme switch never
 * changes the saved tree, as with every other stored icon. Surfaces that
 * draw the Trash draw the active package's art instead
 * (`useClassicyTrashIcon`). `""` while the default package has registered
 * no `trashEmpty`.
 */
export const classicyStoredTrashIcon = (): string =>
	resolveClassicyAsset(
		"systemArt",
		"trashEmpty",
		CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		"",
	) ?? "";

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
