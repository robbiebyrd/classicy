import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

/**
 * The default package's (the core's) icon for the icon key `key`, read from
 * the registry when called, never the active package's: the URL a stored or
 * derived file system entry holds, so it is the same under every package,
 * and which every icon surface draws as the active package's and theme
 * variant's icon for the key (`resolveClassicyIconImage`). Story 0193-801.
 */
export const classicyCoreIcon = (key: string): string =>
	resolveClassicyAsset("icons", key, CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID) ??
	"";
