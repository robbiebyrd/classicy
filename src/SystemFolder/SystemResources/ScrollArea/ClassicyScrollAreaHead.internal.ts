// A `ClassicyScrollArea`'s head, lent to a descendant: the area draws a head
// (`classicyScrollAreaHead`, above its viewport and vertical bar, the area's
// full width, scrolled sideways with the viewport) while any descendant asks
// for one, and hands each the element to portal into. A list that leaves
// the scrolling to an ancestor (the Finder's list view, in its window's
// scroll area) puts its column titles there when its package asks for them
// above the list (`layout.fileBrowser.listColumnTitles: "aboveList"`).
import { createContext, useContext, useEffect } from "react";

export type ClassicyScrollAreaHeadSlot = {
	/** The head element, once drawn; null while no one has asked. */
	element: HTMLDivElement | null;
	/** Asks for the head; the returned function lets go. */
	request: () => () => void;
};

export const ClassicyScrollAreaHeadContext =
	createContext<ClassicyScrollAreaHeadSlot | null>(null);

/**
 * The nearest scroll area's head element while `enabled`, null otherwise
 * (before the head is drawn, or outside a scroll area). Asking draws it.
 */
export const useClassicyScrollAreaHead = (
	enabled: boolean,
): HTMLDivElement | null => {
	const slot = useContext(ClassicyScrollAreaHeadContext);
	const request = slot?.request;
	useEffect(() => {
		if (!enabled || !request) return;
		return request();
	}, [enabled, request]);
	return enabled ? (slot?.element ?? null) : null;
};
