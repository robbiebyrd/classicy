import { type RefObject, useContext, useEffect } from "react";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * Closes every menu of the nearest `ClassicyMenuProvider` when a mouse button
 * goes down anywhere outside `ref`'s element: a menu bar's sticky menus stay
 * open until a selection, a re-click of the open title or a click elsewhere.
 * Call it from a component rendered inside the bar's provider; a null ref
 * (nothing mounted) closes nothing.
 */
export const useClassicyMenuCloseOnOutsideMouseDown = (
	ref: RefObject<HTMLElement | null>,
): void => {
	const { closeAll } = useContext(ClassicyMenuContext);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				closeAll();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeAll, ref]);
};
