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
	name: string;
	position: number[];
	menuItems: ClassicyMenuItem[];
	onClose?: () => void;
}

export const ClassicyContextualMenu: FunctionalComponent<ClassicyMenuProps> = ({
	name,
	menuItems,
	position,
	onClose,
}) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Start at the requested x; the layout effect flips the root menu leftward
	// if it would overflow the right edge of the viewport (HIG contextual menus).
	const [left, setLeft] = useState<number>(position[0]);

	useLayoutEffect(() => {
		setLeft(position[0]);
		const el = wrapperRef.current;
		if (!el) return;
		const width = el.getBoundingClientRect().width;
		if (position[0] + width > window.innerWidth) {
			setLeft(Math.max(0, position[0] - width));
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
				style={{ left, top: position[1] }}
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
