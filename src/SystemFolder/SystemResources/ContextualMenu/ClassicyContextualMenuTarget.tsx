import "./ClassicyContextualMenuTarget.scss";
import type {
	FC as FunctionalComponent,
	MouseEvent,
	PropsWithChildren,
} from "react";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

interface ClassicyContextualMenuTargetProps extends PropsWithChildren {
	menuItems: ClassicyMenuItem[];
	className?: string;
}

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
