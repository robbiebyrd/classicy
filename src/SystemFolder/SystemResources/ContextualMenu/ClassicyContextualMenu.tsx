import "./ClassicyContextualMenu.scss";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	classicyMenuBounds,
	classicyMenuInkBox,
	classicyMenuLeftAt,
	classicyMenuPinShiftDown,
	classicyMenuWholePixel,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { ClassicyMenuScrollMarginContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuScrollMargin.internal";
import {
	ClassicyMenuPlacementEpoch,
	useClassicyMenuDesktopResize,
} from "@/SystemFolder/SystemResources/Menu/useClassicySubmenuPlacement.internal";
import { getClassicyTaskbarInsets } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

// A contextual menu's own items, its submenus' left out, the dimmed ones
// included: `ClassicyMenu` renders a plain item as a menuitem, a checkable
// one as a menuitemcheckbox, an option one as a menuitemradio.
const CONTEXT_MENU_ITEM_SELECTOR =
	':scope > .classicyMenuWrapper > ul > li:is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"])';

interface ClassicyMenuProps {
	/** Menu name, used to key the rendered list. */
	name: string;
	/**
	 * Top-left corner `[x, y]` in viewport pixels. The menu keeps to what
	 * shows of its desktop (`.classicyDesktop` where it overlaps the
	 * viewport), its frame's shadow included: it flips left when it would
	 * pass the right edge, up when it would pass the bottom, and is then
	 * pinned inside.
	 */
	position: number[];
	/**
	 * Where the menu's right side goes when it flips left, in viewport pixels
	 * across: `position[0]` (the point) when omitted. A menu bar extension's
	 * pull-down passes its item's right side, so it hangs as a menu bar
	 * title's does.
	 */
	flipLeftTo?: number;
	/** The items to show. Rendered as given — no Help item is added here. */
	menuItems: ClassicyMenuItem[];
	/** Called when the menu should close: an item was chosen, the idle timeout passed, the user clicked outside, or Escape closed it. Unmount the menu here. */
	onClose?: () => void;
	/**
	 * Focus the first item once the menu is placed, as a menu opened from
	 * the keyboard selects it, and, when the menu unmounts with the focus
	 * left nowhere (on the body), give it back to the element that had it
	 * when the menu opened. Defaults to `false`.
	 */
	focusFirstItem?: boolean;
	/**
	 * Take the keyboard while the menu is open, as Windows' menu loop does:
	 * a capture-phase document listener walks the items on the up and down
	 * arrows, the dimmed ones included (Windows highlights a grayed item),
	 * from the focused one (with none, Down focuses the first and Up the
	 * last, wrapping at the ends), and calls `onClose` on ESC; neither key
	 * reaches anything else. With it the menu has no idle timeout. Every
	 * other key passes, so ENTER chooses the focused item. Defaults to
	 * `false`.
	 */
	keyboard?: boolean;
	/**
	 * The element the menu is opened from: a press on it (or inside it) is
	 * not a press outside the menu and does not close it, its owner handling
	 * it. Defaults to none: every press outside the menu closes it.
	 */
	anchor?: Element;
	/** Extra class names, merged onto the root wrapper after the component's own. */
	className?: string;
	/**
	 * Inline style, merged onto the root wrapper after the component's own. A
	 * `left`/`top` here overrides the menu's position, viewport flip included.
	 */
	style?: CSSProperties;
}

/**
 * A Platinum pop-up menu rendered at a fixed point — the low-level surface
 * behind contextual menus and menu bar extension dropdowns. It opens already
 * active (sticky, HIGOS8 p.92), flips to stay inside the desktop, and calls
 * `onClose` on a selection, a click outside, Escape (an open submenu closing
 * first: WIG Ch.7 "Pop-up Menu Interaction" (p.101)) or the idle time-out
 * (15 seconds unless the package's `layout.menuBar.idleTimeoutMs` says
 * otherwise). Up and Down take the keyboard into it from wherever focus is.
 *
 * For right-click menus you usually don't render it yourself: wrap a control
 * in `ClassicyContextualMenuTarget`, pass `contextMenu` to a window or app, or
 * call `useClassicyContextualMenu().showContextMenu`. Those go through the
 * desktop's `ClassicyContextualMenuProvider`, which also adds the HIG's leading
 * Help item. Render it directly to open a menu at an arbitrary point:
 *
 * ```tsx
 * {open && (
 *   <ClassicyContextualMenu name="myapp_dropdown" position={[x, y]}
 *     menuItems={items} onClose={() => setOpen(false)} />
 * )}
 * ```
 */
export const ClassicyContextualMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems,
	position,
	flipLeftTo,
	onClose,
	focusFirstItem = false,
	keyboard = false,
	anchor,
	className,
	style,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Where the focus was before a menu that takes it (`focusFirstItem`)
	// moved it to its first item: given back when the menu unmounts.
	const returnFocusToRef = useRef<HTMLElement | null>(null);
	// Start at the requested point; the layout effect flips the root menu
	// leftward if it would pass the right edge of what shows of its desktop
	// (its frame's shadow included), upward if it would pass the bottom (a
	// click on the Control Strip, say), and pins it inside — HIG contextual
	// menus. Before paint, so no frame shows it off the desktop.
	const [left, setLeft] = useState<number>(position[0]);
	const [top, setTop] = useState<number>(position[1]);
	// Opened from below the menu bounds' bottom: a point in the Windows
	// shell's taskbar band (the bounds end at its top edge; plan 0020-w98
	// §2, "Menus keep above the taskbar"), where the menu is pinned flush on
	// the band, so its scroll cap keeps no margin there, as the band's own
	// pop-ups keep none (`ClassicyBevelButtonPopup`'s `menuScrollMargin`):
	// a menu that fits is drawn whole. A point inside the bounds (every
	// point on a desktop with no taskbar) keeps the margin, as always.
	const inheritedScrollMargin = useContext(ClassicyMenuScrollMarginContext);
	const [fromBelowBounds, setFromBelowBounds] = useState(false);
	// Bumped when the desktop changes size while the menu is open: it is
	// placed again against the desktop's new box.
	const [desktopSize, setDesktopSize] = useState(0);
	const remeasure = useCallback(() => setDesktopSize((n) => n + 1), []);
	useClassicyMenuDesktopResize(wrapperRef, true, remeasure);

	// biome-ignore lint/correctness/useExhaustiveDependencies: desktopSize is a trigger, not read: the desktop's new box is measured
	useLayoutEffect(() => {
		setLeft(position[0]);
		setTop(position[1]);
		const el = wrapperRef.current;
		if (!el) return;
		const frame = el.getBoundingClientRect();
		const list = el.querySelector(":scope > .classicyMenuWrapper > ul");
		const ink = classicyMenuInkBox(
			el,
			list,
			list?.parentElement?.querySelector(":scope > .classicyMenuScrollShadow"),
		);
		const bounds = classicyMenuBounds(el);
		const inkLeft = ink ? Math.max(frame.left - ink.left, 0) : 0;
		const inkRight = ink ? Math.max(ink.right - frame.right, 0) : 0;
		setLeft(
			classicyMenuWholePixel(
				classicyMenuLeftAt(
					position[0],
					flipLeftTo ?? position[0],
					frame.width,
					inkLeft,
					inkRight,
					bounds,
				),
				frame.width,
				inkLeft,
				inkRight,
				bounds.left,
				bounds.right,
			),
		);
		// Down: below the point where it fits, else above it, then pinned
		// inside the bounds (a menu taller than them is capped and scrolls,
		// ClassicyMenu).
		const inkTop = ink ? Math.max(frame.top - ink.top, 0) : 0;
		const inkBottom = ink ? Math.max(ink.bottom - frame.bottom, 0) : 0;
		const inkAt = (y: number) => ({
			left: 0,
			right: 0,
			top: y - inkTop,
			bottom: y + frame.height + inkBottom,
		});
		// Only a taskbar's band lies below the bounds: with none published (every
		// package without `layout.taskbar`) no point counts, wherever a host
		// opened the menu.
		setFromBelowBounds(
			getClassicyTaskbarInsets().bottom > 0 && position[1] > bounds.bottom,
		);
		let y = position[1];
		if (inkAt(y).bottom > bounds.bottom) y = position[1] - frame.height;
		setTop(
			classicyMenuWholePixel(
				y + classicyMenuPinShiftDown(inkAt(y), bounds),
				frame.height,
				inkTop,
				inkBottom,
				bounds.top,
				bounds.bottom,
			),
		);
	}, [position[0], position[1], flipLeftTo, desktopSize]);

	// `focusFirstItem`: the first item takes the focus once the menu is
	// placed (after the placement effect above, so nothing scrolls), and
	// again when the menu is shown anew with other items or at another point.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the items and the point are triggers, not read: a menu shown anew selects its first item again
	useLayoutEffect(() => {
		if (!focusFirstItem) return;
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		// The focus it moves, unless it is already the menu's (a menu shown
		// anew over one that had it keeps the first one's).
		const active = document.activeElement;
		if (
			active instanceof HTMLElement &&
			active !== document.body &&
			!wrapper.contains(active)
		)
			returnFocusToRef.current = active;
		wrapper
			.querySelector<HTMLElement>(CONTEXT_MENU_ITEM_SELECTOR)
			?.focus({ preventScroll: true });
	}, [focusFirstItem, menuItems, position[0], position[1]]);

	// Closed with the focus on one of its items, the focus is left on the
	// body (the item went with the menu): it goes back where it was.
	useEffect(
		() => () => {
			const target = returnFocusToRef.current;
			if (!target?.isConnected) return;
			const active = document.activeElement;
			if (active && active !== document.body) return;
			target.focus({ preventScroll: true });
		},
		[],
	);

	// `keyboard`: the arrows and ESC are the menu's while it is open, held
	// in the capture phase so neither a focused control under the menu nor a
	// dialog's ESC sees them.
	useEffect(() => {
		if (!keyboard) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopImmediatePropagation();
				onClose?.();
				return;
			}
			if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
			const items = Array.from(
				wrapperRef.current?.querySelectorAll<HTMLElement>(
					CONTEXT_MENU_ITEM_SELECTOR,
				) ?? [],
			);
			if (items.length === 0) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			const current = items.indexOf(document.activeElement as HTMLElement);
			const step = e.key === "ArrowDown" ? 1 : -1;
			const next =
				current < 0
					? step === 1
						? 0
						: items.length - 1
					: (current + step + items.length) % items.length;
			items[next].focus({ preventScroll: true });
		};
		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [keyboard, onClose]);

	const handleClickOutside = useCallback(
		(e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node) &&
				!anchor?.contains(e.target as Node)
			) {
				onClose?.();
			}
		},
		[onClose, anchor],
	);

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [handleClickOutside]);

	return (
		<ClassicyMenuProvider
			onClose={onClose}
			startActive={true}
			// A menu that takes the keyboard waits for it, as Windows' menu
			// loop does; every other one closes after the idle timeout.
			idleTimeoutMs={keyboard ? 0 : undefined}
		>
			<div
				ref={wrapperRef}
				className={classNames("classicyContextMenuWrapper", className)}
				// On whole pixels: the frame and shadow placed a fraction across
				// blend their one-pixel columns (Firefox).
				style={{ left: Math.round(left), top: Math.round(top), ...style }}
			>
				{/* Its items' submenus are measured again after it is placed
				    again (a desktop resize). */}
				<ClassicyMenuPlacementEpoch.Provider value={desktopSize}>
					<ClassicyMenuScrollMarginContext.Provider
						value={fromBelowBounds ? 0 : inheritedScrollMargin}
					>
						<ClassicyMenu
							name={name}
							menuItems={menuItems}
							navClass={"classicyContextMenu"}
							subNavClass={"classicyContextSubMenu"}
						></ClassicyMenu>
					</ClassicyMenuScrollMarginContext.Provider>
				</ClassicyMenuPlacementEpoch.Provider>
			</div>
		</ClassicyMenuProvider>
	);
};
