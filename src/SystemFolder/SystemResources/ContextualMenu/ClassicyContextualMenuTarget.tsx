import "./ClassicyContextualMenuTarget.scss";
import type {
	FC as FunctionalComponent,
	MouseEvent,
	PropsWithChildren,
} from "react";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

interface ClassicyContextualMenuTargetProps extends PropsWithChildren {
	/** The menu to show on right-click. A disabled Help item is put first unless one is included. */
	menuItems: ClassicyMenuItem[];
	/** Extra class names for the wrapping `<div>`. */
	className?: string;
}

/**
 * Attaches a contextual (right-click) menu to its children (HIGOS8 p.93) — the
 * Classicy replacement for the old `contextmenu` attribute. Right-clicking
 * anything inside opens `menuItems` 1 px below and right of the pointer.
 *
 * Contextual menus resolve innermost-first: this target wins over its window's
 * `contextMenu`, which wins over the app's, which wins over the desktop's
 * default menu. It claims the right-click (`preventDefault` +
 * `stopPropagation`); a child that calls `e.preventDefault()` in its own
 * `onContextMenu` keeps it from opening. It wraps its children in a `<div>`
 * and needs a `ClassicyContextualMenuProvider` above it, which
 * `ClassicyDesktop` mounts.
 *
 * Per the HIG, a contextual menu should only offer commands that are also in
 * the menu bar, and the provider adds a disabled Help item first unless one is
 * present.
 */
export const ClassicyContextualMenuTarget: FunctionalComponent<
	ClassicyContextualMenuTargetProps
> = ({ menuItems, className, children }) => {
	const { showContextMenu } = useClassicyContextualMenu();

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		e.stopPropagation();
		showContextMenu(menuItems, [e.clientX, e.clientY]);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: transparent wrapper adds a contextual menu to arbitrary children
		<div
			className={["classicyContextualMenuTarget", className]
				.filter(Boolean)
				.join(" ")}
			onContextMenu={handleContextMenu}
		>
			{children}
		</div>
	);
};
