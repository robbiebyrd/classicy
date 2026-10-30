import "./ClassicyMenuBarExtension.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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
 * Adds an item to the right-hand side of the menu bar, to the left of the
 * clock — the place for an app's status icon or account menu. Use it instead of
 * a raw `<menu>` for menu-bar items.
 *
 * Render it anywhere inside a `ClassicyDesktop` (typically inside your
 * `ClassicyApp`): it portals into the menu bar's `#classicyDesktopMenuExtensions`
 * region, and renders nothing when that region is not in the document — as
 * under an Appearance Package whose `layout.menuBar.placement` is `"window"`,
 * which draws no screen bar. It looks the region up again whenever the
 * package layout's placement changes, so it reappears when the bar does; a
 * bar forced to `placement="screen"` under a window-placement package is not
 * re-queried. The item
 * is a real `<button>`, so Enter and Space activate it. With `menuItems`, a
 * click drops a Platinum menu below the item, which closes on a selection or a
 * click outside.
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
	const [position, setPosition] = useState<[number, number]>([0, 0]);

	const hasMenu = !!menuItems && menuItems.length > 0;

	// The region is the screen bar's: a package with menus in each window
	// removes it, and a switch back renders a new one. Look it up again
	// whenever the placement changes (effects run after the bar's commit), so
	// the item never stays portaled into a detached region.
	const placement = useClassicyAppearanceLayout().menuBar.placement;
	// biome-ignore lint/correctness/useExhaustiveDependencies: placement is the trigger; the lookup reads the DOM the bar just committed
	useEffect(() => {
		setRegionNode(document.getElementById("classicyDesktopMenuExtensions"));
	}, [placement]);

	const activate = () => {
		if (hasMenu) {
			const rect = itemRef.current?.getBoundingClientRect();
			if (rect) setPosition([rect.left, rect.bottom]);
			// Open (not toggle): ClassicyContextualMenu owns outside-click /
			// selection close via onClose.
			setOpen(true);
		}
		onClick?.();
	};

	if (!regionNode) return null;

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
			<button
				type="button"
				className={"classicyDesktopMenuExtensionTrigger"}
				aria-label={title}
				onClick={activate}
			>
				{children ?? (icon ? <img src={icon} alt={title ?? ""} /> : null)}
			</button>
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
						position={position}
						onClose={() => setOpen(false)}
					/>,
					desktop,
				)}
		</>
	);
};
