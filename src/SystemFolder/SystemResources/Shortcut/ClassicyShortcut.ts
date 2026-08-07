/**
 * A shortcut is a file system entry or desktop icon that points at a web
 * address rather than at content the desktop renders itself. Everything about
 * one is plain serializable data: shortcuts persist to localStorage and, in
 * consumers that sync the file system to a server, round-trip through a remote
 * store. Nothing here may hold a function.
 */

/** Where a shortcut's target opens. */
export type ClassicyShortcutDisposition =
	/** A ClassicyWindow containing an iframe. The desktop keeps running. */
	| "classicy"
	/** The real browser, replacing the current page. Tears the desktop down. */
	| "browser"
	/** The real browser, in a new tab. */
	| "browser-new";

const DISPOSITIONS: ReadonlySet<string> = new Set([
	"classicy",
	"browser",
	"browser-new",
]);

/**
 * The disposition for an untrusted value, defaulting to the in-desktop viewer.
 *
 * "classicy" is the default deliberately: it is the only disposition that
 * cannot navigate the user away from the desktop, so a corrupt or hand-edited
 * value degrades to the harmless behavior rather than to a redirect.
 */
export const readShortcutDisposition = (
	value: unknown,
): ClassicyShortcutDisposition =>
	typeof value === "string" && DISPOSITIONS.has(value)
		? (value as ClassicyShortcutDisposition)
		: "classicy";

/**
 * Whether a URL resolves to the page's own origin.
 *
 * Used to decide whether an iframe needs a `sandbox` attribute. It does not for
 * same-origin content: such a frame can reach its own frame element through
 * `window.parent` and remove the attribute, so sandboxing it protects nothing.
 * The distinction is only meaningful cross-origin, where `allow-scripts` can be
 * granted without `allow-same-origin`.
 */
export const isSameOriginUrl = (url: string): boolean => {
	if (!url) return false;
	try {
		// The second argument makes relative and protocol-relative URLs resolve
		// against the current page, which is exactly the comparison we want.
		return new URL(url, window.location.href).origin === window.location.origin;
	} catch {
		return false;
	}
};
