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
	useRef,
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
		<ClassicyMenuProvider onClose={onClose}>
			<div
				ref={wrapperRef}
				className={"classicyContextMenuWrapper"}
				style={{ left: position[0], top: position[1] }}
			>
				<ClassicyMenu
					name={name}
					menuItems={menuItems}
					subNavClass={"classicyContextSubMenu"}
				></ClassicyMenu>
			</div>
		</ClassicyMenuProvider>
	);
};
