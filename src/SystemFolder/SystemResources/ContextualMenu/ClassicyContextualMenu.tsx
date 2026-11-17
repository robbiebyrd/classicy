import "./ClassicyContextualMenu.scss";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	classicyMenuBounds,
	classicyMenuInkBox,
	classicyMenuLeftAt,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { useClassicyMenuDesktopResize } from "@/SystemFolder/SystemResources/Menu/useClassicySubmenuPlacement.internal";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

interface ClassicyMenuProps {
	/** Menu name, used to key the rendered list. */
	name: string;
	/**
	 * Top-left corner `[x, y]` in viewport pixels. The menu flips left when
	 * it would pass the right edge of its desktop (`.classicyDesktop`, else
	 * the viewport), its frame's shadow included, and is then pinned inside
	 * the desktop; it flips up when it would pass the viewport's bottom edge.
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
	/** Called when the menu should close: an item was chosen, the idle timeout passed, or the user clicked outside. Unmount the menu here. */
	onClose?: () => void;
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
 * `onClose` on a selection, a click outside or 15 seconds idle.
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
	className,
	style,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Start at the requested point; the layout effect flips the root menu
	// leftward if it would pass the right edge of its desktop (its frame's
	// shadow included), pins it inside the desktop, and flips it upward if
	// it would overflow the bottom (a click on the Control Strip, say) — HIG
	// contextual menus. Before paint, so no frame shows it off the desktop.
	const [left, setLeft] = useState<number>(position[0]);
	const [top, setTop] = useState<number>(position[1]);
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
		setLeft(
			classicyMenuLeftAt(
				position[0],
				flipLeftTo ?? position[0],
				frame.width,
				ink ? Math.max(frame.left - ink.left, 0) : 0,
				ink ? Math.max(ink.right - frame.right, 0) : 0,
				classicyMenuBounds(el),
			),
		);
		if (position[1] + frame.height > window.innerHeight) {
			setTop(Math.max(0, position[1] - frame.height));
		}
	}, [position[0], position[1], flipLeftTo, desktopSize]);

	const handleClickOutside = useCallback(
		(e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				onClose?.();
			}
		},
		[onClose],
	);

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [handleClickOutside]);

	return (
		<ClassicyMenuProvider onClose={onClose} startActive={true}>
			<div
				ref={wrapperRef}
				className={classNames("classicyContextMenuWrapper", className)}
				// On whole pixels: the frame and shadow placed a fraction across
				// blend their one-pixel columns (Firefox).
				style={{ left: Math.round(left), top: Math.round(top), ...style }}
			>
				<ClassicyMenu
					name={name}
					menuItems={menuItems}
					navClass={"classicyContextMenu"}
					subNavClass={"classicyContextSubMenu"}
				></ClassicyMenu>
			</div>
		</ClassicyMenuProvider>
	);
};
