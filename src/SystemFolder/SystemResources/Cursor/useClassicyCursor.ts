import { useCallback } from "react";
import {
	type ClassicyCursorRole,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";

// An unquoted CSS `url()` cannot hold whitespace, quotes, parentheses or
// backslashes; the bundler's SVG data URIs (the Platinum arrow) contain them.
const cssUrl = (src: string): string =>
	/[\s'"()\\]/.test(src)
		? `url("${src.replace(/["\\]/g, "\\$&")}")`
		: `url(${src})`;

/**
 * Returns a stable `setCursor(role?)` function that swaps the whole page's
 * pointer for a cursor role (`"watch"`, `"hand"`, `"resizeLr"`, …) read from the
 * appearance package's cursor registry (`registerClassicyCursors`) at call time,
 * by setting `document.body.style.cursor`. Call it with no role to restore the
 * default; a role with no registered cursor restores it too.
 * It is global, not scoped to an element — an element's own CSS `cursor`
 * still wins while hovered — so always reset it when the operation ends.
 * `ClassicySplitView` uses it to keep the directional resize cursor through a
 * divider drag even when the pointer outruns the divider. A cursor that only
 * needs to show over one element belongs in that element's CSS instead, as
 * `var(--classicy-cursor-<role>, url('data:,')) <x> <y>, <keyword>` (the
 * window's grow box and the split view's dividers do this).
 *
 * ```tsx
 * const setCursor = useClassicyCursor();
 * setCursor("watch"); // busy
 * await work();
 * setCursor(); // back to the default arrow
 * ```
 */
export const useClassicyCursor = () => {
	const setCursor = useCallback((role?: ClassicyCursorRole) => {
		if (!role) {
			document.body.style.cursor = "";
			return;
		}
		const url = resolveClassicyAsset("cursors", role);
		document.body.style.cursor = url ? `${cssUrl(url)}, auto` : "";
	}, []);

	return setCursor;
};
