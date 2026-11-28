import { createContext, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { ClassicyAppearanceInput } from "@/Appearance/ClassicyAppearancePackage";
import { classicyAccessKeyFromEvent } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";

/**
 * One menu tree's register: the root `ClassicyMenu` (the one rendered with
 * no `open`: a menu bar, a contextual menu, a pop-up bevel button's menu)
 * makes it, and every list and item under it registers with it, so the
 * keyboard (WIG Ch.7 "The Menu Bar and Drop-down Menus" (p.98), "Pop-up
 * Menu Interaction" (p.101)) and a press dragged across the menus (WIG Ch.7
 * "Drop-down Menu Interaction" (p.97)) can act on any of them from the root,
 * through the same paths a click takes.
 * @internal
 */

/** An item as the tree sees it, read through a ref kept current by the item. */
export type ClassicyMenuItemHandle = {
	/** Its title, decoded (else its image's alt text): what typing matches. */
	readonly label: string;
	/**
	 * Its access key, lower-cased (`ClassicyMenuItem.accessKey`, or the
	 * automatic pick under the package's `layout.menu.accessKeys` `"auto"`);
	 * null for none.
	 */
	readonly accessKey: string | null;
	readonly disabled: boolean;
	/** It has a submenu. */
	readonly hasChildren: boolean;
	/** Its submenu is shown. */
	readonly open: boolean;
	/** Opens its submenu as a click does (menu bar activated, `open` emitted). */
	openSubmenu: (input: ClassicyAppearanceInput) => void;
	/** Does what a click or Return does: chooses a leaf, toggles a submenu. */
	activate: () => void;
};

/** A list as the tree sees it. */
export type ClassicyMenuListHandle = {
	/** The id of its item whose submenu is shown, if any. */
	readonly openChildId: string | null;
	/** Closes that submenu. */
	closeChild: () => void;
};

export type ClassicyMenuTree = {
	readonly rootRef: RefObject<HTMLUListElement | null>;
	readonly items: Map<Element, RefObject<ClassicyMenuItemHandle>>;
	readonly lists: Map<Element, RefObject<ClassicyMenuListHandle>>;
	/**
	 * The element whose next click a press already handled (`ClassicyMenu`'s
	 * press tracking): an item's click handler swallows a click landing in
	 * it, once.
	 */
	swallowClickWithin: Element | null;
};

export const createClassicyMenuTree = (
	rootRef: RefObject<HTMLUListElement | null>,
): ClassicyMenuTree => ({
	rootRef,
	items: new Map(),
	lists: new Map(),
	swallowClickWithin: null,
});

/** The tree of the nearest root `ClassicyMenu`; null outside one. */
export const ClassicyMenuTreeContext = createContext<ClassicyMenuTree | null>(
	null,
);

/**
 * True, once, when `item`'s click falls in the element a press handled
 * (`swallowClickWithin`), which it then forgets: the click a press-drag-
 * release (or a title's press that opened its menu) already acted on.
 */
export const consumeClassicyMenuSwallowedClick = (
	tree: ClassicyMenuTree | null,
	item: Element | null,
): boolean => {
	const within = tree?.swallowClickWithin;
	if (!tree || !within || !item || !within.contains(item)) return false;
	tree.swallowClickWithin = null;
	return true;
};

const ITEM_ROLES =
	':is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"])';

/** The registered item `node` is in (itself included), within the tree. */
export const classicyMenuItemOf = (
	tree: ClassicyMenuTree,
	node: EventTarget | null,
): HTMLElement | null => {
	let el =
		node instanceof Element
			? node.closest<HTMLElement>(`li${ITEM_ROLES}`)
			: null;
	while (el && !tree.items.has(el)) {
		el = el.parentElement?.closest<HTMLElement>(`li${ITEM_ROLES}`) ?? null;
	}
	return el;
};

/** The list `item` sits in. */
export const classicyMenuListOf = (
	tree: ClassicyMenuTree,
	item: Element,
): HTMLElement | null => {
	const list = item.parentElement?.closest<HTMLElement>("ul") ?? null;
	return list && tree.lists.has(list) ? list : null;
};

/** `list`'s own items, in order (a submenu's are its own list's). */
export const classicyMenuListItems = (
	tree: ClassicyMenuTree,
	list: Element,
): HTMLElement[] =>
	Array.from(list.querySelectorAll<HTMLElement>(`li${ITEM_ROLES}`)).filter(
		(li) => tree.items.has(li) && classicyMenuListOf(tree, li) === list,
	);

/** `item`'s submenu list, if it has one. */
export const classicyMenuSubmenuOf = (
	tree: ClassicyMenuTree,
	item: Element,
): HTMLElement | null => {
	const list = item.querySelector<HTMLElement>(
		":scope > .classicyMenuWrapper > ul",
	);
	return list && tree.lists.has(list) ? list : null;
};

/** The item whose submenu `list` is; null for the root list. */
export const classicyMenuParentItemOf = (
	tree: ClassicyMenuTree,
	list: Element,
): HTMLElement | null => {
	if (list === tree.rootRef.current) return null;
	return classicyMenuItemOf(tree, list.parentElement);
};

/**
 * The deepest shown list: the root, then each open item's submenu down.
 */
export const classicyMenuDeepestOpenList = (
	tree: ClassicyMenuTree,
): HTMLElement | null => {
	let list: HTMLElement | null = tree.rootRef.current;
	while (list) {
		const openId = tree.lists.get(list)?.current?.openChildId ?? null;
		if (openId === null) break;
		const open = classicyMenuListItems(tree, list).find(
			(li) => li.id === openId,
		);
		const sub = open ? classicyMenuSubmenuOf(tree, open) : null;
		if (!sub) break;
		list = sub;
	}
	return list;
};

/** What the keyboard needs from the root `ClassicyMenu` that owns the tree. */
export type ClassicyMenuKeyboardEnv = {
	/** The root list is a menu bar (its items are titles, laid across). */
	horizontal: boolean;
	/** The package's `layout.menu.disabledItems`. */
	disabledItems: "skip" | "browse";
	closeAll: () => void;
	/**
	 * The item the pointer last moved onto, while the pointer (not the
	 * keyboard) last moved the tracking; null otherwise.
	 */
	hovered: HTMLElement | null;
	/** Moves keyboard focus onto `item`, remembering where focus came from. */
	focusItem: (item: HTMLElement) => boolean;
	/**
	 * Gives focus back to where it was before the keyboard (or a title's
	 * press) brought it into the menus.
	 */
	restoreFocus: () => void;
	/** Keeps focus where it is when the menus next close (Escape on a title). */
	keepFocusOnClose: () => void;
};

export type ClassicyMenuKey = {
	key: string;
	/** The physical key (`KeyF`): an access key typed with Option on a Mac. */
	code?: string;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
};

const handleOf = (tree: ClassicyMenuTree, item: Element) =>
	tree.items.get(item)?.current ?? null;

/**
 * `list`'s items in the order the keyboard walks them: a menu bar's titles
 * from left to right as they show (a package orders the bar's clusters
 * with CSS `order`, so the document's order need not be the bar's), any
 * other list's in document order. Titles with no layout keep theirs.
 */
const itemsOf = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	list: Element,
): HTMLElement[] => {
	const items = classicyMenuListItems(tree, list);
	if (!env.horizontal || list !== tree.rootRef.current) return items;
	const lefts = new Map(
		items.map((item) => [item, item.getBoundingClientRect().left]),
	);
	return items.sort((a, b) => (lefts.get(a) ?? 0) - (lefts.get(b) ?? 0));
};

/** The menu bar's first title the keyboard may stop on (F10's). */
export const classicyMenuFirstTitle = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
): HTMLElement | null => {
	const root = tree.rootRef.current;
	return root ? edgeOf(tree, env, itemsOf(tree, env, root), "first") : null;
};

const isTitle = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	item: Element,
) => env.horizontal && classicyMenuListOf(tree, item) === tree.rootRef.current;

/** The bar title `item` hangs from (itself if it is one); null off a bar. */
const titleOf = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	item: HTMLElement,
): HTMLElement | null => {
	if (!env.horizontal) return null;
	let current: HTMLElement | null = item;
	while (current && !isTitle(tree, env, current)) {
		const list = classicyMenuListOf(tree, current);
		current = list ? classicyMenuParentItemOf(tree, list) : null;
	}
	return current;
};

const navigable = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	item: Element,
) => env.disabledItems === "browse" || handleOf(tree, item)?.disabled !== true;

/**
 * The next item of `items` from `from` (an index; -1 for none) in `step`'s
 * direction, wrapping, that the keyboard may stop on; null for none.
 */
const stepThrough = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	items: HTMLElement[],
	from: number,
	step: 1 | -1,
): HTMLElement | null => {
	const n = items.length;
	const start = from < 0 ? (step === 1 ? -1 : n) : from;
	for (let k = 1; k <= n; k++) {
		const i = (((start + step * k) % n) + n) % n;
		if (navigable(tree, env, items[i])) return items[i];
	}
	return null;
};

const edgeOf = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	items: HTMLElement[],
	end: "first" | "last",
) => stepThrough(tree, env, items, -1, end === "first" ? 1 : -1);

/**
 * Typing: the next item after `from` (wrapping) whose label starts with
 * `char`, case-insensitively. An access key, when items carry one, comes
 * first (`actOnAccessKey`; WIG Ch.7 "Menu Titles" (p.106)); this is the jump
 * typing makes where none claims the key.
 */
const typeaheadTarget = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	items: HTMLElement[],
	from: number,
	char: string,
): HTMLElement | null => {
	const wanted = char.toLocaleLowerCase();
	const n = items.length;
	const start = from < 0 ? -1 : from;
	for (let k = 1; k <= n; k++) {
		const item = items[(start + k) % n];
		const label = handleOf(tree, item)?.label.trim().toLocaleLowerCase() ?? "";
		if (label.startsWith(wanted) && navigable(tree, env, item)) return item;
	}
	return null;
};

/**
 * Opens `item`'s submenu now (committed before returning, so its items can
 * take focus) and focuses its first or last item the keyboard may stop on.
 * False when it has none to open.
 */
const openAndEnter = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	item: HTMLElement,
	end: "first" | "last" = "first",
): boolean => {
	const handle = handleOf(tree, item);
	if (!handle?.hasChildren || handle.disabled) return false;
	if (!handle.open) flushSync(() => handle.openSubmenu("keyboard"));
	const sub = classicyMenuSubmenuOf(tree, item);
	const target = sub ? edgeOf(tree, env, itemsOf(tree, env, sub), end) : null;
	if (target) env.focusItem(target);
	else env.focusItem(item);
	return true;
};

/** Closes whatever submenu `list` shows. */
const closeChildOf = (tree: ClassicyMenuTree, list: Element | null) => {
	const handle = list ? tree.lists.get(list)?.current : null;
	if (handle && handle.openChildId !== null) handle.closeChild();
};

/**
 * An access key typed in `list` (its `items`, `from` the current one's
 * index, -1 for none), as Windows' menus take it (WIG Ch.7, p.97: "Pressing
 * a subsequent alphanumeric key chooses the menu item ... with the matching
 * access character"; Wine's `MENU_FindItemByKey`): the one item with that
 * key is chosen as Return chooses it (a submenu opens on its first item, a
 * title's menu opens, a leaf runs), a dimmed one only tracked where the
 * package browses dimmed items; several sharing it are moved between, from
 * the current one, wrapping, none chosen (WIG Ch.4 "Access Keys", p.27). False
 * when no item of the list has it.
 */
const actOnAccessKey = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	list: HTMLElement,
	items: HTMLElement[],
	from: number,
	char: string,
): boolean => {
	const matches = items.filter(
		(item) => handleOf(tree, item)?.accessKey === char,
	);
	if (matches.length === 0) return false;
	// Moving within a menu closes a sibling's open submenu; on a menu bar the
	// next title's menu replaces the open one as it opens.
	const closeSiblings = () => {
		if (list !== tree.rootRef.current || !env.horizontal)
			closeChildOf(tree, list);
	};
	if (matches.length > 1) {
		const current = from >= 0 ? items[from] : null;
		const target = stepThrough(
			tree,
			env,
			matches,
			current ? matches.indexOf(current) : -1,
			1,
		);
		if (target) {
			closeSiblings();
			env.focusItem(target);
		}
		return true;
	}
	const [item] = matches;
	const handle = handleOf(tree, item);
	if (!handle) return false;
	if (handle.disabled) {
		if (navigable(tree, env, item)) {
			closeSiblings();
			env.focusItem(item);
		}
		return true;
	}
	if (handle.hasChildren) return openAndEnter(tree, env, item);
	closeSiblings();
	env.focusItem(item);
	handle.activate();
	return true;
};

/**
 * An access key typed in the menus: in the list `current` acts in
 * (`actingList`), or, with focus outside the menus, in the deepest shown
 * list (never a menu bar with nothing open).
 */
const accessKeyFrom = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	current: HTMLElement | null,
	char: string,
): boolean => {
	if (current) {
		const acting = actingList(tree, env, current);
		return acting
			? actOnAccessKey(tree, env, acting.list, acting.items, acting.from, char)
			: false;
	}
	const list = classicyMenuDeepestOpenList(tree);
	if (!list || (list === tree.rootRef.current && env.horizontal)) return false;
	const items = itemsOf(tree, env, list);
	const from =
		env.hovered && classicyMenuListOf(tree, env.hovered) === list
			? items.indexOf(env.hovered)
			: -1;
	return actOnAccessKey(tree, env, list, items, from, char);
};

/**
 * Alt and a title's access key, typed with the menu bar not yet in use
 * (WIG Ch.7, p.97: "When the user presses an alphanumeric key while holding
 * the ALT key ... the drop-down menu whose access key for the menu title
 * matches ... is displayed"): that title's menu opens on its first item (a
 * key several titles share moves between them, from the focused one). False
 * when no title has it.
 */
export const handleClassicyMenuBarAccessKey = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	char: string,
): boolean => {
	const root = tree.rootRef.current;
	if (!root || !env.horizontal) return false;
	const titles = itemsOf(tree, env, root);
	const active = root.ownerDocument.activeElement;
	const focused = active instanceof HTMLElement ? titles.indexOf(active) : -1;
	return actOnAccessKey(tree, env, root, titles, focused, char);
};

/**
 * Moves across the menu bar from `title` (`step` titles over, wrapping).
 * With a menu open on the bar, the next title's menu opens on its first
 * item; with none, the title alone is tracked (WIG Ch.7, p.98).
 */
const moveAcrossBar = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	title: HTMLElement,
	step: 1 | -1,
): boolean => {
	const root = tree.rootRef.current;
	if (!root) return false;
	const titles = itemsOf(tree, env, root);
	const next = stepThrough(tree, env, titles, titles.indexOf(title), step);
	if (!next) return false;
	const menuOpen = tree.lists.get(root)?.current?.openChildId != null;
	if (menuOpen && openAndEnter(tree, env, next)) return true;
	if (menuOpen) closeChildOf(tree, root);
	env.focusItem(next);
	return true;
};

/**
 * The list a key acts in and the item it acts from: a bar title whose menu
 * is shown hands Up, Down, Home, End and typing to that menu (nothing in it
 * current yet, unless the pointer rests on one of its items); any other item
 * acts in its own list. The pointer's item wins over the focused one while
 * the pointer last moved the tracking (WIG Ch.7: one item is tracked, by
 * pointer or keyboard).
 */
const actingList = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	current: HTMLElement,
): { list: HTMLElement; items: HTMLElement[]; from: number } | null => {
	const handle = handleOf(tree, current);
	const sub =
		isTitle(tree, env, current) && handle?.open
			? classicyMenuSubmenuOf(tree, current)
			: null;
	const list = sub ?? classicyMenuListOf(tree, current);
	if (!list) return null;
	const items = itemsOf(tree, env, list);
	const hovered =
		env.hovered && classicyMenuListOf(tree, env.hovered) === list
			? env.hovered
			: null;
	const from = hovered
		? items.indexOf(hovered)
		: sub
			? -1
			: items.indexOf(current);
	return { list, items, from };
};

/**
 * Handles `event` for the menu tree, `current` being the item that has
 * focus (null when focus is outside the menus: a contextual menu opened by
 * the pointer leaves it where it was). True when the key was the menus'.
 *
 * With focus on an item: Up and Down move through its list, wrapping and
 * passing over dividers (and dimmed items, unless the package browses them),
 * and on a bar title open its menu on the first item; Right opens a submenu
 * on its first item, or moves to the next bar title; Left closes a submenu,
 * or moves to the previous title; Home and End go to the list's ends; Return
 * and Space do what a click does (a submenu opens on its first item); Escape
 * closes one level: a submenu back to its item, a bar's menu back to its
 * title (which keeps focus), then the bar itself, focus going back where it
 * was, and a pop-up menu altogether; a letter or digit that is an item's
 * access key chooses it (`actOnAccessKey`), Alt held or not; any other
 * printable character jumps to the next item it starts. With focus outside
 * the menus only Escape (one level), Up and Down (into the deepest shown
 * list, first or last item) and an access key of that list are the menus'.
 */
export const handleClassicyMenuKey = (
	tree: ClassicyMenuTree,
	env: ClassicyMenuKeyboardEnv,
	event: ClassicyMenuKey,
	current: HTMLElement | null,
): boolean => {
	const { key } = event;
	if (event.ctrlKey || event.metaKey) return false;
	const accessChar = classicyAccessKeyFromEvent(event);
	// Alt held with a letter or digit is the access key (a Windows user keeps
	// Alt down through Alt+F, X; Wine's menu loop takes WM_SYSCHAR as
	// WM_CHAR); every other Alt chord is its owner's.
	if (event.altKey)
		return accessChar !== null && accessKeyFrom(tree, env, current, accessChar);

	if (!current) {
		const list = classicyMenuDeepestOpenList(tree);
		if (!list) return false;
		if (key === "Escape") {
			const parent = classicyMenuParentItemOf(tree, list);
			if (parent && !isTitle(tree, env, parent)) {
				const parentList = classicyMenuListOf(tree, parent);
				closeChildOf(tree, parentList);
			} else {
				env.closeAll();
			}
			return true;
		}
		if (key === "ArrowDown" || key === "ArrowUp") {
			// A bar with nothing open has nothing to enter.
			if (list === tree.rootRef.current && env.horizontal) return false;
			const items = itemsOf(tree, env, list);
			const hovered =
				env.hovered && classicyMenuListOf(tree, env.hovered) === list
					? items.indexOf(env.hovered)
					: -1;
			const target = stepThrough(
				tree,
				env,
				items,
				hovered,
				key === "ArrowDown" ? 1 : -1,
			);
			if (!target) return false;
			env.focusItem(target);
			return true;
		}
		if (accessChar !== null) return accessKeyFrom(tree, env, null, accessChar);
		return false;
	}

	const handle = handleOf(tree, current);
	const list = classicyMenuListOf(tree, current);
	if (!handle || !list) return false;
	const title = isTitle(tree, env, current);

	switch (key) {
		case "ArrowDown":
		case "ArrowUp": {
			const step = key === "ArrowDown" ? 1 : -1;
			// A closed title's menu opens on its first item, whichever arrow
			// (Windows selects the first: Wine's MENU_ShowSubPopup); an open
			// one is entered at the arrow's end, from the pointer's item if it
			// rests on one.
			if (title && !handle.open) return openAndEnter(tree, env, current);
			const acting = actingList(tree, env, current);
			if (!acting) return false;
			const target = stepThrough(tree, env, acting.items, acting.from, step);
			if (!target) return false;
			closeChildOf(tree, acting.list);
			env.focusItem(target);
			return true;
		}
		case "Home":
		case "End": {
			const acting = actingList(tree, env, current);
			if (!acting) return false;
			const target = edgeOf(
				tree,
				env,
				acting.items,
				key === "Home" ? "first" : "last",
			);
			if (!target) return false;
			if (acting.list !== tree.rootRef.current || !env.horizontal)
				closeChildOf(tree, acting.list);
			env.focusItem(target);
			return true;
		}
		case "ArrowRight":
		case "ArrowLeft": {
			const step = key === "ArrowRight" ? 1 : -1;
			if (title) return moveAcrossBar(tree, env, current, step);
			if (step === 1 && openAndEnter(tree, env, current)) return true;
			const parent = classicyMenuParentItemOf(tree, list);
			if (step === -1 && parent && !isTitle(tree, env, parent)) {
				env.focusItem(parent);
				closeChildOf(tree, classicyMenuListOf(tree, parent));
				return true;
			}
			// A leaf of a bar's menu, Right, or a bar's menu, Left: the next or
			// previous menu on the bar.
			const owner = titleOf(tree, env, current);
			if (owner) return moveAcrossBar(tree, env, owner, step);
			return false;
		}
		case "Enter":
		case " ": {
			// A closed submenu opens on its first item; anything else does what
			// a click does (an open one closes every menu, a leaf is chosen).
			if (handle.hasChildren && !handle.open && !handle.disabled)
				return openAndEnter(tree, env, current);
			handle.activate();
			return true;
		}
		case "Escape": {
			const parent = classicyMenuParentItemOf(tree, list);
			if (parent && !isTitle(tree, env, parent)) {
				env.focusItem(parent);
				closeChildOf(tree, classicyMenuListOf(tree, parent));
				return true;
			}
			if (parent) {
				// A bar's menu closes; its title keeps focus, still tracked
				// (WIG Ch.7, p.98: "ESC closes the drop-down menu, but leaves its
				// menu title highlighted").
				env.focusItem(parent);
				env.keepFocusOnClose();
				env.closeAll();
				return true;
			}
			if (title && handle.open) {
				env.keepFocusOnClose();
				env.closeAll();
				return true;
			}
			// A title with nothing open (the bar deactivates), or a pop-up
			// menu's own item (the menu closes): focus goes back where it was.
			env.closeAll();
			env.restoreFocus();
			return true;
		}
		default: {
			if (key.length !== 1 || key === " ") return false;
			if (accessChar !== null && accessKeyFrom(tree, env, current, accessChar))
				return true;
			const acting = actingList(tree, env, current);
			if (!acting) return false;
			const target = typeaheadTarget(tree, env, acting.items, acting.from, key);
			if (!target) return false;
			if (acting.list !== tree.rootRef.current || !env.horizontal)
				closeChildOf(tree, acting.list);
			env.focusItem(target);
			return true;
		}
	}
};
