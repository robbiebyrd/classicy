import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

/**
 * The icon the Trash folder stores as its `_icon`: the default package's
 * empty-Trash art, from its base tree, whatever package or theme is active.
 * It is never the active package's art, so a package or theme switch never
 * changes the saved tree, as with every other stored icon. Surfaces that
 * draw the Trash draw the active package's art instead
 * (`useClassicyTrashIcon`). `""` while the default package has registered
 * no `trashEmpty`; `ensureClassicyTrash` never heals a stored icon to that.
 */
export const classicyStoredTrashIcon = (): string =>
	resolveClassicyAsset(
		"systemArt",
		"trashEmpty",
		CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		"",
	) ?? "";
