import { useEffect } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	canonicalChordsFromEvent,
	findMenuItemByShortcut,
	runMenuItemAction,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The single app-wide keyboard-shortcut dispatcher. Binds one `document` keydown
 * listener and arbitrates modifier chords by registry precedence:
 *   1. the focused app's claimed chords → run the item's action from the live menu
 *   2. the always-active system chords   → run the item's action from the live menu
 *   3. an extension global               → dispatch its event
 * `combinedMenu` is the menu bar's assembled Apple + focused-app + Help menu; it
 * is the source for resolving tiers 1–2 actions (chords are unique per item).
 */
export const useClassicyShortcutDispatcher = (
	combinedMenu: ClassicyMenuItem[],
): void => {
	const focusedAppId = useAppManager(
		(s) => s.System.Manager.Applications.focusedAppId,
	);
	const keyboard = useAppManager((s) => s.System.Manager.Keyboard);
	const dispatch = useAppManagerDispatch();

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if (!(event.metaKey || event.ctrlKey || event.altKey)) return;
			// Option-only chords must not hijack text entry (accented chars).
			if (!event.metaKey && !event.ctrlKey) {
				const t = event.target as HTMLElement | null;
				if (
					t &&
					(t.tagName === "INPUT" ||
						t.tagName === "TEXTAREA" ||
						t.isContentEditable)
				) {
					return;
				}
			}

			const candidates = canonicalChordsFromEvent(event);
			if (candidates.length === 0) return;

			const appClaims = keyboard.app[focusedAppId] ?? [];
			const claimsChord = (list: string[]) =>
				candidates.some((c) => list.includes(c));

			// Tier 1 + 2: focused app, then system — action resolved from the live
			// combined menu (handles onClickFunc closures + nativeShortcut skip).
			if (claimsChord(appClaims) || claimsChord(keyboard.system)) {
				const match = findMenuItemByShortcut(combinedMenu, event);
				if (match) {
					event.preventDefault();
					runMenuItemAction(match, dispatch);
				}
				return;
			}

			// Tier 3: extension global.
			const chord = candidates.find((c) => keyboard.global[c]);
			if (chord) {
				const g = keyboard.global[chord];
				event.preventDefault();
				dispatch({ type: g.event, ...(g.eventData ?? {}) });
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [combinedMenu, focusedAppId, keyboard, dispatch]);
};
