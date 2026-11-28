/**
 * Icon kinds that stand in for something stored elsewhere. Mac OS 8 badges
 * these with an arrow and italicizes the label; system kinds (drive, trash,
 * directory, file) get neither treatment. `file_shortcut` is a shortcut to
 * an entry of the tree (`ClassicyFileSystemEntryFileType.FileShortcut`,
 * Explorer's Create Shortcut), drawn as an alias under every package.
 */
const ALIAS_KINDS = new Set(["app_shortcut", "shortcut", "file_shortcut"]);

export const isAliasKind = (kind: string): boolean =>
	ALIAS_KINDS.has(kind?.toLowerCase());
