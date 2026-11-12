// A menu too long for the screen below it scrolls as Mac OS menus do (HIG7
// p.78): capped at the screen's bottom, no scroll bar, an indicator at an
// end with items past it. jsdom lays nothing out: the lists' boxes and
// extents are stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({ useAppManagerDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: vi.fn() }) }),
);
vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const ROW = 20;
const items = (n: number, prefix = "item") =>
	Array.from({ length: n }, (_, i) => ({
		id: `${prefix}-${i}`,
		title: `${prefix} ${i}`,
	}));

// Every menu list sits 100 px down; its content is its rows; the screen is
// 300 px tall.
const scroll = new WeakMap<Element, number>();
const originals = new Map<string, PropertyDescriptor | undefined>();
const isList = (el: Element) => el.tagName === "UL";
const rowsOf = (el: Element) =>
	el.querySelectorAll(":scope > li, :scope > * > li").length;
const capOf = (el: HTMLElement) =>
	Number.parseFloat(el.style.maxHeight) || Number.POSITIVE_INFINITY;
const stub = (key: string, get: (el: HTMLElement) => number) => {
	originals.set(
		key,
		Object.getOwnPropertyDescriptor(HTMLElement.prototype, key),
	);
	Object.defineProperty(HTMLElement.prototype, key, {
		configurable: true,
		get() {
			return get(this as HTMLElement);
		},
	});
};
let innerHeight: number;
beforeEach(() => {
	innerHeight = window.innerHeight;
	window.innerHeight = 300;
	stub("scrollHeight", (el) => (isList(el) ? rowsOf(el) * ROW : 0));
	stub("clientHeight", (el) =>
		isList(el) ? Math.min(rowsOf(el) * ROW, capOf(el)) : 0,
	);
	stub("offsetHeight", (el) =>
		isList(el)
			? Math.min(rowsOf(el) * ROW, capOf(el))
			: el.getAttribute("role")?.startsWith("menuitem")
				? ROW
				: 0,
	);
	originals.set(
		"scrollTop",
		Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop"),
	);
	Object.defineProperty(HTMLElement.prototype, "scrollTop", {
		configurable: true,
		get() {
			return scroll.get(this) ?? 0;
		},
		set(value: number) {
			const el = this as HTMLElement;
			const max = rowsOf(el) * ROW - Math.min(rowsOf(el) * ROW, capOf(el));
			scroll.set(el, Math.min(Math.max(value, 0), Math.max(max, 0)));
		},
	});
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
		function (this: HTMLElement) {
			if (!isList(this))
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			// A hidden submenu list has no box.
			const hidden = this.closest("li") && !this.closest("li.open");
			return DOMRect.fromRect({
				x: 40,
				y: 100,
				width: 160,
				height: hidden ? 0 : Math.min(rowsOf(this) * ROW, capOf(this)),
			});
		},
	);
});

afterEach(() => {
	window.innerHeight = innerHeight;
	for (const [key, descriptor] of originals) {
		if (descriptor)
			Object.defineProperty(HTMLElement.prototype, key, descriptor);
		else
			delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
	}
	originals.clear();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

const arrow = (direction: "up" | "down") =>
	document.querySelector<HTMLElement>(
		`[data-classicy-part="menu-scroll-${direction}"]`,
	);

describe("ClassicyMenu scrolling", () => {
	it("leaves a menu that fits the screen alone", () => {
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(5)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		expect(list.style.maxHeight).toBe("");
		expect(arrow("down")).toBeNull();
	});

	it("caps a menu too long for the screen at its bottom, with the down indicator", () => {
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(30)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		// 300 − 4 (the screen margin) − 100 (the list's top).
		expect(list.style.maxHeight).toBe("196px");
		expect(arrow("down")).not.toBeNull();
		expect(arrow("up")).toBeNull();
		// A sibling of the list in its wrapper, over it.
		expect(list.contains(arrow("down"))).toBe(false);
		expect(arrow("down")?.style.zIndex).toBe("1");
	});

	it("scrolls a row at a time while the pointer rests on an indicator", () => {
		vi.useFakeTimers();
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(30)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		fireEvent.mouseEnter(arrow("down") as HTMLElement);
		expect(list.scrollTop).toBe(ROW);
		act(() => {
			vi.advanceTimersByTime(120);
		});
		expect(list.scrollTop).toBe(2 * ROW);
		fireEvent.mouseLeave(arrow("down") as HTMLElement);
		expect(arrow("up")).not.toBeNull();
	});

	it("measures a submenu only once it is shown, and opens a scrolling list's submenu beside its item, fixed", () => {
		const menuItems = [
			{ id: "long", title: "Long", menuChildren: items(30, "child") },
		];
		const { container } = render(
			<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />,
		);
		const sub = container.querySelector("ul.sub") as HTMLElement;
		// Hidden: not measured, not capped.
		expect(sub.classList.contains("classicyMenuListScrolls")).toBe(false);
		fireEvent.click(screen.getByText("Long"));
		expect(sub.classList.contains("classicyMenuListScrolls")).toBe(true);
		expect(sub.style.maxHeight).toBe("196px");
	});

	it("closes a submenu it holds open when it scrolls, and places it fixed while open", () => {
		const menuItems = [
			{ id: "nested", title: "Nested", menuChildren: items(3, "grand") },
			...items(29),
		];
		const { container } = render(
			<ClassicyMenu name="m" menuItems={menuItems} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		const nested = screen.getByText("Nested").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("Nested"));
		expect(nested.classList.contains("open")).toBe(true);
		const wrapper = nested.querySelector(
			":scope > .classicyMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.position).toBe("fixed");
		act(() => {
			list.scrollTop = 40;
			fireEvent.scroll(list);
		});
		expect(nested.classList.contains("open")).toBe(false);
	});
});
