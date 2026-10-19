import "./ClassicyContextualMenu.scss";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import {
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
	 * Top-left corner `[x, y]` in viewport pixels. The menu flips left or up
	 * when it would overflow the right or bottom edge of the viewport.
	 */
	position: number[];
	/** The items to show. Rendered as given — no Help item is added here. */
	menuItems: ClassicyMenuItem[];
	/** Called when the menu should close: an item was chosen, the idle timeout passed, or the user clicked outside. Unmount the menu here. */
	onClose?: () => void;
}

/**
 * A Platinum pop-up menu rendered at a fixed point — the low-level surface
 * behind contextual menus and menu bar extension dropdowns. It opens already
 * active (sticky, HIGOS8 p.92), flips to stay inside the viewport, and calls
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
	onClose,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Start at the requested point; the layout effect flips the root menu
	// leftward if it would overflow the right edge of the viewport, and upward
	// if it would overflow the bottom (a click on the Control Strip, say) — HIG
	// contextual menus.
	const [left, setLeft] = useState<number>(position[0]);
	const [top, setTop] = useState<number>(position[1]);

	useLayoutEffect(() => {
		setLeft(position[0]);
		setTop(position[1]);
		const el = wrapperRef.current;
		if (!el) return;
		const { width, height } = el.getBoundingClientRect();
		if (position[0] + width > window.innerWidth) {
			setLeft(Math.max(0, position[0] - width));
		}
		if (position[1] + height > window.innerHeight) {
			setTop(Math.max(0, position[1] - height));
		}
	}, [position[0], position[1]]);

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
				className={"classicyContextMenuWrapper"}
				style={{ left, top }}
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
