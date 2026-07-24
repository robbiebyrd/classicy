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
	id: string;
	order?: number;
	icon?: string;
	title?: string;
	menuItems?: ClassicyMenuItem[];
	onClick?: () => void;
	children?: ReactNode;
}

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
