/**
 * Icon kinds that stand in for something stored elsewhere. Mac OS 8 badges
 * these with an arrow and italicizes the label; system kinds (drive, trash,
 * directory, file) get neither treatment.
 */
const ALIAS_KINDS = new Set(["app_shortcut", "shortcut"]);

export const isAliasKind = (kind: string): boolean =>
	ALIAS_KINDS.has(kind?.toLowerCase());
