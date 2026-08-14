/**
 * Derives Google Analytics pageview paths and titles for ClassicyWindow.
 *
 * Pure string handling, deliberately free of React and store imports so every
 * rule below is unit-testable on its own.
 */

// The split/filter/join pass trims leading/trailing hyphens in linear time —
// the first replace already collapsed runs, so the only empty pieces are at
// the ends. (An anchored trim regex like /^-+|-+$/g backtracks quadratically
// on long hyphen runs.)
const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.split("-")
		.filter(Boolean)
		.join("-");

// A window id holding one of these is a filesystem path, not a route.
const FILESYSTEM_SEPARATOR = /[:/]/;

// Strips `prefix` from `segment`, but only on a segment boundary — so the app
// segment "app" never turns the window id "apple" into "le".
const stripPrefix = (segment: string, prefix: string): string | null => {
	if (!prefix) return null;
	if (segment === prefix) return "";
	if (segment.startsWith(`${prefix}-`)) return segment.slice(prefix.length + 1);
	return null;
};

/**
 * Builds `/<app>/<window>` from a window's app and window ids.
 *
 * Window ids that contain a filesystem separator are user data — ClassicyApp
 * builds file-window ids as `<appId>_file_<path>` and Finder keys its windows
 * by folder path. Those collapse to a single generic segment so user file and
 * folder names never reach GA and path cardinality stays bounded.
 */
export const classicyWindowPagePath = (
	appId: string,
	windowId: string,
): string => {
	const appSegment = slugify(appId.replace(/\.app$/i, "")) || "app";

	if (FILESYSTEM_SEPARATOR.test(windowId)) {
		const isFileWindow = windowId.startsWith(`${appId}_file_`);
		return `/${appSegment}/${isFileWindow ? "file" : "folder"}`;
	}

	let windowSegment = slugify(windowId);

	// Longest match first: "simpletext-app-debugger" must yield "debugger",
	// not "app-debugger".
	for (const prefix of [slugify(appId), appSegment]) {
		const stripped = stripPrefix(windowSegment, prefix);
		if (stripped !== null) {
			windowSegment = stripped;
			break;
		}
	}

	if (/^\d+$/.test(windowSegment)) windowSegment = `window-${windowSegment}`;
	if (!windowSegment) windowSegment = "main";

	return `/${appSegment}/${windowSegment}`;
};

/**
 * Human-readable pageview title. The window title is passed through verbatim,
 * including titles derived from user file names — an accepted trade-off that
 * keeps GA's content report readable. The *path* stays free of user data.
 */
export const classicyWindowPageTitle = (
	appName: string | undefined,
	title: string | undefined,
	fallbackPath: string,
): string => {
	const app = appName?.trim();
	const window = title?.trim();
	if (app && window) return `${app} — ${window}`;
	return window || app || fallbackPath;
};
