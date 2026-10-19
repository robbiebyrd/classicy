import "./ClassicyMenuBarExtension.scss";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
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
}

/**
 * Adds an item to the right-hand side of the menu bar, to the left of the
 * clock — the place for an app's status icon or account menu. Use it instead of
 * a raw `<menu>` for menu-bar items.
 *
 * Render it anywhere inside a `ClassicyDesktop` (typically inside your
 * `ClassicyApp`): it portals into the menu bar's `#classicyDesktopMenuExtensions`
 * region, and renders nothing when that region is not in the document. The item
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
> = ({ id, order = 0, icon, title, menuItems, onClick, children }) => {
	const [regionNode, setRegionNode] = useState<HTMLElement | null>(null);
	const itemRef = useRef<HTMLLIElement>(null);
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState<[number, number]>([0, 0]);

	const hasMenu = !!menuItems && menuItems.length > 0;

	useEffect(() => {
		setRegionNode(document.getElementById("classicyDesktopMenuExtensions"));
	}, []);

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
			className={"classicyMenuItem classicyDesktopMenuExtension"}
			style={{ order }}
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
