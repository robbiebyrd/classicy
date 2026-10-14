import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	type ClassicyBevelPopupDirection,
	classicyBevelPopupPlacement,
} from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";

const MENU_ITEM_SELECTOR = 'li[role="menuitem"]:not(.classicyMenuItemDisabled)';

type ClassicyBevelButtonPopupProps = {
	id: string;
	anchor: DOMRect;
	direction: ClassicyBevelPopupDirection;
	/** The menu to show (HIG Figure 2-15). */
	menuItems: ClassicyMenuItem[];
	/** Accessible name for the menu. */
	label?: string;
	/** Move focus onto the first enabled item — set when opened by keyboard. */
	focusFirstItem?: boolean;
	/** The owning button: a press on it toggles the popup, so it is not "outside". */
	buttonRef: RefObject<HTMLButtonElement | null>;
	onClose: () => void;
};

/**
 * The surface a pop-up bevel button reveals: a Platinum menu built from the
 * shared menu components (checkmarks, separators, submenus and the sticky-menu
 * idle close all come with them). Rendered into a
 * fixed-position portal beside the button and dismissed by a press outside,
 * Escape, scrolling or resizing — the same rules as ClassicyPopUpMenu.
 */
export const ClassicyBevelButtonPopup: FunctionalComponent<
	ClassicyBevelButtonPopupProps
> = ({
	id,
	anchor,
	direction,
	menuItems,
	label,
	focusFirstItem = false,
	buttonRef,
	onClose,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Null until measured: the first paint is hidden so the popup never flashes
	// at an unplaced position.
	const [position, setPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);

	useLayoutEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;
		const { width, height } = el.getBoundingClientRect();
		setPosition(
			classicyBevelPopupPlacement(
				anchor,
				{ width, height },
				{ width: window.innerWidth, height: window.innerHeight },
				direction,
			),
		);
	}, [anchor, direction]);

	useLayoutEffect(() => {
		if (!focusFirstItem || !position) return;
		const first =
			wrapperRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
		first?.focus();
	}, [focusFirstItem, position]);

	useEffect(() => {
		const onPointerDown = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				wrapperRef.current?.contains(target) ||
				buttonRef.current?.contains(target)
			) {
				return;
			}
			onClose();
		};
		const onKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		// A fixed-position portal cannot follow its button, so anything that
		// moves the button closes the popup — except scrolling inside the popup.
		const onScroll = (e: Event) => {
			const target = e.target;
			if (target instanceof Node && wrapperRef.current?.contains(target)) {
				return;
			}
			onClose();
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onClose);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onClose);
		};
	}, [buttonRef, onClose]);

	// Menu items keep focus off the button, so arrow keys walk them here.
	const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		const items = Array.from(
			wrapperRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ??
				[],
		);
		if (items.length === 0) return;
		e.preventDefault();
		const current = items.indexOf(document.activeElement as HTMLElement);
		const step = e.key === "ArrowDown" ? 1 : -1;
		const next =
			current < 0
				? step === 1
					? 0
					: items.length - 1
				: (current + step + items.length) % items.length;
		items[next].focus();
	};

	const style = {
		left: position?.left ?? anchor.left,
		top: position?.top ?? anchor.bottom,
		visibility: position ? undefined : ("hidden" as const),
	};

	const surface = (
		<ClassicyMenuProvider onClose={onClose} startActive={true}>
			<div
				ref={wrapperRef}
				id={id}
				role="menu"
				aria-label={label}
				className="classicyBevelButtonPopup"
				style={style}
				onKeyDown={onMenuKeyDown}
			>
				<ClassicyMenu
					name={id}
					menuItems={menuItems}
					navClass="classicyContextMenu"
					subNavClass="classicyContextSubMenu"
				/>
			</div>
		</ClassicyMenuProvider>
	);

	return createPortal(
		surface,
		document.getElementById("classicyDesktop") ?? document.body,
	);
};
