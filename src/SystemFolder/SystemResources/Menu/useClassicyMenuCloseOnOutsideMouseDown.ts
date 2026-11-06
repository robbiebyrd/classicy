import { type RefObject, useContext, useEffect } from "react";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * Closes every menu of the nearest `ClassicyMenuProvider` when a mouse button
 * goes down anywhere outside `ref`'s element: a menu bar's sticky menus stay
 * open until a selection, a re-click of the open title or a click elsewhere.
 * Call it from a component rendered inside the bar's provider; a null ref
 * (nothing mounted) closes nothing.
 *
 * It acts only while the provider's menu bar is active (`menuBarActive`: a
 * title was clicked open, which every bar menu opens through), so with
 * several bars mounted an outside click re-renders only the one with an open
 * menu. A provider mounted with `startActive` is open without being active,
 * so this hook does not close it.
 */
export const useClassicyMenuCloseOnOutsideMouseDown = (
	ref: RefObject<HTMLElement | null>,
): void => {
	const { closeAll, menuBarActive } = useContext(ClassicyMenuContext);

	useEffect(() => {
		if (!menuBarActive) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				closeAll();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeAll, menuBarActive, ref]);
};
