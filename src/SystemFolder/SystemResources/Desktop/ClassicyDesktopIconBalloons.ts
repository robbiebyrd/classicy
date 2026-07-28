import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

/**
 * Stock balloon copy for the system's own desktop icons, keyed by icon kind.
 * Resolved at render time rather than stored on the icon record, so revised
 * copy ships with the library instead of staying frozen in a user's
 * localStorage.
 */
const DEFAULT_BALLOON_CONTENT: Record<string, string> = {
	trash:
		"This is the Trash. Drag items here to get them out of the way. To remove them permanently, choose Empty Trash from the Special menu.",
	drive:
		"This is a disk icon. To see what's on the disk, double-click the icon.",
};

export const defaultBalloonForKind = (
	kind: string,
	title: string,
): ClassicyIconBalloonHelp | undefined => {
	const content = DEFAULT_BALLOON_CONTENT[kind?.toLowerCase()];
	return content ? { title, content } : undefined;
};

/**
 * Widens the app-facing `string | ClassicyIconBalloonHelp` prop into the single
 * object form stored on the icon record, titling it with the app's name unless
 * the caller supplied a title.
 */
export const normalizeIconBalloonHelp = (
	value: string | ClassicyIconBalloonHelp | undefined,
	defaultTitle: string,
): ClassicyIconBalloonHelp | undefined => {
	if (!value) return undefined;
	if (typeof value === "string") return { title: defaultTitle, content: value };
	return { ...value, title: value.title ?? defaultTitle };
};
