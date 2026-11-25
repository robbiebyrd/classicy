import { type RefObject, useEffect, useRef } from "react";
import {
	classicyAccessKeyFromEvent,
	classicyFocusedAccessKeyScope,
	classicyMenuBarHasChord,
	classicyMenuItemsHaveChord,
	isClassicyModalAccessKeyScope,
	isClassicyTextEntry,
	registerClassicyAccessKeyMenuBar,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { isClassicyMacPlatform } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
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
 *   item, unless a menu item's keyboard equivalent is that chord (Classicy's
 *   Option chords always win), focus is in a modal window the bar is not
 *   in (a dialog takes its own keys), or, on a Mac, in a text entry (where
 *   Option types a character).
 * - Alt pressed and released alone, with no other key or press between,
 *   brings focus to the bar's first title, and back, as F10 does ("ALT
 *   Activate or inactivate menu bar mode").
 *
 * Both only on a bar whose titles have access keys (`titleKeys`; a package's
 * `layout.menu.accessKeys` `"auto"`, or a host's own `accessKey`s), and on a
 * window's bar only while its window is active, so a Mac bar without them
 * leaves Alt to the browser as before. The bar also tells the labels'
 * access keys (`ClassicyControlLabel`) which keys it takes and whether a
 * chord is one of its items' equivalents.
 * @internal
 */
export const useClassicyMenuBarAccessKeys = ({
	tree,
	listRef,
	windowActive,
	titleKeys,
	menuItems,
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
	menuItems: readonly ClassicyMenuItem[] | undefined;
	keyboardEnv: () => ClassicyMenuKeyboardEnv;
	closeAll: () => void;
	restoreFocus: () => void;
}): void => {
	const stateRef = useRef({ windowActive, titleKeys, menuItems });
	stateRef.current = { windowActive, titleKeys, menuItems };

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
			hasChord: (e) => {
				const { windowActive, menuItems } = stateRef.current;
				return (
					windowActive !== false &&
					listRef.current?.isConnected === true &&
					classicyMenuItemsHaveChord(menuItems, e)
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
			if (e.defaultPrevented || !e.altKey || e.ctrlKey || e.metaKey) return;
			const root = listRef.current;
			if (!root?.isConnected) return;
			// In the menus, the root's own handler had it.
			if (e.target instanceof Node && root.contains(e.target)) return;
			const char = classicyAccessKeyFromEvent(e);
			if (char === null || !stateRef.current.titleKeys.has(char)) return;
			if (outOfReach(root)) return;
			if (
				isClassicyMacPlatform() &&
				isClassicyTextEntry(root.ownerDocument.activeElement)
			)
				return;
			if (
				classicyMenuItemsHaveChord(stateRef.current.menuItems, e) ||
				classicyMenuBarHasChord(e)
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
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("mousedown", disarm, true);
		window.addEventListener("blur", disarm);
		return () => {
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
