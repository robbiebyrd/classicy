import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

// Plan 0020-w98 E1: a contextual menu opened from below the menu bounds'
// bottom (a point in the Windows shell's taskbar band, which the bounds end
// above: the taskbar's own menu, the clock's, a tray icon's and a window
// button's) is pinned flush on the bounds' bottom and keeps no scroll
// margin, so a menu that fits there is drawn whole, as the band's own
// pop-ups are (`menuScrollMargin={0}`). A point inside the bounds keeps the
// pop-up menus' 4 px margin, as before. jsdom lays nothing out: the menu's
// wrapper and its list share one stubbed 160 x 200 box at the wrapper's
// place, and the bounds are the viewport.

const MENU = { width: 160, height: 200 };
const items: ClassicyMenuItem[] = [
	{ id: "one", title: "One" },
	{ id: "two", title: "Two" },
	{ id: "three", title: "Three" },
];

const listOf = (wrapper: Element) =>
	wrapper.querySelector(":scope > .classicyMenuWrapper > ul") as HTMLElement;

const renderAt = (y: number) => {
	const { container } = render(
		<ClassicyContextualMenu
			name="test_menu"
			position={[10, y]}
			menuItems={items}
			onClose={() => {}}
		/>,
	);
	return container.querySelector(".classicyContextMenuWrapper") as HTMLElement;
};

describe("ClassicyContextualMenu's scroll margin", () => {
	beforeEach(() => {
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const wrapper = this.closest(".classicyContextMenuWrapper");
				if (
					wrapper &&
					(this === wrapper || (this.tagName === "UL" && !this.closest("li")))
				) {
					const { left, top } = (wrapper as HTMLElement).style;
					return DOMRect.fromRect({
						x: Number.parseFloat(left) || 0,
						y: Number.parseFloat(top) || 0,
						width: MENU.width,
						height: MENU.height,
					});
				}
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			},
		);
		const computed = window.getComputedStyle;
		vi.spyOn(window, "getComputedStyle").mockImplementation(
			(el: Element, pseudo?: string | null) =>
				pseudo
					? ({ content: "none" } as unknown as CSSStyleDeclaration)
					: computed.call(window, el),
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it("keeps the pop-up menus' margin for a point inside the bounds: flush on the bottom, it scrolls by it", () => {
		const wrapper = renderAt(window.innerHeight - 2);
		// Flipped above the point, its bottom 2 px above the bounds'.
		expect(Number.parseFloat(wrapper.style.top)).toBe(
			window.innerHeight - 2 - MENU.height,
		);
		const list = listOf(wrapper);
		expect(list).toHaveClass("classicyMenuListScrolls");
		expect(list.style.maxHeight).toBe(`${MENU.height + 2 - 4}px`);
	});

	it("keeps no margin for a point in a taskbar band below the bounds, so the menu pinned flush is whole", () => {
		const owner = {};
		setClassicyTaskbarBand(28, owner);
		try {
			const wrapper = renderAt(window.innerHeight - 10);
			expect(Number.parseFloat(wrapper.style.top)).toBe(
				window.innerHeight - 28 - MENU.height,
			);
			const list = listOf(wrapper);
			expect(list).not.toHaveClass("classicyMenuListScrolls");
			expect(list.style.maxHeight).toBe("");
		} finally {
			setClassicyTaskbarBand(0, owner);
		}
	});

	it("keeps the margin with no taskbar band, wherever the point lies", () => {
		const wrapper = renderAt(window.innerHeight + 12);
		expect(Number.parseFloat(wrapper.style.top)).toBe(
			window.innerHeight - MENU.height,
		);
		const list = listOf(wrapper);
		expect(list).toHaveClass("classicyMenuListScrolls");
		expect(list.style.maxHeight).toBe(`${MENU.height - 4}px`);
	});
});
