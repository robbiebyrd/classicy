/**
 * The viewports of the mounted `ClassicyScrollArea`s, for code outside an
 * area that must scroll one it finds under the pointer: a file drag
 * scrolls the area it nears the edge of (WIG Ch.6 "Automatic Scrolling",
 * p.91; HIG7 p.274). A `WeakMap`, so an element dropped without its area
 * unregistering is never kept alive, and no attribute marks the DOM.
 */

/** What an area registers for its viewport. */
export type ClassicyScrollViewportEntry = {
	/** The area's `lineStep` now: pixels one press of an arrow scrolls. */
	lineStep: () => number;
	/** Scrolls the viewport by `dx` and `dy` pixels and redraws the bars. */
	scrollBy: (dx: number, dy: number) => void;
};

const viewports = new WeakMap<Element, ClassicyScrollViewportEntry>();

/**
 * Registers `element` as a scroll area's viewport. Returns the function
 * that unregisters it, which leaves a later registration of the same
 * element (a remount) alone.
 */
export const registerClassicyScrollViewport = (
	element: Element,
	entry: ClassicyScrollViewportEntry,
): (() => void) => {
	viewports.set(element, entry);
	return () => {
		if (viewports.get(element) === entry) viewports.delete(element);
	};
};

/**
 * The nearest registered viewport at or above `element`, with its entry,
 * or null when `element` is in no scroll area's viewport.
 */
export const classicyScrollViewportOf = (
	element: Element | null,
): { element: HTMLElement; entry: ClassicyScrollViewportEntry } | null => {
	for (let el: Element | null = element; el; el = el.parentElement) {
		const entry = viewports.get(el);
		if (entry && el instanceof HTMLElement) return { element: el, entry };
	}
	return null;
};
