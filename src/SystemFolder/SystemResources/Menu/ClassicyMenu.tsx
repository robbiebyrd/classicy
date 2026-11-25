import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import he from "he";
import {
	type CSSProperties,
	type FocusEvent,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import {
	type ClassicyAppearanceInput,
	withClassicyAppearanceInput,
} from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	CLASSICY_PART_ATTRIBUTE,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyBalloonHelp,
	type ClassicyBalloonPosition,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import {
	type ClassicyAccessKey,
	classicyAccessKeyFromEvent,
	markClassicyMenuShown,
	renderClassicyAccessKeyText,
	resolveClassicyAccessKeys,
	warnClassicyDuplicateAccessKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { classicyMenuBounds } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";
import { ClassicyMenuScrollMarginContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuScrollMargin.internal";
import {
	ClassicyMenuStatusContext,
	markClassicyMenuStatusShown,
	publishClassicyMenuStatusText,
	withdrawClassicyMenuStatusText,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuStatusText.internal";
import {
	type ClassicyMenuItemHandle,
	type ClassicyMenuKeyboardEnv,
	type ClassicyMenuListHandle,
	type ClassicyMenuTree,
	ClassicyMenuTreeContext,
	classicyMenuFirstTitle,
	classicyMenuItemOf,
	consumeClassicyMenuSwallowedClick,
	createClassicyMenuTree,
	handleClassicyMenuKey,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuTree.internal";
import { useClassicyMenuBarAccessKeys } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuBarAccessKeys.internal";
import { useClassicyMenuPress } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuPress.internal";
import { useClassicyMenuScrollArrows } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuScrollArrows.internal";
import {
	ClassicyMenuPlacementEpoch,
	useClassicySubmenuPlacement,
} from "@/SystemFolder/SystemResources/Menu/useClassicySubmenuPlacement.internal";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";
import { nudgeClassicyOntoPixelGrid } from "@/SystemFolder/SystemResources/Utils/pixelGridNudge.internal";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

/**
 * One menu entry, shared by the menu bar, contextual menus, pop-up bevel
 * buttons and menu bar extensions. Menus are plain data: an item with
 * `menuChildren` opens a submenu, and `{ id: "spacer" }` is a divider.
 */
export interface ClassicyMenuItem {
	/** Unique id within the menu (the DOM id). `"spacer"` renders a divider. */
	id: string;
	/** Item text. HTML entities are decoded. */
	title?: string;
	/** Image drawn before the title (takes precedence over `icon`). */
	image?: string;
	/**
	 * The image's alternative text, for an item drawn as its image alone (no
	 * `title`, the image standing in for it). Defaults to `title`. With no
	 * `title`, the item's analytics events carry it as their `title`.
	 */
	imageAlt?: string;
	/** Dim the item; it cannot be chosen and its keyboard equivalent does not fire. */
	disabled?: boolean;
	/**
	 * When defined, this item is a checkable menu item: it renders a Mac OS 8
	 * checkmark (✓) in the left icon gutter when true, a dash (–) when "mixed",
	 * and an empty (but reserved) gutter when false — keeping siblings aligned.
	 * A checkable item with an icon/image draws both, the mark first (the
	 * Application menu's front application, HIG7 p.127).
	 *
	 * `"mixed"` is the HIG dash (HIGOS7 "Checkmarks and Dashes in Menus"): use it
	 * when an accumulating attribute applies to only PART of the selection (vs. a
	 * checkmark, which means it applies to the whole selection).
	 */
	checked?: boolean | "mixed";
	/**
	 * Which mark a checkable item shows (default `"check"`). `"check"` is an
	 * independent setting, a check box (`role="menuitemcheckbox"`);
	 * `"bullet"` is one choice of an interdependent group, an option button
	 * (`role="menuitemradio"`, `aria-checked` true or false: `"mixed"` reads
	 * as unchecked there, since ARIA 1.2 allows it on a check box alone). The
	 * gutter span then carries `classicyMenuItemBullet` beside
	 * `classicyMenuItemCheck`, so a package can draw the round bullet the
	 * Windows Interface Guidelines show at the chosen item (WIG Ch.7 "Types
	 * of Menu Items" (p.108), Figure 7.5 "Option Button"), while Platinum
	 * and System 7, keyed on `.classicyMenuItemCheck.checked` alone, draw
	 * their check mark for either kind, as Mac OS 8 checks the chosen view.
	 */
	mark?: "check" | "bullet";
	/**
	 * The menu's default item: the command a double-click on the selection
	 * runs (an icon's Open). Emitted as the `default` state class on the
	 * item's `<li>`, which the Windows Interface Guidelines draw in bold
	 * (WIG Ch.7 "Types of Menu Items" (pp.108–109), Figure 7.5 "Default
	 * Item"; Ch.13 "Font and Size" (p.311)). Platinum and System 7 read it
	 * not at all, so a Mac menu is unchanged by it.
	 */
	isDefault?: boolean;
	/**
	 * The item's access key (mnemonic), one character: typed while its menu
	 * is open (Alt held or not) it chooses the item, as Return does (a
	 * submenu opens on its first item); on a menu bar's title, typed with
	 * Alt (or once the bar has the keyboard, after F10 or Alt alone) it opens
	 * the title's menu (WIG Ch.7 "Menu Titles" (p.106), "Menu Item Labels"
	 * (p.109), "The Menu Bar and Drop-down Menus" (p.97)). Items of a menu
	 * sharing a key are moved between instead, none chosen. Its first match
	 * in the title, in the key's own case first (`"a"` on "Favorites" is its
	 * second letter), is wrapped in `<span data-classicy-part="access-key">`,
	 * which a package underlines (Windows 98 does), and the item's
	 * `aria-keyshortcuts` names it (`Alt+F` on a bar's title). A key the
	 * title lacks still works, with nothing drawn. Read only under the
	 * package's `layout.menu.accessKeys`, and typed only under its
	 * `layout.menu.keys` `"windows"`: under Platinum and System 7, which
	 * declare neither (Mac OS menus had no access keys), it is inert.
	 * Under `layout.menu.accessKeys` `"auto"` (Windows 98) an
	 * item without one takes the first character of its title no sibling
	 * holds, never one an explicit sibling holds; `""` gives the item none.
	 */
	accessKey?: string;
	/** Icon drawn before the title. */
	icon?: string;
	/**
	 * Draw the image or icon dimmed by the active package's rule (a hidden
	 * application's, HIG7 p.127; `ClassicyIconImage`'s `dimmed`).
	 */
	imageDimmed?: boolean;
	/**
	 * Keyboard equivalent, in any `parseKeyboardShortcut` spelling (`"⌘S"`,
	 * `"Cmd+Shift+S"`, `"F1"`), drawn right-aligned in glyph form. Items of the
	 * menu bar's menus fire on the chord app-wide; a standalone menu only
	 * displays it.
	 */
	keyboardShortcut?: string;
	/**
	 * When true, the `keyboardShortcut` is handled natively by the browser (e.g.
	 * the Edit menu's ⌘Z/⌘X/⌘C/⌘V/⌘A in a focused text field). The glyph still
	 * renders in the menu, but the app-wide dispatcher does NOT intercept the
	 * keystroke — so native editing keeps working and we don't preventDefault it.
	 * Spelled by name (`layout.menu.shortcutSpelling` `"names"`) off a Mac,
	 * its ⌘ reads `Ctrl`, the key the browser answers there (`ClassicyKbd`'s
	 * `nativeShortcut`).
	 */
	nativeShortcut?: boolean;
	/**
	 * Labels this item's title may take over its lifetime. The item reserves the
	 * width of the widest of them (rendered as hidden, non-measured siblings of
	 * the title), so a title that changes at runtime — the menu bar's App
	 * Switcher tracking the focused app — never resizes the item and shifts the
	 * layout around it. Slack sits to the right of the title.
	 */
	titleWidthSamples?: string[];
	/**
	 * Analytics only: reported with the item's analytics event. Choosing the
	 * item does not navigate — use `onClickFunc` or `event:
	 * "ClassicyDesktopOpenUrl"` for that.
	 */
	link?: string;
	/**
	 * Action type dispatched when the item is chosen, with `eventData` spread
	 * in. Used only when there is no `onClickFunc`, and only with `eventData`
	 * set.
	 */
	event?: string;
	/** Fields spread into the `event` action. */
	eventData?: Record<string, unknown>;
	/**
	 * The item only asks first: its command shows a warning alert, whose
	 * button runs it (Empty Trash, Reset PRAM). The menu appends an ellipsis
	 * to its `title` ("Empty Trash…", as Mac OS 8 and System 7 wrote it),
	 * unless the package's `layout.menu.confirmEllipsis` is `false`
	 * (Windows: WIG Ch.7 "Types of Menu Items", pp.107-108, no ellipsis for
	 * a command that only confirms). Give the title without one.
	 */
	confirms?: boolean;
	/** Called when the item is chosen. Takes precedence over `event`. */
	onClickFunc?: () => void;
	/**
	 * Submenu items. The submenu opens to the right, flipping left at the
	 * viewport edge. An empty array is a plain item, unless the package's
	 * `layout.menu.emptySubmenus` is `"placeholder"` (Windows 98): its submenu
	 * then holds one dimmed "(Empty)" item.
	 */
	menuChildren?: ClassicyMenuItem[];
	/** Extra class names for the item's `<li>`. */
	className?: string;
	/**
	 * Part name rendered as the item's `data-classicy-part` (the menu bar marks
	 * its clusters: `apple`, `app`, `help`, `switcher`), for theme packages.
	 * It is never rendered as a DOM `part` (shadow-parts) attribute.
	 */
	part?: string;
	/**
	 * Help for the item: a balloon shown while balloons are on, or, under a
	 * package whose `layout.menu.itemHelp` is `"statusBar"` (Windows 98), no
	 * balloon and `content` as the menus' status text while the item is
	 * highlighted (a `ClassicyPlacard` with `menuStatus` shows it).
	 */
	balloon?: {
		title?: string;
		content: string;
		position?: ClassicyBalloonPosition;
		/**
		 * The status text while the item is disabled, in place of `content`,
		 * under `layout.menu.itemHelp` `"statusBar"`: why it is unavailable
		 * (WIG Ch.12 "Guidelines for Writing Status Bar Messages", p.278:
		 * "This command is not available because no text is selected.").
		 * Absent, `content` stands. A balloon never shows it.
		 */
		disabledContent?: string;
	};
}

/**
 * `items` with each confirming item's (`confirms`) title as a menu draws it:
 * an ellipsis appended when `ellipsis` is true (Mac OS 8 and System 7), the
 * title as given when it is false (`layout.menu.confirmEllipsis` false,
 * Windows). The same array when no item confirms or `ellipsis` is false;
 * submenus are left to their own menus.
 */
export const withClassicyConfirmEllipsis = (
	items: ClassicyMenuItem[],
	ellipsis: boolean,
): ClassicyMenuItem[] =>
	!ellipsis || !items?.some((item) => item?.confirms && item.title)
		? items
		: items.map((item) =>
				item?.confirms && item.title
					? { ...item, title: `${item.title}\u2026` }
					: item,
			);

interface ClassicyMenuProps {
	/** Menu name, used to key the rendered list. */
	name: string;
	/** The items to render. An empty array renders nothing. */
	menuItems: ClassicyMenuItem[];
	/**
	 * Class names for the menu list itself, the root `<ul>` the menu frame and
	 * items hang from (e.g. `classicyDesktopMenu`, `classicyContextMenu`). Use
	 * this, not `className`, to style or position the list.
	 */
	navClass?: string;
	/** Class names for every nested submenu `<ul>`. */
	subNavClass?: string;
	/** Extra nodes appended inside the root `<ul>`, after the items (the menu bar's clock). */
	children?: ReactNode;
	/**
	 * @deprecated Ignored — never read. Nested menus are styled through
	 * `subNavClass`. Kept so existing callers still type-check.
	 */
	isSubmenu?: boolean;
	/**
	 * Extra class names for the outermost element, the `.classicyMenuWrapper`
	 * around the list (the passthrough rule: `className` lands on the root),
	 * after the component's own. The list `<ul>` takes `navClass` instead.
	 */
	className?: string;
	/** Inline style for the `.classicyMenuWrapper`, merged after the component's own; the list takes none. */
	style?: CSSProperties;
	/**
	 * Whether the list is shown: a submenu's is only while its item is open
	 * (the item passes it). Omitted, the list is taken to be shown as it
	 * mounts (a root menu). A shown list taller than the screen below it
	 * scrolls (below).
	 */
	open?: boolean;
	/**
	 * How a root menu's items are laid out, for the keyboard and the
	 * pointer: `"horizontal"`, a menu bar's titles (Left and Right move
	 * between them, Down opens one, a press on one opens it), or
	 * `"vertical"`, a menu's items (Up and Down move between them). Defaults
	 * to `"vertical"` under a `startActive` `ClassicyMenuProvider` (a
	 * contextual menu, a pop-up bevel button's) and `"horizontal"` under any
	 * other (the screen and window menu bars). Read on a root menu only: a
	 * submenu is always vertical.
	 */
	orientation?: "horizontal" | "vertical";
}

// A pull-down too long for the screen keeps at least this much of its rows
// (two or so; its content box), as a pop-up menu does.
const MENU_MIN_SCROLL_HEIGHT = 64;

const px = (value: string | undefined) => Number.parseFloat(value ?? "") || 0;

/**
 * Puts a submenu's wrapper on the pixel grid. A submenu (a pull-down, a
 * hierarchical menu) hangs where its item is, which may be a fraction of a
 * pixel across, so its frame and shadow would blend their one-pixel columns.
 * The wrapper is moved by under half a pixel, measured by its list (a
 * `position: relative` wrapper by `left`, which carries a list anchored to
 * either of its edges, as the App Switcher's pull-down hangs from the right
 * one; any other, absolute or fixed beside its item, by its two margins):
 * `nudgeClassicyOntoPixelGrid`.
 */
const nudgeMenuWrapperOntoGrid = (wrapper: HTMLElement) => {
	const list = wrapper.querySelector<HTMLElement>(":scope > ul");
	if (!list) return;
	nudgeClassicyOntoPixelGrid(wrapper, list);
};

/**
 * Renders a Platinum menu list from `ClassicyMenuItem` data — the building
 * block of the menu bar, contextual menus and pop-up bevel menus, drawn in the
 * shared Platinum menu frame. Items support checkmarks, dashes and option
 * bullets, a default item, keyboard equivalents, icons, dividers, balloon
 * help and nested submenus (which flip left at the viewport edge).
 *
 * Choosing an item flashes it and plays the menu sounds (both from the
 * appearance package's MenuItem hooks), closes the menu and then runs
 * `onClickFunc` (or dispatches `event` with `eventData`). Disabled items
 * ignore clicks. Render it under a `ClassicyMenuProvider`, which supplies the
 * close and sticky-menu state (without one, choosing an item never closes an
 * open submenu). Most code renders menus through `ClassicyWindow`'s
 * `appMenu`, `ClassicyContextualMenuTarget` or `ClassicyBevelButton` instead
 * of using this directly.
 *
 * A shown list that would run past the bottom of the screen (what shows of
 * its desktop) is capped there and scrolls as Mac OS menus do (HIG7 p.78): no scroll bar, an indicator
 * over the first or last row while items lie hidden past it, the list
 * scrolling a row at a time while the pointer rests on one
 * (`useClassicyMenuScrollArrows`). The list then carries
 * `classicyMenuListScrolls`, an open submenu of its items is placed fixed
 * beside its item (so the scrolling list cannot clip it), and a scroll
 * closes it.
 *
 * A root menu (rendered with no `open`) also takes a press dragged across
 * it, for every package (WIG Ch.7 (p.97); HIGOS8 "Sticky Menus" (p.92)), and
 * the keyboard. Under Mac OS 8's and System 7's menus (the package declares
 * no `layout.menu.keys`) Return alone chooses the focused item, as it
 * always has. Under the package's `layout.menu.keys` `"windows"` (WIG Ch.7
 * (pp.97-98, 101)) its items are tracked by roving focus (each
 * `<li>` is `tabIndex={-1}`; the package draws the focused one on
 * `:focus-visible`): Up and Down move through a list, wrapping and passing
 * over dividers (and over dimmed items, unless the package's
 * `layout.menu.disabledItems` is `"browse"`), and on a menu bar's title open
 * its menu on the first item; Right opens a submenu on its first item, or
 * moves to the next title (opening its menu when one was open); Left closes
 * a submenu, or moves to the previous title; Home and End go to a list's
 * ends; Return and Space do what a click does; a printable character jumps
 * to the next item it starts; Escape closes one level (a menu bar's menu
 * back to its title, which keeps focus, then the bar, focus going back where
 * it was). F10 brings focus to a menu bar's first title (in a window's own
 * bar, the active window's) and back. A pop-up menu shown with focus outside
 * it (a contextual menu opened by the pointer) takes Escape and Up and Down
 * from the document. While the keyboard last moved the tracking, the root
 * list carries the `focused` state, which a package that tracks the item
 * under the pointer alone reads to let the keyboard's item show.
 *
 * A press on a menu bar title opens its menu at once; released over an
 * item it chooses it, over the title (a quick click) the menu stays open,
 * off every menu it closes (`useClassicyMenuPress`). A submenu opened by
 * the pointer waits the package's `layout.menu.submenuDelayMs`, when it
 * declares one, before it opens, and an open one as long before it closes
 * under a resting pointer.
 */
export const ClassicyMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems: givenMenuItems,
	navClass,
	subNavClass,
	children,
	className,
	style,
	open,
	orientation,
}) => {
	const { closeSignal, closeAll, popup, pokeActivity } =
		useContext(ClassicyMenuContext);
	// How far the scroll cap keeps the list from the bounds' bottom: the
	// pop-up menus' margin, unless a host that sits its menu flush on that
	// edge provides another (the Windows shell's Start menu and tray pop-ups).
	const scrollMargin = useContext(ClassicyMenuScrollMarginContext);
	const [openChildId, setOpenChildId] = useState<string | null>(null);
	const layout = useClassicyAppearanceLayout();
	// A confirming item's title as this package writes it: with an ellipsis
	// (Mac OS) or without (`layout.menu.confirmEllipsis` false, Windows).
	const confirmEllipsis = layout.menu?.confirmEllipsis !== false;
	const menuItems = useMemo(
		() => withClassicyConfirmEllipsis(givenMenuItems, confirmEllipsis),
		[givenMenuItems, confirmEllipsis],
	);
	// Windows' menu keyboard (`layout.menu.keys` "windows"); absent, Mac OS
	// 8's and System 7's menus, which take Return alone.
	const windowsKeys = layout.menu?.keys === "windows";
	const submenuDelayMs = layout.menu?.submenuDelayMs;
	const disabledItems = layout.menu?.disabledItems ?? "skip";
	// Absent, no access keys at all (Mac OS 8 and System 7 had none).
	const accessKeyMode = layout.menu?.accessKeys;
	const emptySubmenus = layout.menu?.emptySubmenus ?? "leaf";
	// Where the items' help goes (`layout.menu.itemHelp`): a balloon beside
	// each (Mac OS 8), or the menus' status text, which a bevel button's
	// pop-up outside any window does not give (ClassicyMenuStatusText).
	const statusScope = useContext(ClassicyMenuStatusContext);
	const itemHelp: ClassicyMenuItemHelp =
		layout.menu?.itemHelp !== "statusBar"
			? "balloon"
			: statusScope
				? "status"
				: "none";
	// The access keys of this list's items, siblings resolved together: an
	// explicit key is reserved first, then, under `"auto"`, every other titled
	// item takes the first free character of its title. None without the
	// package's `layout.menu.accessKeys`.
	const accessKeys = useMemo(
		() =>
			resolveClassicyAccessKeys(
				(menuItems ?? []).map((item) =>
					item?.id === "spacer"
						? { text: "" }
						: {
								text: item?.title ? he.decode(item.title) : "",
								accessKey: item?.accessKey,
							},
				),
				accessKeyMode,
			),
		[menuItems, accessKeyMode],
	);
	// Two items of this menu sharing a key (explicit ones; the automatic
	// pick never repeats one): a development warning (WIG Ch.4 "Access
	// Keys", p.27: unique within its scope).
	useEffect(() => {
		warnClassicyDuplicateAccessKeys(
			"Menu",
			accessKeys.map((key, i) => ({
				text: he.decode(menuItems?.[i]?.title ?? ""),
				key: key?.key,
			})),
		);
	}, [accessKeys, menuItems]);

	// A root menu owns its tree's register; a submenu joins its root's.
	const isRoot = open === undefined;
	const listRef = useRef<HTMLUListElement>(null);
	const outerTree = useContext(ClassicyMenuTreeContext);
	const ownTreeRef = useRef<ClassicyMenuTree | null>(null);
	if (isRoot && ownTreeRef.current === null)
		ownTreeRef.current = createClassicyMenuTree(listRef);
	const tree = isRoot ? ownTreeRef.current : outerTree;
	const horizontal =
		isRoot &&
		(orientation ?? (popup ? "vertical" : "horizontal")) === "horizontal";

	// biome-ignore lint/correctness/useExhaustiveDependencies: closeSignal is intentionally used as a trigger; the effect resets menu state when the signal changes
	useEffect(() => {
		setOpenChildId(null);
	}, [closeSignal]);

	// How the latest submenu was opened: the press behind a click or Return,
	// or the pointer for a hover (which no press tracker sees). The effect
	// below reports the open, and the close it causes, with it.
	const openedWithRef = useRef<{
		id: string;
		input: ClassicyAppearanceInput;
	} | null>(null);
	const handleOpen = useCallback(
		(id: string, input: ClassicyAppearanceInput) => {
			openedWithRef.current = { id, input };
			setOpenChildId(id);
		},
		[],
	);
	const handleClose = useCallback(() => setOpenChildId(null), []);

	// This list, as the tree sees it.
	const listHandleRef = useRef<ClassicyMenuListHandle>({
		openChildId,
		closeChild: handleClose,
	});
	listHandleRef.current = { openChildId, closeChild: handleClose };
	useLayoutEffect(() => {
		const el = listRef.current;
		if (!tree || !el) return;
		tree.lists.set(el, listHandleRef);
		return () => {
			if (tree.lists.get(el) === listHandleRef) tree.lists.delete(el);
		};
	});

	// A submenu's pointer time-outs (the package's `layout.menu.submenuDelayMs`):
	// the pointer resting on another item of this list closes the open
	// submenu after the delay, unless it comes back to the open item (its
	// submenu included) first, so a diagonal drag into the submenu survives
	// the siblings it crosses (WIG Ch.7 "Cascading Menus" (pp.104-105)).
	// Absent, nothing closes it but another opening or the menus closing. A
	// menu bar's titles switch at once.
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearHideTimer = useCallback(() => {
		if (hideTimerRef.current !== null) {
			clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	}, []);
	useEffect(() => clearHideTimer, [clearHideTimer]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a pending close is for the submenu that was open when it was armed
	useEffect(() => clearHideTimer(), [openChildId, closeSignal, clearHideTimer]);
	const openChildIdRef = useRef(openChildId);
	openChildIdRef.current = openChildId;
	const handleItemPointerEnter = useCallback(
		(id: string, opensOnHover: boolean) => {
			if (submenuDelayMs === undefined || horizontal) return;
			const openId = openChildIdRef.current;
			if (openId === null || id === openId || opensOnHover) {
				// Back on the open item, or on one whose own submenu replaces it.
				clearHideTimer();
				return;
			}
			if (hideTimerRef.current !== null) return;
			if (submenuDelayMs === 0) {
				setOpenChildId(null);
				return;
			}
			hideTimerRef.current = setTimeout(() => {
				hideTimerRef.current = null;
				setOpenChildId((current) => (current === openId ? null : current));
			}, submenuDelayMs);
		},
		[submenuDelayMs, horizontal, clearHideTimer],
	);

	// The keyboard's tracking (a root menu's). `keyboardDriven`: the keyboard,
	// not the pointer, last moved the tracked item; the root list carries the
	// `focused` state meanwhile. `hoveredRef`: the item the pointer last moved
	// onto, where the keyboard picks up from while the pointer moved last.
	const [keyboardDriven, setKeyboardDriven] = useState(false);
	const keyboardDrivenRef = useRef(false);
	const setDriven = useCallback((driven: boolean) => {
		keyboardDrivenRef.current = driven;
		setKeyboardDriven(driven);
	}, []);
	const hoveredRef = useRef<HTMLElement | null>(null);
	const pointerAtRef = useRef<{ x: number; y: number } | null>(null);
	// Where focus was before the keyboard (or a title's press) brought it
	// into the menus, and whether the keyboard has moved it here since: only
	// then do the menus give it back when they close, so a menu used with
	// the pointer alone leaves focus as it always did.
	const focusBeforeRef = useRef<HTMLElement | null>(null);
	const keyboardTookFocusRef = useRef(false);
	const keepFocusOnCloseRef = useRef(false);
	const restoreFocus = useCallback(() => {
		const root = listRef.current;
		const before = focusBeforeRef.current;
		focusBeforeRef.current = null;
		keyboardTookFocusRef.current = false;
		const active = document.activeElement;
		const focusInMenus =
			active === null ||
			active === document.body ||
			(root?.contains(active) ?? false);
		if (!focusInMenus) return;
		if (before?.isConnected && !root?.contains(before)) {
			before.focus({ preventScroll: true });
		} else if (active instanceof HTMLElement && root?.contains(active)) {
			active.blur();
		}
	}, []);
	const noteFocusEntry = useCallback(() => {
		const root = listRef.current;
		const active = document.activeElement;
		if (
			root &&
			active instanceof HTMLElement &&
			active !== document.body &&
			!root.contains(active)
		)
			focusBeforeRef.current = active;
	}, []);
	const keyboardEnv = useCallback(
		(): ClassicyMenuKeyboardEnv => ({
			horizontal,
			disabledItems,
			closeAll,
			hovered: keyboardDrivenRef.current ? null : hoveredRef.current,
			focusItem: (item) => {
				noteFocusEntry();
				item.focus();
				keyboardTookFocusRef.current = true;
				setDriven(true);
				return document.activeElement === item;
			},
			restoreFocus,
			keepFocusOnClose: () => {
				keepFocusOnCloseRef.current = true;
			},
		}),
		[
			horizontal,
			disabledItems,
			closeAll,
			noteFocusEntry,
			setDriven,
			restoreFocus,
		],
	);

	// The menus closed: a keyboard user's focus goes back where it was (but
	// stays on a title Escape left tracked), and the tracking is the
	// pointer's again.
	const lastCloseSignalRef = useRef(closeSignal);
	useLayoutEffect(() => {
		if (!isRoot || lastCloseSignalRef.current === closeSignal) return;
		lastCloseSignalRef.current = closeSignal;
		setDriven(false);
		if (keepFocusOnCloseRef.current) {
			keepFocusOnCloseRef.current = false;
			return;
		}
		if (keyboardTookFocusRef.current) restoreFocus();
	}, [isRoot, closeSignal, setDriven, restoreFocus]);
	// A pop-up menu unmounting (closed) with the keyboard's focus in it gives
	// focus back first, while its items are still in the document.
	useLayoutEffect(
		() => () => {
			const root = listRef.current;
			if (
				isRoot &&
				keyboardTookFocusRef.current &&
				root?.contains(document.activeElement)
			)
				restoreFocus();
		},
		[isRoot, restoreFocus],
	);

	const { onMouseDown: onPressStart, endPress } = useClassicyMenuPress(
		isRoot ? tree : null,
		{ horizontal, closeAll },
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: closeSignal is a trigger: a close ends any press still tracking
	useEffect(() => endPress(), [closeSignal, endPress]);

	// Keys reaching the document while a root menu is shown but focus is
	// outside it (a contextual menu opened by the pointer leaves focus on
	// what was clicked): Escape closes a level, Up and Down move focus into
	// it, an access key of the deepest shown list chooses its item (a
	// Windows menu takes the keyboard while it is shown; a key no item has
	// passes on). In the capture phase, before the focused element (or a
	// dialog around it) sees them.
	const treeShown = isRoot && (popup === true || openChildId !== null);
	// Shown on Windows' keyboard, the menu takes the keys typed: a bar's
	// title and a label stand down from Alt and a key meanwhile.
	useEffect(() => {
		if (!treeShown || !windowsKeys) return;
		return markClassicyMenuShown();
	}, [treeShown, windowsKeys]);
	// Shown under `layout.menu.itemHelp` "statusBar", the tree's highlighted
	// item gives the status text until it closes.
	useEffect(() => {
		if (!treeShown || itemHelp !== "status") return;
		return markClassicyMenuStatusShown();
	}, [treeShown, itemHelp]);
	useEffect(() => {
		if (!treeShown || !tree || !windowsKeys) return;
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.defaultPrevented) return;
			if (
				e.key !== "Escape" &&
				e.key !== "ArrowDown" &&
				e.key !== "ArrowUp" &&
				classicyAccessKeyFromEvent(e) === null
			)
				return;
			const root = listRef.current;
			if (!root || (e.target instanceof Node && root.contains(e.target)))
				return;
			if (!handleClassicyMenuKey(tree, keyboardEnv(), e, null)) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			pokeActivity();
		};
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [treeShown, tree, windowsKeys, keyboardEnv, pokeActivity]);

	// F10 brings focus to a menu bar's first title, and back (WIG Ch.7, p.98:
	// the keyboard activates the menu bar). A window's own bar answers only
	// while its window is active, so one bar takes it. Windows' keys only.
	const windowActive = useContext(ClassicyWindowActiveContext);
	useEffect(() => {
		if (
			!isRoot ||
			!horizontal ||
			!tree ||
			!windowsKeys ||
			windowActive === false
		)
			return;
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (
				e.defaultPrevented ||
				e.key !== "F10" ||
				e.shiftKey ||
				e.ctrlKey ||
				e.altKey ||
				e.metaKey
			)
				return;
			const root = listRef.current;
			if (!root?.isConnected) return;
			e.preventDefault();
			if (root.contains(document.activeElement)) {
				closeAll();
				restoreFocus();
				return;
			}
			const env = keyboardEnv();
			const first = classicyMenuFirstTitle(tree, env);
			if (first) env.focusItem(first);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		isRoot,
		horizontal,
		tree,
		windowsKeys,
		windowActive,
		closeAll,
		restoreFocus,
		keyboardEnv,
	]);

	// Alt and a title's access key opens its menu; Alt pressed and released
	// alone brings focus to the bar and back, as F10 does (WIG Ch.7, p.97;
	// Appendix B, Table B.2: "ALT Activate or inactivate menu bar mode").
	// Only under Windows' keys, on a bar whose titles have access keys, so a
	// bar without them leaves Alt to the browser as before.
	const titleAccessKeys = useMemo(
		() =>
			new Set(
				isRoot && horizontal
					? accessKeys.flatMap((k) => (k ? [k.key] : []))
					: [],
			),
		[isRoot, horizontal, accessKeys],
	);
	useClassicyMenuBarAccessKeys({
		tree: isRoot && horizontal && windowsKeys ? tree : null,
		listRef,
		windowActive,
		titleKeys: titleAccessKeys,
		keyboardEnv,
		closeAll,
		restoreFocus,
	});

	const onRootKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
		if (e.defaultPrevented || !tree) return;
		const current = classicyMenuItemOf(tree, e.target);
		if (!current) return;
		pokeActivity();
		if (!windowsKeys) {
			// Mac OS menus: Return chooses the focused item as a click does
			// (a submenu's item toggles it), and every other key is left to
			// its owner (a pop-up bevel button's menu walks its items itself).
			if (e.key !== "Enter") return;
			e.preventDefault();
			e.stopPropagation();
			tree.items.get(current)?.current?.activate();
			return;
		}
		if (handleClassicyMenuKey(tree, keyboardEnv(), e, current))
			e.preventDefault();
	};
	const onRootMouseMove = (e: MouseEvent<HTMLUListElement>) => {
		const at = pointerAtRef.current;
		pointerAtRef.current = { x: e.clientX, y: e.clientY };
		// A move of the pointer itself (not the browser's re-dispatch over
		// content that moved under it) hands the tracking back to it.
		if (
			keyboardDrivenRef.current &&
			(!at || at.x !== e.clientX || at.y !== e.clientY)
		)
			setDriven(false);
	};
	const onRootMouseOver = (e: MouseEvent<HTMLUListElement>) => {
		if (tree) hoveredRef.current = classicyMenuItemOf(tree, e.target);
	};
	const onRootFocus = (e: FocusEvent<HTMLUListElement>) => {
		const from = e.relatedTarget;
		if (from instanceof HTMLElement && !e.currentTarget.contains(from))
			focusBeforeRef.current = from;
	};
	const onRootBlur = (e: FocusEvent<HTMLUListElement>) => {
		const to = e.relatedTarget;
		// Focus left the menus (Tab, a click elsewhere): nothing to give back.
		if (to instanceof Node && !e.currentTarget.contains(to)) {
			keyboardTookFocusRef.current = false;
			focusBeforeRef.current = null;
			if (keyboardDrivenRef.current) setDriven(false);
		}
	};

	const appearance = useClassicyAppearance(
		"Menu",
		isRoot ? { focused: keyboardDriven } : {},
		listRef,
	);

	// The `max-height` a list too tall for the screen below it is capped at,
	// once shown (its content box: its border box then ends at the screen
	// margin); null while it fits (and while hidden).
	const shown = open ?? true;
	const [scrollCap, setScrollCap] = useState<number | null>(null);
	const scrollCapRef = useRef(scrollCap);
	scrollCapRef.current = scrollCap;
	const scrollArrows = useClassicyMenuScrollArrows(listRef, {
		rowSelector:
			'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
		// Over the list, in its wrapper's stacking context.
		zIndex: 1,
	});
	const { measure: measureScrollArrows, reset: resetScrollArrows } =
		scrollArrows;
	// The list's full height (its border box), measured while it is uncapped:
	// a capped list's rows may follow its height (rows of `height: 100%`), so
	// it is not measured again until its rows change (below).
	const fullHeightRef = useRef<number | null>(null);
	// Where a capped list's frame shadow is drawn: a sibling over the list,
	// since the scrolling list clips its own pseudo-elements. Placed in their
	// wrapper (the list's containing block), from its padding box, so it
	// moves with the list.
	const [shadowBox, setShadowBox] = useState<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	// The scroll position a rebuild of the rows saves for the list once it is
	// capped again (the effect after the cap's).
	const restoreScrollRef = useRef<number | null>(null);
	// Placed on every render while shown, not only when it opens: the host
	// may place the menu after it mounts (a contextual menu flipping up from
	// the bottom of the screen, a bevel button's pop-up measured hidden
	// below its button, then placed), and moving it re-renders the menu
	// within the same commit, before paint. The cap follows where the list
	// finally is; an unchanged cap sets no state.
	useLayoutEffect(() => {
		const el = listRef.current;
		const wrapper = wrapperRef.current;
		if (!shown || !el || !wrapper || typeof window === "undefined") {
			fullHeightRef.current = null;
			restoreScrollRef.current = null;
			setScrollCap(null);
			setShadowBox(null);
			return;
		}
		// Onto the pixel grid: this menu's own wrapper (a submenu's: a root
		// list is its host's to place), then every open descendant's, in tree
		// order. Layout effects run child-first, so a submenu nudged before its
		// parent moved would be left off the grid; the parent's pass puts it
		// back, and the natural place is read with the nudge cleared.
		const wrappers: HTMLElement[] = open === undefined ? [] : [wrapper];
		wrappers.push(
			...el.querySelectorAll<HTMLElement>(
				".classicyMenuItem.open > .classicyMenuWrapper",
			),
		);
		for (const w of wrappers) nudgeMenuWrapperOntoGrid(w);
		const rect = el.getBoundingClientRect();
		if (rect.height === 0) return;
		const style = getComputedStyle(el);
		// The cap is a `max-height`, which bounds the content box: the list's
		// padding and border come off the room so its border box ends at the
		// margin (Platinum's list carries a pixel of each, a side).
		const frame =
			style.boxSizing === "border-box"
				? 0
				: px(style.paddingTop) +
					px(style.paddingBottom) +
					px(style.borderTopWidth) +
					px(style.borderBottomWidth);
		// The room below it, to the bottom of what shows of its desktop (the
		// desktop's overflow would clip a list run past it), less the margin.
		const room = classicyMenuBounds(el).bottom - scrollMargin - rect.top;
		if (scrollCap === null) {
			// From the list's top to its last laid-out row's bottom (its rows
			// run down in order; a row with no box, `display: none`, is
			// skipped), then its padding and border. Not `scrollHeight`, which
			// counts an open submenu hanging out of it (a menu bar's pull-down)
			// as the list's own overflow.
			let bottom: number | null = null;
			for (
				let row = el.lastElementChild;
				row;
				row = row.previousElementSibling
			) {
				const box = row.getBoundingClientRect();
				if (box.width === 0 && box.height === 0) continue;
				bottom = box.bottom;
				break;
			}
			fullHeightRef.current =
				bottom === null
					? rect.height
					: bottom -
						rect.top +
						el.scrollTop +
						px(style.paddingBottom) +
						px(style.borderBottomWidth);
		}
		const full = fullHeightRef.current ?? rect.height;
		const cap =
			full > room
				? Math.max(Math.floor(room) - frame, MENU_MIN_SCROLL_HEIGHT)
				: null;
		// A cap that holds all of the list's rows (the floor, on a short list
		// low on a short screen) would only mark it scrolling. A list that
		// fits forgets the scroll position a rebuild saved (below).
		const next = cap === null || cap >= full - frame ? null : cap;
		if (next === null) restoreScrollRef.current = null;
		setScrollCap(next);
		let box: typeof shadowBox = null;
		if (next !== null) {
			// Set with the cap, so the sibling is drawn in the cap's own commit:
			// whatever measures the capped list there (its item placing it)
			// finds its shadow, which the list's own pseudo-elements, hidden
			// while it scrolls, no longer draw. From the wrapper's padding box,
			// as fractions: `offsetLeft` and `offsetWidth` would round. Its
			// height is the list's as capped: as drawn when already capped at
			// this cap, else the cap and the frame (a `max-height` bounds the
			// content box).
			const wrapperRect = wrapper.getBoundingClientRect();
			const wrapperStyle = getComputedStyle(wrapper);
			box = {
				left: rect.left - wrapperRect.left - px(wrapperStyle.borderLeftWidth),
				top: rect.top - wrapperRect.top - px(wrapperStyle.borderTopWidth),
				width: rect.width,
				height: scrollCap === next ? rect.height : next + frame,
			};
		}
		setShadowBox((prev) =>
			prev === box ||
			(prev &&
				box &&
				prev.left === box.left &&
				prev.top === box.top &&
				prev.width === box.width &&
				prev.height === box.height)
				? prev
				: box,
		);
	});
	// New items. The same number of rows keeps the cap, the scroll position
	// and the indicators (the desktop's Apple menu and the application
	// switcher rebuild theirs whenever the apps change). Another number
	// measures a capped list again, uncapped, then puts it back where it was
	// scrolled. After the effect above, so its cap gives way to this. An
	// uncapped list is measured on every render, so the effect above has
	// just measured it; clearing its cap here would only undo the one it
	// found (the two sets would cancel, and React would not commit).
	const rowCountRef = useRef(menuItems?.length ?? 0);
	useLayoutEffect(() => {
		const count = menuItems?.length ?? 0;
		if (count === rowCountRef.current) return;
		rowCountRef.current = count;
		if (scrollCapRef.current === null) return;
		restoreScrollRef.current = listRef.current?.scrollTop ?? null;
		fullHeightRef.current = null;
		setScrollCap(null);
	}, [menuItems]);
	useLayoutEffect(() => {
		if (scrollCap === null) {
			resetScrollArrows();
			return;
		}
		const el = listRef.current;
		if (el && restoreScrollRef.current !== null) {
			el.scrollTop = restoreScrollRef.current;
			restoreScrollRef.current = null;
		}
		measureScrollArrows();
	}, [scrollCap, measureScrollArrows, resetScrollArrows]);
	// A capped list its item moves across (flipped or pinned to show inside
	// the desktop, useClassicySubmenuPlacement) takes its indicators along:
	// they are fixed, placed from the list's box. Measured after every
	// render while capped; it sets state only when the box has changed.
	useLayoutEffect(() => {
		if (scrollCap !== null) measureScrollArrows();
	});
	const { emit } = appearance;
	// A submenu opens by a click, Return, or hovering an active menu; it
	// closes when another opens or the menus close. Reported once the open
	// child has changed, whatever changed it.
	const lastOpenChildRef = useRef<string | null>(null);
	useEffect(() => {
		const previous = lastOpenChildRef.current;
		if (previous === openChildId) return;
		lastOpenChildRef.current = openChildId;
		const openedWith = openedWithRef.current;
		openedWithRef.current = null;
		const withInput = <T extends object>(detail: T) =>
			openChildId !== null && openedWith?.id === openChildId
				? { ...detail, input: openedWith.input }
				: withClassicyAppearanceInput(detail);
		if (previous !== null) emit("close", withInput({ itemId: previous }));
		if (openChildId !== null) emit("open", withInput({ itemId: openChildId }));
	}, [openChildId, emit]);

	const menu =
		menuItems && menuItems.length > 0 ? (
			<div
				ref={wrapperRef}
				className={classNames("classicyMenuWrapper", className)}
				style={style}
			>
				<ul
					{...appearance.attrs}
					ref={listRef}
					className={classNames(
						navClass,
						appearance.className,
						scrollCap !== null && "classicyMenuListScrolls",
					)}
					// A root menu takes the keyboard, a press dragged across its
					// menus, and the pointer's moves (which hand the tracking back
					// to it) for its whole tree; its submenus' lists are inside it.
					onKeyDown={isRoot ? onRootKeyDown : undefined}
					onMouseDown={isRoot ? onPressStart : undefined}
					onMouseMove={isRoot ? onRootMouseMove : undefined}
					onMouseOver={isRoot ? onRootMouseOver : undefined}
					onFocus={isRoot ? onRootFocus : undefined}
					onBlur={isRoot ? onRootBlur : undefined}
					style={
						scrollCap === null
							? appearance.style
							: {
									...appearance.style,
									maxHeight: `${scrollCap}px`,
									...scrollArrows.listStyle,
								}
					}
					onScroll={
						scrollCap === null
							? undefined
							: () => {
									scrollArrows.onListScroll();
									// An open submenu sits beside its item, which has moved.
									setOpenChildId(null);
								}
					}
					key={`${name}_menu`}
				>
					{menuItems.map((item: ClassicyMenuItem, index: number) =>
						item?.id === "spacer" ? (
							// A divider is not a menu item: no MenuItem appearance hook.
							<ClassicySeparator
								// biome-ignore lint/suspicious/noArrayIndexKey: separators all share the id "spacer" (it's how they're detected), so the index keeps React keys unique when a menu has more than one
								key={`spacer_${index}`}
							/>
						) : (
							<ClassicyMenuItemComponent
								key={item?.id}
								menuItem={item}
								subNavClass={subNavClass || ""}
								isOpen={openChildId === item.id}
								onOpen={handleOpen}
								onClose={handleClose}
								inBar={horizontal}
								submenuDelayMs={submenuDelayMs}
								onPointerEnter={handleItemPointerEnter}
								accessKeyChar={accessKeys[index]?.key ?? null}
								accessKeyIndex={accessKeys[index]?.index ?? -1}
								emptySubmenus={emptySubmenus}
								itemHelp={itemHelp}
							/>
						),
					)}
					{children}
				</ul>
				{scrollCap !== null && shadowBox && (
					// The capped list's frame shadow, which the package draws on
					// this sibling as it draws the list's own (the list clips it).
					// Absolute in the wrapper, over the list's box, so it moves
					// with the list, and no transformed ancestor can part them.
					<div
						className="classicyMenuScrollShadow"
						aria-hidden="true"
						style={{
							position: "absolute",
							left: `${shadowBox.left}px`,
							top: `${shadowBox.top}px`,
							width: `${shadowBox.width}px`,
							height: `${shadowBox.height}px`,
							pointerEvents: "none",
						}}
					/>
				)}
				{scrollCap !== null && scrollArrows.indicators}
			</div>
		) : null;
	return isRoot ? (
		<ClassicyMenuTreeContext.Provider value={tree}>
			{menu}
		</ClassicyMenuTreeContext.Provider>
	) : (
		menu
	);
};

/**
 * Where an item's help goes: its balloon (`"balloon"`), the menus' status
 * text (`"status"`), or nowhere (`"none"`: status-bar help in a menu that
 * gives no status text).
 */
type ClassicyMenuItemHelp = "balloon" | "status" | "none";

const ClassicyMenuItemComponent: FunctionalComponent<{
	menuItem: ClassicyMenuItem;
	subNavClass: string;
	isOpen: boolean;
	onOpen: (id: string, input: ClassicyAppearanceInput) => void;
	onClose: () => void;
	/** It is a menu bar's title (its list is a horizontal root's). */
	inBar: boolean;
	/** The package's `layout.menu.submenuDelayMs`. */
	submenuDelayMs: number | undefined;
	/** Its list's pointer time-outs: the pointer entered this item. */
	onPointerEnter: (id: string, opensOnHover: boolean) => void;
	/**
	 * Its access key, resolved with its siblings', and where its title shows
	 * it (primitives, so the memo holds while the list is rebuilt the same).
	 */
	accessKeyChar: string | null;
	accessKeyIndex: number;
	/** The package's `layout.menu.emptySubmenus`. */
	emptySubmenus: "leaf" | "placeholder";
	/** Where its help goes (`layout.menu.itemHelp`, its menu's scope). */
	itemHelp: ClassicyMenuItemHelp;
}> = memo((props) => {
	const {
		menuItem,
		subNavClass,
		isOpen,
		onOpen,
		onClose: _onClose,
		inBar,
		submenuDelayMs,
		onPointerEnter,
		accessKeyChar,
		accessKeyIndex,
		emptySubmenus,
		itemHelp,
	} = props;
	const accessKey = useMemo(
		(): ClassicyAccessKey | null =>
			accessKeyChar === null
				? null
				: { key: accessKeyChar, index: accessKeyIndex },
		[accessKeyChar, accessKeyIndex],
	);
	const desktopDispatch = useAppManagerDispatch();
	const { closeAll, menuBarActive, activateMenuBar, pokeActivity, popup } =
		useContext(ClassicyMenuContext);
	const tree = useContext(ClassicyMenuTreeContext);
	const [isFlashing, setIsFlashing] = useState(false);
	const itemRef = useRef<HTMLLIElement>(null);
	// Where its open menu goes: flipped and pinned so it shows inside the
	// desktop, and fixed beside the item while the item's list scrolls.
	const submenuPlacement = useClassicySubmenuPlacement(itemRef, isOpen);
	// Its own hook, not the menu's emit: each item is a MenuItem root.
	const appearance = useClassicyAppearance(
		"MenuItem",
		{
			disabled: menuItem.disabled,
			open: isOpen,
			// The default item, the command a double-click runs, as the state
			// a package draws bold (WIG Ch.7 "Types of Menu Items" (pp.108–109),
			// Figure 7.5 "Default Item"); with `isDefault` absent nothing is
			// emitted, and Platinum and System 7 read it not at all.
			default: menuItem.isDefault === true,
		},
		itemRef,
	);

	const { track } = useClassicyAnalytics();
	const analyticsArgs = useMemo(
		() => ({
			id: menuItem.id,
			// An image-only title (the Apple menu, System 7's Help balloon) is
			// tracked by its accessible name.
			title: menuItem.title ?? menuItem.imageAlt,
			image: menuItem.image,
			disabled: menuItem.disabled,
			icon: menuItem.icon,
			link: menuItem.link,
			event: menuItem.event,
			eventData: menuItem.eventData,
			childrenCount: menuItem.menuChildren?.length,
		}),
		[menuItem],
	);

	// An empty submenu shows one dimmed "(Empty)" item where the package asks
	// for it (Windows 98's Start menu and Favorites); else the item is a leaf.
	const submenuItems = useMemo(
		(): ClassicyMenuItem[] | undefined =>
			emptySubmenus === "placeholder" && menuItem.menuChildren?.length === 0
				? [
						{
							id: `${menuItem.id}_empty`,
							title: "(Empty)",
							disabled: true,
							accessKey: "",
						},
					]
				: menuItem.menuChildren,
		[emptySubmenus, menuItem.menuChildren, menuItem.id],
	);
	const hasChildren = submenuItems && submenuItems.length > 0;

	// The visible title sits in the same grid cell as these, so it reserves its
	// own width — only the *other* candidate labels need ghosts. Dropping the
	// current one also keeps its text a single, unambiguous node in the DOM.
	const widthSamples = useMemo(
		() =>
			(menuItem.titleWidthSamples ?? []).filter(
				(sample) => sample !== menuItem.title,
			),
		[menuItem.titleWidthSamples, menuItem.title],
	);

	// Fallback delay for running a leaf item's action when the flash's
	// animationend never arrives; longer than the .25s flash so the animation
	// wins in the normal case and only this fires when it doesn't.
	const FLASH_ACTION_FALLBACK_MS = 400;

	const executeAction = () => {
		if (menuItem.onClickFunc) {
			menuItem.onClickFunc();
		} else if (menuItem.event && menuItem.eventData) {
			track("selected", { type: "ClassicyMenuItem", ...analyticsArgs });
			desktopDispatch({
				type: menuItem.event,
				...menuItem.eventData,
			});
		}
	};

	// Ref ensures the deferred callback always reads the latest executeAction
	const executeActionRef = useRef(executeAction);
	executeActionRef.current = executeAction;

	// A leaf item's action runs when its flash finishes. `animationend` is the
	// normal trigger, but it never fires where the flash animation doesn't
	// actually run — an environment that drops it, an interrupted animation, or
	// a non-animating test renderer (jsdom) — which would silently swallow the
	// action. A fallback timer armed when the flash starts guarantees the action
	// still runs; `actionRanRef` lets whichever fires first win exactly once.
	const actionRanRef = useRef(false);
	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const finishFlash = () => {
		if (actionRanRef.current) return;
		actionRanRef.current = true;
		if (flashTimerRef.current !== undefined) {
			clearTimeout(flashTimerRef.current);
			flashTimerRef.current = undefined;
		}
		// A click or Return already ended the press over the item: never a
		// lost or canceled one.
		appearance.emit(
			"release",
			withClassicyAppearanceInput({
				itemId: menuItem.id,
				lost: false,
				canceled: false,
			}),
		);
		setIsFlashing(false);
		closeAll();
		// Defer action execution so the close state propagates before the
		// action triggers re-renders that could remount the menu tree.
		requestAnimationFrame(() => {
			executeActionRef.current();
		});
	};
	// Ref so the fallback timer always calls the latest finishFlash.
	const finishFlashRef = useRef(finishFlash);
	finishFlashRef.current = finishFlash;

	// Clear a pending fallback if the item unmounts mid-flash.
	useEffect(
		() => () => {
			if (flashTimerRef.current !== undefined) {
				clearTimeout(flashTimerRef.current);
			}
		},
		[],
	);

	// A submenu waiting on the pointer's time-out (`submenuDelayMs`).
	const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearOpenTimer = () => {
		if (openTimerRef.current !== null) {
			clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
	};
	useEffect(
		() => () => {
			if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
		},
		[],
	);

	// Opens its submenu as a click does: the menus go active (hovering opens
	// siblings' menus) and the item reports `open`.
	const openSubmenu = (input: ClassicyAppearanceInput) => {
		clearOpenTimer();
		onOpen(menuItem.id, input);
		activateMenuBar();
		appearance.emit("open", { itemId: menuItem.id, input });
	};

	// What a click, Return or Space does.
	const activate = () => {
		if (menuItem.disabled) return;

		if (hasChildren) {
			if (isOpen) {
				closeAll();
			} else {
				openSubmenu(withClassicyAppearanceInput().input);
			}
		} else {
			actionRanRef.current = false;
			setIsFlashing(true);
			// A click or Return. The package's press decoration is the flash
			// (Platinum's flash class, in its MenuItem hooks); `release` clears it.
			appearance.emit(
				"press",
				withClassicyAppearanceInput({ itemId: menuItem.id }),
			);
			if (flashTimerRef.current !== undefined) {
				clearTimeout(flashTimerRef.current);
			}
			flashTimerRef.current = setTimeout(() => {
				finishFlashRef.current();
			}, FLASH_ACTION_FALLBACK_MS);
		}
	};

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
		// The click ending a press the menus already acted on (a title's
		// press opened its menu; a press released over another item chose
		// it): `useClassicyMenuPress`.
		if (consumeClassicyMenuSwallowedClick(tree, itemRef.current)) return;
		activate();
	};

	// The tree reaches the item through this, kept current every render.
	const handleRef = useRef<ClassicyMenuItemHandle>(null as never);
	handleRef.current = {
		label: he.decode(menuItem.title ?? menuItem.imageAlt ?? ""),
		accessKey: accessKey?.key ?? null,
		disabled: menuItem.disabled === true,
		hasChildren: hasChildren === true,
		open: isOpen,
		openSubmenu,
		activate,
	};
	useLayoutEffect(() => {
		const el = itemRef.current;
		if (!tree || !el) return;
		tree.items.set(el, handleRef);
		return () => {
			if (tree.items.get(el) === handleRef) tree.items.delete(el);
		};
	});

	// Hovering an active menu opens a submenu. With the package's
	// `submenuDelayMs` (Windows: WIG Ch.7 "Cascading Menus" (pp.104-105)) a
	// cascading menu waits that long under the resting pointer, a pop-up
	// menu's open on hover too and a dimmed item's never do; a bar's titles
	// switch at once, as they always have.
	const handleMouseEnter = () => {
		pokeActivity();
		const delayed = submenuDelayMs !== undefined && !inBar;
		const opensOnHover =
			delayed && hasChildren === true && menuItem.disabled !== true;
		onPointerEnter(menuItem.id, opensOnHover);
		if (!hasChildren) return;
		if (!delayed) {
			if (menuBarActive) onOpen(menuItem.id, "pointer");
			return;
		}
		if (!opensOnHover || !(menuBarActive || popup) || isOpen) return;
		clearOpenTimer();
		if (submenuDelayMs === 0) {
			onOpen(menuItem.id, "pointer");
			return;
		}
		openTimerRef.current = setTimeout(() => {
			openTimerRef.current = null;
			onOpen(menuItem.id, "pointer");
		}, submenuDelayMs);
	};

	const handleAnimationEnd = (e: React.AnimationEvent) => {
		// animationend bubbles: a submenu item's flash reaches every ancestor
		// <li>. Only an animation of this item itself ends its flash, whatever
		// its name: the flash keyframes belong to the Appearance Package.
		if (isFlashing && e.target === e.currentTarget) finishFlash();
	};

	// onFocus, onBlur and onMouseOver bubble from a submenu's items and from
	// this item's own children; report focus and blur for this item only.
	const isOwnFocusEvent = (e: React.FocusEvent) => e.target === e.currentTarget;
	const isOwnMouseOver = (e: React.MouseEvent) =>
		(e.target as Element).closest(".classicyMenuItem") === e.currentTarget;

	// Highlighted (the pointer over its own row, or the keyboard's focus on
	// it) under `layout.menu.itemHelp` "statusBar", the item's help is the
	// menus' status text: `disabledContent` while it is disabled, where given,
	// else `content`, else none (WIG Ch.12 "Status Bar Messages",
	// pp.276-277, Figure 12.7).
	const statusOwnerRef = useRef({});
	const statusText =
		(menuItem.disabled ? menuItem.balloon?.disabledContent : undefined) ??
		menuItem.balloon?.content ??
		"";
	const publishStatus = () => {
		if (itemHelp === "status")
			publishClassicyMenuStatusText(statusOwnerRef.current, statusText);
	};
	const withdrawStatus = () =>
		withdrawClassicyMenuStatusText(statusOwnerRef.current);
	useEffect(
		() => () => withdrawClassicyMenuStatusText(statusOwnerRef.current),
		[],
	);

	// A checkable item is a menuitemcheckbox, whose aria-checked carries the
	// state: the ✓ and – are package CSS in an aria-hidden gutter, so without
	// it the state would reach assistive technology only through the look.
	// An option item (`mark: "bullet"`, one choice of an interdependent
	// group: WIG Ch.7 "Types of Menu Items" (p.108), Figure 7.5 "Option
	// Button") is a menuitemradio, checked or not: ARIA 1.2 allows "mixed"
	// on menuitemcheckbox, not on menuitemradio.
	const checkable = menuItem.checked !== undefined;
	const bullet = checkable && menuItem.mark === "bullet";
	const role = !checkable
		? "menuitem"
		: bullet
			? "menuitemradio"
			: "menuitemcheckbox";
	const ariaChecked = !checkable
		? undefined
		: bullet
			? menuItem.checked === true
			: menuItem.checked === "mixed"
				? "mixed"
				: menuItem.checked === true;

	// ClassicyMenu renders dividers itself, so every item here is a real one.
	const li = (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is set only with role="menuitemcheckbox" or "menuitemradio"; the role is dynamic, so the rule cannot see it
		<li
			{...appearance.attrs}
			role={role}
			aria-checked={ariaChecked}
			// Its access key, for assistive technology (Windows' MSAA reports a
			// menu's mnemonic the same way): Alt and it on a bar's title, the
			// key alone in a menu.
			aria-keyshortcuts={
				accessKey
					? `${inBar ? "Alt+" : ""}${accessKey.key.toUpperCase()}`
					: undefined
			}
			tabIndex={-1}
			ref={itemRef}
			id={menuItem.id}
			key={menuItem.id}
			{...{ [CLASSICY_PART_ATTRIBUTE.part]: menuItem.part }}
			onClick={handleClick}
			// The root menu handles the keys (Return and Space included) for
			// every item of its tree; an item only keeps its menus awake.
			onKeyDown={pokeActivity}
			onMouseEnter={handleMouseEnter}
			onFocus={(e: React.FocusEvent) => {
				track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
				if (isOwnFocusEvent(e)) {
					publishStatus();
					appearance.emit(
						"focus",
						withClassicyAppearanceInput({ itemId: menuItem.id }),
					);
				}
			}}
			onBlur={(e: React.FocusEvent) => {
				if (isOwnFocusEvent(e)) {
					withdrawStatus();
					appearance.emit(
						"blur",
						withClassicyAppearanceInput({ itemId: menuItem.id }),
					);
				}
			}}
			onAnimationEnd={handleAnimationEnd}
			onMouseOver={(e: React.MouseEvent) => {
				track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
				if (isOwnMouseOver(e)) {
					publishStatus();
					appearance.emit("focus", { itemId: menuItem.id, input: "pointer" });
				}
			}}
			onMouseLeave={() => {
				clearOpenTimer();
				withdrawStatus();
				appearance.emit("blur", { itemId: menuItem.id, input: "pointer" });
			}}
			className={classNames(
				"classicyMenuItem",
				menuItem.icon ? "" : "classicyMenuItemNoImage",
				// Its title holds an image (below), so a package sizes the row
				// with a plain class rule (no `:has(> p > img)`, which Firefox
				// 113-120 lacks).
				(menuItem.image || menuItem.icon) && "classicyMenuItemHasImage",
				menuItem.className,
				appearance.className,
				hasChildren ? "classicyMenuItemChildMenuIndicator" : "",
			)}
			style={appearance.style}
		>
			<p>
				{menuItem.checked !== undefined && (
					<span
						className={classNames(
							"classicyMenuItemCheck",
							// An option item's gutter carries the bullet class beside
							// the check's, so a package draws Windows' round bullet
							// there (WIG Ch.7 "Types of Menu Items" (p.108), Figure
							// 7.5 "Option Button") while Platinum and System 7, keyed
							// on `.classicyMenuItemCheck.checked`, keep their check.
							bullet && "classicyMenuItemBullet",
							classicyStateClasses({
								checked: menuItem.checked === true,
								mixed: menuItem.checked === "mixed",
							}),
						)}
						aria-hidden={"true"}
					/>
				)}
				{/* A mark and an image both draw: the Application menu's front
				    application is checked beside its icon (HIG7 p.127). */}
				{menuItem.image ? (
					<ClassicyIconImage
						src={menuItem.image}
						alt={menuItem.imageAlt ?? menuItem.title}
						dimmed={menuItem.imageDimmed}
					/>
				) : menuItem.icon ? (
					<ClassicyIconImage
						src={menuItem.icon}
						alt={menuItem.title}
						dimmed={menuItem.imageDimmed}
					/>
				) : null}
				{menuItem.title &&
					(widthSamples.length > 0 ? (
						<span className={"classicyMenuItemTitleSizer"}>
							<span>
								{renderClassicyAccessKeyText(
									he.decode(menuItem.title),
									accessKey,
								)}
							</span>
							{widthSamples.map((sample) => (
								<span
									key={sample}
									className={"classicyMenuItemTitleSample"}
									aria-hidden={"true"}
								>
									{he.decode(sample)}
								</span>
							))}
						</span>
					) : (
						renderClassicyAccessKeyText(he.decode(menuItem.title), accessKey)
					))}
			</p>
			{menuItem.keyboardShortcut && (
				<ClassicyKbd
					variant="inline"
					shortcut={menuItem.keyboardShortcut}
					nativeShortcut={menuItem.nativeShortcut === true}
					className="classicyMenuItemKeyboardShortcut"
				/>
			)}

			{hasChildren && (
				// Its items measure their own menus again each time this one is
				// placed.
				<ClassicyMenuPlacementEpoch.Provider value={submenuPlacement.epoch}>
					<ClassicyMenu
						name={`${menuItem.id}_subitem`}
						menuItems={submenuItems ?? []}
						open={isOpen}
						style={submenuPlacement.style}
						subNavClass={subNavClass}
						navClass={classNames(
							subNavClass,
							submenuPlacement.flipLeft && "classicySubMenuFlipLeft",
						)}
					></ClassicyMenu>
				</ClassicyMenuPlacementEpoch.Provider>
			)}
		</li>
	);

	// Status-bar help draws no balloon (Windows' menus show none).
	return menuItem.balloon && itemHelp === "balloon" ? (
		<ClassicyBalloonHelp
			title={menuItem.balloon.title}
			content={menuItem.balloon.content}
			position={menuItem.balloon.position ?? "top-left"}
			className="classicyMenuItemBalloonAnchor"
		>
			{li}
		</ClassicyBalloonHelp>
	) : (
		li
	);
});

ClassicyMenuItemComponent.displayName = "ClassicyMenuItemComponent";
