import {
	createContext,
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
}

export interface ClassicyContextualMenuAPI {
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
	) => void;
	hideContextMenu: () => void;
}

const noop = () => {};

const ClassicyContextualMenuContext = createContext<ClassicyContextualMenuAPI>({
	showContextMenu: noop,
	hideContextMenu: noop,
});

export const useClassicyContextualMenu = (): ClassicyContextualMenuAPI =>
	useContext(ClassicyContextualMenuContext);

// Menus open slightly up-left of the pointer so the first item sits under it,
// matching the desktop's and windows' historical [10, 10] offset.
const clickOffset: [number, number] = [10, 10];

export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

	const showContextMenu = useCallback(
		(items: ClassicyMenuItem[], clickAt: [number, number]) => {
			setOpenMenu({
				items,
				position: [clickAt[0] - clickOffset[0], clickAt[1] - clickOffset[1]],
			});
		},
		[],
	);

	const hideContextMenu = useCallback(() => setOpenMenu(null), []);

	const api = useMemo(
		() => ({ showContextMenu, hideContextMenu }),
		[showContextMenu, hideContextMenu],
	);

	return (
		<ClassicyContextualMenuContext.Provider value={api}>
			{children}
			{openMenu &&
				createPortal(
					<ClassicyContextualMenu
						name={"classicyContextualMenu"}
						menuItems={openMenu.items}
						position={openMenu.position}
						onClose={hideContextMenu}
					/>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</ClassicyContextualMenuContext.Provider>
	);
};
