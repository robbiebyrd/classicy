import { type RefObject, useEffect, useRef } from "react";
import {
	classicyAccessKeyFromEvent,
	classicyFocusedAccessKeyScope,
	isClassicyMenuKeyTarget,
	isClassicyMenuShown,
	isClassicyModalAccessKeyScope,
	isClassicyTextEntry,
	registerClassicyAccessKeyMenuBar,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { isClassicyMacPlatform } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import {
	type ClassicyMenuKeyboardEnv,
	type ClassicyMenuTree,
	classicyMenuFirstTitle,
	handleClassicyMenuBarAccessKey,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuTree.internal";

/**
 * A menu bar's access keys from outside its menus (a root `ClassicyMenu`
 * laid across: the screen bar, a window's own bar), as Windows takes them
 * (WIG Ch.7 "The Menu Bar and Drop-down Menus" (p.97); Appendix B, Table
 * B.2):
 *
 * - Alt and a title's access key opens that title's menu on its first
 *   item, ahead of any menu item's Option (⌥) keyboard equivalent of that
 *   chord (WIG Ch.4 "Shortcut Keys" (p.27): "avoid ALT+key combinations,
 *   because they conflict with access keys"): the listener runs in the
 *   capture phase on `window`, before the menu-shortcut dispatcher's
 *   `document` listener, and `preventDefault`s the key it takes, so the
 *   dispatcher, which skips a prevented event, runs no ⌥ item for it (a
 *   chord no title holds still reaches its item). Unless focus is in a
 *   modal window the bar is not in (a dialog takes its own keys), in a menu
 *   (it takes its own keys), or, on a Mac, in a text entry (where Option
 *   types a character), and while no menu on Windows' keyboard is shown
 *   (it takes the keys typed: `isClassicyMenuShown`).
 * - Alt pressed and released alone, with no other key or press between,
 *   brings focus to the bar's first title, and back, as F10 does ("ALT
 *   Activate or inactivate menu bar mode").
 *
 * Both only on a bar whose titles have access keys (`titleKeys`, which
 * exist only under a package's `layout.menu.accessKeys`), and on a
 * window's bar only while its window is active, so a Mac bar without them
 * leaves Alt, and every ⌥ chord, to the browser and the dispatcher as
 * before. The bar also tells the labels' access keys
 * (`ClassicyControlLabel`) which keys it takes.
 * @internal
 */
export const useClassicyMenuBarAccessKeys = ({
	tree,
	listRef,
	windowActive,
	titleKeys,
	keyboardEnv,
	closeAll,
	restoreFocus,
}: {
	/** The bar's tree; null for a root that is not a bar (nothing is done). */
	tree: ClassicyMenuTree | null;
	listRef: RefObject<HTMLUListElement | null>;
	/** `ClassicyWindowActiveContext`: false in an inactive window. */
	windowActive: boolean | undefined;
	/** The titles' access keys, lower-cased. */
	titleKeys: ReadonlySet<string>;
	keyboardEnv: () => ClassicyMenuKeyboardEnv;
	closeAll: () => void;
	restoreFocus: () => void;
}): void => {
	const stateRef = useRef({ windowActive, titleKeys });
	stateRef.current = { windowActive, titleKeys };

	const bar = tree !== null;
	useEffect(() => {
		if (!bar) return;
		return registerClassicyAccessKeyMenuBar({
			claims: (key) => {
				const { windowActive, titleKeys } = stateRef.current;
				return (
					windowActive !== false &&
					listRef.current?.isConnected === true &&
					titleKeys.has(key)
				);
			},
		});
	}, [bar, listRef]);

	const hasKeys = titleKeys.size > 0;
	useEffect(() => {
		if (!tree || !hasKeys || windowActive === false) return;
		// Focus is in a modal window this bar is not in: a dialog's keys are
		// its own.
		const outOfReach = (root: HTMLElement) => {
			const scope = classicyFocusedAccessKeyScope(root.ownerDocument);
			return isClassicyModalAccessKeyScope(scope) && !scope.contains(root);
		};
		// Alt went down alone and nothing has happened since.
		let armed = false;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Alt") {
				armed = !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.shiftKey;
				return;
			}
			armed = false;
		};
		// Alt and a title's key, in the capture phase: ahead of the dispatcher's
		// ⌥ chords (WIG Ch.4 "Shortcut Keys", p.27).
		const onAccessKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || !e.altKey || e.ctrlKey || e.metaKey) return;
			if (e.key === "Alt") return;
			const root = listRef.current;
			if (!root?.isConnected) return;
			// A menu takes its own keys: focus in one (this bar's root handler,
			// or another bar's), or one shown on Windows' keyboard.
			if (isClassicyMenuKeyTarget(e.target) || isClassicyMenuShown()) return;
			const char = classicyAccessKeyFromEvent(e);
			if (char === null || !stateRef.current.titleKeys.has(char)) return;
			if (outOfReach(root)) return;
			if (
				isClassicyMacPlatform() &&
				isClassicyTextEntry(root.ownerDocument.activeElement)
			)
				return;
			if (!handleClassicyMenuBarAccessKey(tree, keyboardEnv(), char)) return;
			e.preventDefault();
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key !== "Alt") return;
			const wasArmed = armed;
			armed = false;
			if (!wasArmed || e.defaultPrevented) return;
			const root = listRef.current;
			if (!root?.isConnected || outOfReach(root)) return;
			e.preventDefault();
			// In use (focus in its menus, or a menu the pointer opened): out.
			const menuOpen = tree.lists.get(root)?.current?.openChildId != null;
			if (menuOpen || root.contains(root.ownerDocument.activeElement)) {
				closeAll();
				restoreFocus();
				return;
			}
			const env = keyboardEnv();
			const first = classicyMenuFirstTitle(tree, env);
			if (first) env.focusItem(first);
		};
		const disarm = () => {
			armed = false;
		};
		window.addEventListener("keydown", onAccessKey, true);
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("mousedown", disarm, true);
		window.addEventListener("blur", disarm);
		return () => {
			window.removeEventListener("keydown", onAccessKey, true);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("mousedown", disarm, true);
			window.removeEventListener("blur", disarm);
		};
	}, [
		tree,
		hasKeys,
		windowActive,
		listRef,
		keyboardEnv,
		closeAll,
		restoreFocus,
	]);
};
