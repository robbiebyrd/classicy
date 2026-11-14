import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import he from "he";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
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
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { useClassicyMenuScrollArrows } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuScrollArrows.internal";
import { POPUP_MENU_VIEWPORT_MARGIN } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";
import { nudgeClassicyOntoPixelGrid } from "@/SystemFolder/SystemResources/Utils/pixelGridNudge.internal";

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
	 * `title`, the image standing in for it). Defaults to `title`.
	 */
	imageAlt?: string;
	/** Dim the item; it cannot be chosen and its keyboard equivalent does not fire. */
	disabled?: boolean;
	/**
	 * When defined, this item is a checkable menu item: it renders a Mac OS 8
	 * checkmark (✓) in the left icon gutter when true, a dash (–) when "mixed",
	 * and an empty (but reserved) gutter when false — keeping siblings aligned.
	 * A checkable item never also shows an icon/image (the mark wins).
	 *
	 * `"mixed"` is the HIG dash (HIGOS7 "Checkmarks and Dashes in Menus"): use it
	 * when an accumulating attribute applies to only PART of the selection (vs. a
	 * checkmark, which means it applies to the whole selection).
	 */
	checked?: boolean | "mixed";
	/** Icon drawn before the title. */
	icon?: string;
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
	/** Called when the item is chosen. Takes precedence over `event`. */
	onClickFunc?: () => void;
	/** Submenu items. The submenu opens to the right, flipping left at the viewport edge. */
	menuChildren?: ClassicyMenuItem[];
	/** Extra class names for the item's `<li>`. */
	className?: string;
	/**
	 * Part name rendered as the item's `data-classicy-part` (the menu bar marks
	 * its clusters: `apple`, `app`, `help`, `switcher`), for theme packages.
	 * It is never rendered as a DOM `part` (shadow-parts) attribute.
	 */
	part?: string;
	/** Balloon help for the item, shown while balloons are on. */
	balloon?: {
		title?: string;
		content: string;
		position?: ClassicyBalloonPosition;
	};
}

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
 * shared Platinum menu frame. Items support checkmarks and dashes, keyboard
 * equivalents, icons, dividers, balloon help and nested submenus (which flip
 * left at the viewport edge).
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
 * A shown list that would run past the bottom of the screen is capped there
 * and scrolls as Mac OS menus do (HIG7 p.78): no scroll bar, an indicator
 * over the first or last row while items lie hidden past it, the list
 * scrolling a row at a time while the pointer rests on one
 * (`useClassicyMenuScrollArrows`). The list then carries
 * `classicyMenuListScrolls`, an open submenu of its items is placed fixed
 * beside its item (so the scrolling list cannot clip it), and a scroll
 * closes it.
 */
export const ClassicyMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems,
	navClass,
	subNavClass,
	children,
	className,
	style,
	open,
}) => {
	const { closeSignal } = useContext(ClassicyMenuContext);
	const [openChildId, setOpenChildId] = useState<string | null>(null);

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

	const listRef = useRef<HTMLUListElement>(null);
	const appearance = useClassicyAppearance("Menu", {}, listRef);

	// The `max-height` a list too tall for the screen below it is capped at,
	// once shown (its content box: its border box then ends at the screen
	// margin); null while it fits (and while hidden).
	const shown = open ?? true;
	const [scrollCap, setScrollCap] = useState<number | null>(null);
	const scrollCapRef = useRef(scrollCap);
	scrollCapRef.current = scrollCap;
	const scrollArrows = useClassicyMenuScrollArrows(listRef, {
		rowSelector: '[role="menuitem"], [role="menuitemcheckbox"]',
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
		const room = window.innerHeight - POPUP_MENU_VIEWPORT_MARGIN - rect.top;
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
		if (scrollCap !== null) {
			// From the wrapper's padding box, as fractions: `offsetLeft` and
			// `offsetWidth` would round.
			const wrapperRect = wrapper.getBoundingClientRect();
			const wrapperStyle = getComputedStyle(wrapper);
			box = {
				left: rect.left - wrapperRect.left - px(wrapperStyle.borderLeftWidth),
				top: rect.top - wrapperRect.top - px(wrapperStyle.borderTopWidth),
				width: rect.width,
				height: rect.height,
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

	return menuItems && menuItems.length > 0 ? (
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
};

const ClassicyMenuItemComponent: FunctionalComponent<{
	menuItem: ClassicyMenuItem;
	subNavClass: string;
	isOpen: boolean;
	onOpen: (id: string, input: ClassicyAppearanceInput) => void;
	onClose: () => void;
}> = memo(({ menuItem, subNavClass, isOpen, onOpen, onClose: _onClose }) => {
	const desktopDispatch = useAppManagerDispatch();
	const { closeAll, menuBarActive, activateMenuBar, pokeActivity } =
		useContext(ClassicyMenuContext);
	const [isFlashing, setIsFlashing] = useState(false);
	const [submenuFlipped, setSubmenuFlipped] = useState(false);
	// Where an open submenu goes when this item's list scrolls: fixed beside
	// the item, out of the scrolling list's clip.
	const [submenuAt, setSubmenuAt] = useState<CSSProperties | undefined>();
	const itemRef = useRef<HTMLLIElement>(null);
	// Its own hook, not the menu's emit: each item is a MenuItem root.
	const appearance = useClassicyAppearance(
		"MenuItem",
		{ disabled: menuItem.disabled, open: isOpen },
		itemRef,
	);

	// Once open, measure the child menu against the viewport; if it would
	// overflow the right edge, flip it to open leftward instead. Measured only
	// on open (not after flipping) so the menu can't oscillate between sides.
	useEffect(() => {
		if (!isOpen) {
			setSubmenuFlipped(false);
			setSubmenuAt(undefined);
			return;
		}
		const item = itemRef.current;
		if (item?.closest("ul")?.classList.contains("classicyMenuListScrolls")) {
			const r = item.getBoundingClientRect();
			setSubmenuAt({
				position: "fixed",
				top: `${r.top}px`,
				left: `${r.left}px`,
				width: `${r.width}px`,
				height: 0,
			});
		}
		const submenu = itemRef.current?.querySelector(
			":scope > .classicyMenuWrapper > ul",
		);
		if (!submenu) return;
		setSubmenuFlipped(
			submenu.getBoundingClientRect().right > window.innerWidth,
		);
	}, [isOpen]);

	const { track } = useClassicyAnalytics();
	const analyticsArgs = useMemo(
		() => ({
			id: menuItem.id,
			title: menuItem.title,
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

	const hasChildren = menuItem.menuChildren && menuItem.menuChildren.length > 0;

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

	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (menuItem.disabled) return;

		if (hasChildren) {
			if (isOpen) {
				closeAll();
			} else {
				onOpen(menuItem.id, withClassicyAppearanceInput().input);
				activateMenuBar();
				appearance.emit(
					"open",
					withClassicyAppearanceInput({ itemId: menuItem.id }),
				);
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

	const handleMouseEnter = () => {
		pokeActivity();
		if (hasChildren && menuBarActive) {
			onOpen(menuItem.id, "pointer");
		}
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

	// A checkable item is a menuitemcheckbox, whose aria-checked carries the
	// state: the ✓ and – are package CSS in an aria-hidden gutter, so without
	// it the state would reach assistive technology only through the look.
	// ARIA 1.2 allows "mixed" on menuitemcheckbox, not on menuitemradio.
	const checkable = menuItem.checked !== undefined;

	// ClassicyMenu renders dividers itself, so every item here is a real one.
	const li = (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is set only with role="menuitemcheckbox"; the role is dynamic, so the rule cannot see it
		<li
			{...appearance.attrs}
			role={checkable ? "menuitemcheckbox" : "menuitem"}
			aria-checked={
				checkable
					? menuItem.checked === "mixed"
						? "mixed"
						: menuItem.checked === true
					: undefined
			}
			tabIndex={-1}
			ref={itemRef}
			id={menuItem.id}
			key={menuItem.id}
			{...{ [CLASSICY_PART_ATTRIBUTE.part]: menuItem.part }}
			onClick={handleClick}
			onKeyDown={(e: React.KeyboardEvent) => {
				pokeActivity();
				if (e.key === "Enter") {
					e.preventDefault();
					handleClick(e as unknown as MouseEvent);
				}
			}}
			onMouseEnter={handleMouseEnter}
			onFocus={(e: React.FocusEvent) => {
				track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
				if (isOwnFocusEvent(e))
					appearance.emit(
						"focus",
						withClassicyAppearanceInput({ itemId: menuItem.id }),
					);
			}}
			onBlur={(e: React.FocusEvent) => {
				if (isOwnFocusEvent(e))
					appearance.emit(
						"blur",
						withClassicyAppearanceInput({ itemId: menuItem.id }),
					);
			}}
			onAnimationEnd={handleAnimationEnd}
			onMouseOver={(e: React.MouseEvent) => {
				track("hover", { type: "ClassicyMenuItem", ...analyticsArgs });
				if (isOwnMouseOver(e))
					appearance.emit("focus", { itemId: menuItem.id, input: "pointer" });
			}}
			onMouseLeave={() =>
				appearance.emit("blur", { itemId: menuItem.id, input: "pointer" })
			}
			className={classNames(
				"classicyMenuItem",
				menuItem.icon ? "" : "classicyMenuItemNoImage",
				menuItem.className,
				appearance.className,
				hasChildren ? "classicyMenuItemChildMenuIndicator" : "",
			)}
			style={appearance.style}
		>
			<p>
				{menuItem.checked !== undefined ? (
					<span
						className={classNames(
							"classicyMenuItemCheck",
							classicyStateClasses({
								checked: menuItem.checked === true,
								mixed: menuItem.checked === "mixed",
							}),
						)}
						aria-hidden={"true"}
					/>
				) : menuItem.image ? (
					<ClassicyIconImage
						src={menuItem.image}
						alt={menuItem.imageAlt ?? menuItem.title}
					/>
				) : menuItem.icon ? (
					<ClassicyIconImage src={menuItem.icon} alt={menuItem.title} />
				) : null}
				{menuItem.title &&
					(widthSamples.length > 0 ? (
						<span className={"classicyMenuItemTitleSizer"}>
							<span>{he.decode(menuItem.title)}</span>
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
						he.decode(menuItem.title)
					))}
			</p>
			{menuItem.keyboardShortcut && (
				<ClassicyKbd
					variant="inline"
					shortcut={menuItem.keyboardShortcut}
					className="classicyMenuItemKeyboardShortcut"
				/>
			)}

			{hasChildren && (
				<ClassicyMenu
					name={`${menuItem.id}_subitem`}
					menuItems={menuItem.menuChildren ?? []}
					open={isOpen}
					style={submenuAt}
					subNavClass={subNavClass}
					navClass={classNames(
						subNavClass,
						submenuFlipped && "classicySubMenuFlipLeft",
					)}
				></ClassicyMenu>
			)}
		</li>
	);

	return menuItem.balloon ? (
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
