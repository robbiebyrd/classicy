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
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import {
	type ClassicyAppearanceInput,
	withClassicyAppearanceInput,
} from "@/Appearance/useClassicyAppearanceInput.internal";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyBalloonHelp,
	type ClassicyBalloonPosition,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

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
	/** Class names for the root `<ul>` (e.g. `classicyDesktopMenu`, `classicyContextMenu`). */
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
	/** Extra class names, merged onto the `.classicyMenuWrapper` after the component's own. */
	className?: string;
	/** Inline style, merged onto the `.classicyMenuWrapper` after the component's own. */
	style?: CSSProperties;
}

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
 */
export const ClassicyMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems,
	navClass,
	subNavClass,
	children,
	className,
	style,
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
		<div className={classNames("classicyMenuWrapper", className)} style={style}>
			<ul
				{...appearance.attrs}
				ref={listRef}
				className={classNames(navClass, appearance.className)}
				style={appearance.style}
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
			return;
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
		appearance.emit(
			"release",
			withClassicyAppearanceInput({ itemId: menuItem.id }),
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

	// ClassicyMenu renders dividers itself, so every item here is a real one.
	const li = (
		<li
			{...appearance.attrs}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <li> items in a menu require role="menuitem" per ARIA menu pattern
			role="menuitem"
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
					<span className={"classicyMenuItemCheck"} aria-hidden={"true"}>
						{menuItem.checked === "mixed" ? "–" : menuItem.checked ? "✓" : ""}
					</span>
				) : menuItem.image ? (
					<img src={menuItem.image} alt={menuItem.title} />
				) : menuItem.icon ? (
					<img src={menuItem.icon} alt={menuItem.title} />
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
