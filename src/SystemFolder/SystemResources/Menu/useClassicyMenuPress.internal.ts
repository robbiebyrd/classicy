import {
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import {
	type ClassicyMenuTree,
	classicyMenuItemOf,
	classicyMenuListOf,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuTree.internal";

/**
 * Press-drag-release across a menu tree (WIG Ch.7 "Drop-down Menu
 * Interaction" (p.97); HIGOS8 "Sticky Menus" (p.92)), the idiom a pop-up
 * bevel button's held menu uses (`ClassicyBevelButton`): a press on a menu
 * bar title opens its menu at once, the pointer tracks the items while the
 * button is held (a title it crosses opens, as a hover of an active bar
 * does), and the document's `mouseup` decides:
 *
 * - over an enabled item with no submenu, other than the one pressed, that
 *   item is chosen (`click()`), whatever the press began on (a title, or an
 *   item of a menu already open);
 * - over the title pressed, or anywhere else in the tree's menus (a dimmed
 *   item, a divider, an item with a submenu, another title), a menu the
 *   press opened stays open: the click that ends the press is swallowed, so
 *   a quick click keeps today's sticky menu;
 * - outside every menu of the tree, a menu the press opened closes.
 *
 * A press that opened nothing (on an item of an open menu, on an open
 * title) released over the item it began on is left to the click that
 * follows, as before. A lost pointer stream (`onClassicyPointerStreamLost`)
 * ends the press, closing a menu it opened, with nothing chosen.
 * @internal
 */
export const useClassicyMenuPress = (
	tree: ClassicyMenuTree | null,
	{ horizontal, closeAll }: { horizontal: boolean; closeAll: () => void },
): { onMouseDown: (e: ReactMouseEvent) => void; endPress: () => void } => {
	const endRef = useRef<(() => void) | null>(null);
	const endPress = useCallback(() => endRef.current?.(), []);
	useEffect(() => endPress, [endPress]);

	const onMouseDown = useCallback(
		(e: ReactMouseEvent) => {
			if (!tree || e.button !== 0) return;
			const root = tree.rootRef.current;
			if (!root) return;
			endRef.current?.();
			tree.swallowClickWithin = null;
			const pressed = classicyMenuItemOf(tree, e.target);
			const handle = pressed ? tree.items.get(pressed)?.current : null;
			if (!pressed || !handle) return;
			// A press on a bar title opens its menu (a click no longer has to
			// end first), and the click that ends this press is the press's.
			let opened = false;
			if (
				horizontal &&
				classicyMenuListOf(tree, pressed) === root &&
				handle.hasChildren &&
				!handle.disabled &&
				!handle.open
			) {
				handle.openSubmenu("pointer");
				opened = true;
				tree.swallowClickWithin = pressed;
			}
			// The click follows its mouseup within the same task; a swallow left
			// unclaimed (the click landed between the menus) is dropped after.
			const forgetSoon = () => {
				const within = tree.swallowClickWithin;
				setTimeout(() => {
					if (tree.swallowClickWithin === within)
						tree.swallowClickWithin = null;
				}, 0);
			};
			const onUp = (ev: MouseEvent) => {
				if (ev.button !== 0) return;
				end();
				const target = ev.target;
				const released = classicyMenuItemOf(tree, target);
				if (released && released !== pressed) {
					const over = tree.items.get(released)?.current;
					if (over && !over.disabled && !over.hasChildren) {
						tree.swallowClickWithin = null;
						released.click();
						tree.swallowClickWithin = root;
						forgetSoon();
						return;
					}
				}
				if (opened) {
					if (target instanceof Node && root.contains(target)) {
						forgetSoon();
						return;
					}
					tree.swallowClickWithin = null;
					closeAll();
					return;
				}
				tree.swallowClickWithin = null;
			};
			const stopWatching = onClassicyPointerStreamLost(() => {
				end();
				tree.swallowClickWithin = null;
				if (opened) closeAll();
			});
			const end = () => {
				document.removeEventListener("mouseup", onUp, true);
				stopWatching();
				if (endRef.current === end) endRef.current = null;
			};
			// In the capture phase, so a target that stops the mouseup cannot
			// hide the release.
			document.addEventListener("mouseup", onUp, true);
			endRef.current = end;
		},
		[tree, horizontal, closeAll],
	);

	return { onMouseDown, endPress };
};
