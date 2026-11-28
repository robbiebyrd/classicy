import { useCallback, useMemo, useRef } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	classicyViewStateCaret,
	classicyViewStateScroll,
} from "./ClassicyWindowViewStatePatch.internal";

/**
 * A window's view state, for its scroll area (`ClassicyScrollArea`'s
 * `initialScroll` and `onScrollSettled`) and a document's text editor
 * (`ClassicyTextEditor`'s `initialCaret` and `onCaretSettled`). Every
 * member is `undefined` unless the active package keeps view state.
 */
export type ClassicyWindowViewState = {
	/** The scroll offsets the window's record holds, read when it mounted. */
	initialScroll?: [number, number];
	/** Records the scroll area's offsets on the window's record. */
	onScrollSettled?: (scroll: [number, number]) => void;
	/** The caret offset the window's record holds, read when it mounted. */
	initialCaret?: number;
	/** Records the text editor's caret offset on the window's record. */
	onCaretSettled?: (caret: number) => void;
};

/**
 * The view state of the window `windowId` of `appId`, under a package's
 * `layout.window.restoreViewState` (Windows; WIG Ch.2 "Persistence", p.12:
 * "view state information, such as cursor position, scroll position, and
 * window size and location, should be preserved so it can be restored when
 * an object's view is reopened"; Ch.6 "Opening and Closing Windows", p.94):
 * the offsets and caret its record held when the window mounted (finite
 * values only), and callbacks that write new ones through
 * `ClassicyWindowSetScroll` once they settle. Spread the scroll pair on the
 * window's content scroll area and the caret pair on a document's
 * `ClassicyTextEditor`. Without the key every member is `undefined`, so a
 * scroll area or editor given them behaves as before and the record gains
 * nothing.
 *
 * The initial values are read once per window id, so a value the callbacks
 * write while the window is open never moves its view. The record keeps them
 * across a close and a reload (`sanitizeStateForPersistence` keeps them).
 */
export const useClassicyWindowViewState = (
	appId: string,
	windowId: string,
): ClassicyWindowViewState => {
	const enabled =
		useClassicyAppearanceLayout().window.restoreViewState === true;
	const dispatch = useAppManagerDispatch();

	// What the record held when this window id first rendered under the key.
	const initialRef = useRef<{
		key: string;
		scroll?: [number, number];
		caret?: number;
	} | null>(null);
	const key = `${appId}\u0000${windowId}`;
	if (enabled && initialRef.current?.key !== key) {
		const record = getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[appId],
			windowId,
		);
		initialRef.current = {
			key,
			scroll: classicyViewStateScroll(record?.scroll),
			caret: classicyViewStateCaret(record?.caret),
		};
	}

	const onScrollSettled = useCallback(
		(scroll: [number, number]) =>
			dispatch({
				type: "ClassicyWindowSetScroll",
				app: { id: appId },
				window: { id: windowId },
				scroll,
			}),
		[dispatch, appId, windowId],
	);
	const onCaretSettled = useCallback(
		(caret: number) =>
			dispatch({
				type: "ClassicyWindowSetScroll",
				app: { id: appId },
				window: { id: windowId },
				caret,
			}),
		[dispatch, appId, windowId],
	);

	const initial = enabled ? initialRef.current : null;
	return useMemo(
		() =>
			enabled
				? {
						initialScroll: initial?.scroll,
						onScrollSettled,
						initialCaret: initial?.caret,
						onCaretSettled,
					}
				: {},
		[enabled, initial, onScrollSettled, onCaretSettled],
	);
};
