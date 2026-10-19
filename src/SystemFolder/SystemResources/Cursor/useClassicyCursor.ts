import { useCallback } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/** A Mac OS 8 cursor bundled in `ClassicyIcons.ui.cursors` (e.g. `"watch"`, `"hand"`, `"resizeLr"`). */
type CursorName = keyof typeof ClassicyIcons.ui.cursors;

/**
 * Returns a stable `setCursor(name?)` function that swaps the whole page's
 * pointer for one of the bundled Mac OS 8 cursors by setting
 * `document.body.style.cursor`; call it with no name to restore the default.
 * It is global, not scoped to an element — an element's own CSS `cursor`
 * still wins while hovered — so always reset it when the operation ends.
 * `ClassicyWindow` uses it over its resize edge, and `ClassicySplitView`
 * keeps the directional resize cursor through a divider drag even when the
 * pointer outruns the divider.
 *
 * ```tsx
 * const setCursor = useClassicyCursor();
 * setCursor("watch"); // busy
 * await work();
 * setCursor(); // back to the default arrow
 * ```
 */
export const useClassicyCursor = () => {
	const setCursor = useCallback((name?: CursorName) => {
		if (!name) {
			document.body.style.cursor = "";
			return;
		}
		const url = ClassicyIcons.ui.cursors[name];
		document.body.style.cursor = url ? `url(${url}), auto` : "";
	}, []);

	return setCursor;
};
