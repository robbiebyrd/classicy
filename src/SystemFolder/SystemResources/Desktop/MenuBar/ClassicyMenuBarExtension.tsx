import "./ClassicyMenuBarExtension.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";

export interface ClassicyMenuBarExtensionProps {
	/** Unique id; also names the item's dropdown menu. */
	id: string;
	/** CSS flex `order` among the menu bar's extension items. Defaults to `0`. */
	order?: number;
	/** Icon drawn in the menu bar when no `children` are given. */
	icon?: string;
	/** Accessible name of the item's button (and the icon's alt text). */
	title?: string;
	/** Menu dropped down below the item when it is clicked. */
	menuItems?: ClassicyMenuItem[];
	/** Called on every click, whether or not the item has a menu. */
	onClick?: () => void;
	/** Custom item content, drawn instead of `icon`. */
	children?: ReactNode;
	/** Extra class names, merged onto the item's `<li>` after the component's own. */
	className?: string;
	/** Inline style, merged onto the item's `<li>` after the component's own (`order`). */
	style?: CSSProperties;
}

/**
 * The item's button in the taskbar's status area (`layout.taskbar`, the
 * Windows 95/98 shell), where the item is a status indicator beside the
 * notification icons, and so behaves as one (WIG Ch.10 "Status
 * Notification", pp.212–213), as the tray's module icons do: its `title` is
 * a tooltip after 500 ms, whatever Balloon Help says ("Display a tooltip
 * that indicates what the status indicator represents"), put away by a
 * press; button 2 opens its menu at the pointer as a pop-up menu, with no
 * Help item and the arrows walking it ("Display a pop-up menu … when the
 * user clicks on the status indicator with button 2"), or nothing for an
 * item without one; and a pointer press leaves the focus where it is. Under
 * the screen bar the item's button is drawn without it, as before.
 */
const ClassicyTaskbarExtensionTrigger: FunctionalComponent<{
	title?: string;
	menuItems?: ClassicyMenuItem[];
	onActivate: () => void;
	onCloseMenu: () => void;
	children: ReactNode;
}> = ({ title, menuItems, onActivate, onCloseMenu, children }) => {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const { showContextMenu } = useClassicyContextualMenu();
	const named = title !== undefined && title.trim() !== "";
	const { handlers, balloon } = useClassicyBalloonHelp(
		buttonRef,
		{ content: title ?? "", delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS },
		{ force: true },
	);

	const onMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		// A press puts the tooltip away, as Windows' does, and a pointer press
		// takes no focus: the tray takes none from a click.
		handlers.onMouseLeave();
		if (e.button === 0) e.preventDefault();
	};
	const onMouseEnter = () => {
		if (named) handlers.onMouseEnter();
	};
	const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
		// Never the browser's menu, the taskbar's or the desktop's.
		e.preventDefault();
		handlers.onMouseLeave();
		onCloseMenu();
		if (!menuItems || menuItems.length === 0) return;
		showContextMenu(menuItems, [e.clientX, e.clientY], {
			helpItem: false,
			keyboard: true,
		});
	};

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				className={"classicyDesktopMenuExtensionTrigger"}
				aria-label={title}
				aria-describedby={handlers["aria-describedby"]}
				onClick={onActivate}
				onMouseDown={onMouseDown}
				onMouseEnter={onMouseEnter}
				onMouseLeave={handlers.onMouseLeave}
				onContextMenu={onContextMenu}
			>
				{children}
			</button>
			{balloon}
		</>
	);
};

/**
 * Adds an item to the right-hand side of the menu bar, to the left of the
 * clock — the place for an app's status icon or account menu. Use it instead of
 * a raw `<menu>` for menu-bar items.
 *
 * Render it anywhere inside a `ClassicyDesktop` (typically inside your
 * `ClassicyApp`): it portals into the menu bar's `#classicyDesktopMenuExtensions`
 * region, and renders nothing when that region is not in the document — as
 * under an Appearance Package whose `layout.menuBar.placement` is `"window"`,
 * which draws no screen bar. Under a package whose layout declares
 * `taskbar` (the Windows 95/98 shell) the region is the taskbar's status
 * area's, beside the notification icons, so the item is a tray icon there.
 * It looks the region up again whenever the package layout's placement or
 * its taskbar's presence changes, so it reappears when the bar or the
 * taskbar does; a bar forced to `placement="screen"` under a
 * window-placement package is not re-queried. The item
 * is a real `<button>`, so Enter and Space activate it. With `menuItems`, a
 * click drops a Platinum menu below the item, which closes on a selection or a
 * click outside. The menu hangs from the item's left side, or, where that
 * would pass the desktop's right edge, with its right side under the item's
 * right side, as a menu bar title's pull-down does; one still too wide is
 * pinned inside the desktop. In the taskbar's status area it hangs from the
 * item's bottom too, and so, kept to the menu bounds, which end at the
 * taskbar's band, it is pinned upward above the taskbar; there it takes the
 * arrow keys and never times out, and the item is a status indicator (WIG
 * Ch.10 "Status Notification", pp.212–213): its `title` is a tooltip after
 * 500 ms whatever Balloon Help says, put away by a press, button 2 opens
 * its menu at the pointer (nothing without one), and a pointer press takes
 * no focus.
 *
 * ```tsx
 * <ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>
 *   <img src={appIcon} alt={appName} />
 * </ClassicyMenuBarExtension>
 * ```
 */
export const ClassicyMenuBarExtension: FunctionalComponent<
	ClassicyMenuBarExtensionProps
> = ({
	id,
	order = 0,
	icon,
	title,
	menuItems,
	onClick,
	children,
	className,
	style,
}) => {
	const [regionNode, setRegionNode] = useState<HTMLElement | null>(null);
	const itemRef = useRef<HTMLLIElement>(null);
	const [open, setOpen] = useState(false);
	// The item's box when it opened its menu: the menu hangs from its left
	// side, or with its right side under the item's right side where that
	// would pass the desktop's edge, as a menu bar title's pull-down does.
	const [anchor, setAnchor] = useState({ left: 0, bottom: 0, right: 0 });

	const hasMenu = !!menuItems && menuItems.length > 0;

	// The region is the screen bar's, or, under the Windows shell, the
	// taskbar's status area's: a package with menus in each window removes
	// the bar's, a taskbar draws its own, and a switch back renders a new
	// one. Look it up again whenever the placement or the taskbar's presence
	// changes (effects run after the bar's and the taskbar's commit), so the
	// item never stays portaled into a detached region.
	const layout = useClassicyAppearanceLayout();
	const placement = layout.menuBar.placement;
	const hasTaskbar = layout.taskbar !== undefined;
	// biome-ignore lint/correctness/useExhaustiveDependencies: placement and the taskbar are the triggers; the lookup reads the DOM the bar or the taskbar just committed
	useEffect(() => {
		setRegionNode(document.getElementById("classicyDesktopMenuExtensions"));
	}, [placement, hasTaskbar]);

	const activate = () => {
		if (hasMenu) {
			const rect = itemRef.current?.getBoundingClientRect();
			if (rect)
				setAnchor({ left: rect.left, bottom: rect.bottom, right: rect.right });
			// Open (not toggle): ClassicyContextualMenu owns outside-click /
			// selection close via onClose.
			setOpen(true);
		}
		onClick?.();
	};

	if (!regionNode) return null;

	const content =
		children ??
		(icon ? <ClassicyIconImage src={icon} alt={title ?? ""} /> : null);

	const item = (
		<li
			ref={itemRef}
			className={classNames(
				"classicyMenuItem",
				"classicyDesktopMenuExtension",
				className,
			)}
			style={{ order, ...style }}
		>
			{/* A real <button> gives native Enter/Space activation and a clean
			    accessible name without an interactive role on the <li>. */}
			{hasTaskbar ? (
				<ClassicyTaskbarExtensionTrigger
					title={title}
					menuItems={hasMenu ? menuItems : undefined}
					onActivate={activate}
					onCloseMenu={() => setOpen(false)}
				>
					{content}
				</ClassicyTaskbarExtensionTrigger>
			) : (
				<button
					type="button"
					className={"classicyDesktopMenuExtensionTrigger"}
					aria-label={title}
					onClick={activate}
				>
					{content}
				</button>
			)}
		</li>
	);

	const desktop = document.getElementById("classicyDesktop") ?? document.body;

	return (
		<>
			{createPortal(item, regionNode)}
			{open &&
				hasMenu &&
				createPortal(
					<ClassicyContextualMenu
						name={`menubar-ext-${id}`}
						menuItems={menuItems as ClassicyMenuItem[]}
						position={[anchor.left, anchor.bottom]}
						flipLeftTo={anchor.right}
						onClose={() => setOpen(false)}
						// In the taskbar's status area a Windows pop-up menu: the
						// arrows walk it, ESC closes it, and it never times out.
						{...(hasTaskbar ? { keyboard: true } : {})}
					/>,
					desktop,
				)}
		</>
	);
};
