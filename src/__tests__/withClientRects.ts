import { vi } from "vitest";

/**
 * jsdom lays nothing out, so every element's `getClientRects()` is empty, as
 * a browser's is only for an element that is not rendered. This stub gives
 * each element one rect, unless it or an ancestor is `display: none`, as a
 * browser would. Call it in a `beforeEach`; `vi.restoreAllMocks()` removes it.
 */
export const stubClassicyClientRects = (): void => {
	vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (
		this: Element,
	) {
		for (let el: Element | null = this; el; el = el.parentElement)
			if (getComputedStyle(el).display === "none")
				return [] as unknown as DOMRectList;
		return [this.getBoundingClientRect()] as unknown as DOMRectList;
	});
};
