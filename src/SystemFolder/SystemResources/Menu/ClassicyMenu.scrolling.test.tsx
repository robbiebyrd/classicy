// A menu too long for the screen below it scrolls as Mac OS menus do (HIG7
// p.78): capped at the screen's bottom, no scroll bar, an indicator at an
// end with items past it. jsdom lays nothing out: the lists' boxes and
// extents are stubbed.

import { useLayoutEffect, useState } from "react";
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

import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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
		// As a browser does, a list that no longer overflows (its cap lifted)
		// loses its scroll position for good.
		get() {
			const el = this as HTMLElement;
			const max = rowsOf(el) * ROW - Math.min(rowsOf(el) * ROW, capOf(el));
			const at = Math.min(scroll.get(el) ?? 0, Math.max(max, 0));
			scroll.set(el, at);
			return at;
		},
		set(value: number) {
			const el = this as HTMLElement;
			const max = rowsOf(el) * ROW - Math.min(rowsOf(el) * ROW, capOf(el));
			scroll.set(el, Math.min(Math.max(value, 0), Math.max(max, 0)));
		},
	});
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
		function (this: HTMLElement) {
			// A row: its place in its list, which may have scrolled.
			const list = this.parentElement;
			if (this.tagName === "LI" && list && isList(list)) {
				// A row with no box (`display: none`).
				if (this.classList.contains("gone")) {
					return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
				}
				const top = list.getBoundingClientRect().y;
				const index = Array.prototype.indexOf.call(list.children, this);
				return DOMRect.fromRect({
					x: 40,
					y: top + index * ROW - list.scrollTop,
					width: 160,
					height: ROW,
				});
			}
			if (!isList(this))
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			// A hidden submenu list has no box. A host may place the list
			// (`data-top` on an ancestor); else it sits 100 px down.
			const hidden = this.closest("li") && !this.closest("li.open");
			const host = this.closest<HTMLElement>("[data-top]");
			// A host may place it a fraction across (`data-left`); the wrapper's
			// nudge moves it.
			const across = this.closest<HTMLElement>("[data-left]");
			const nudge =
				Number.parseFloat(
					(this.parentElement as HTMLElement | null)?.style.marginLeft ?? "",
				) || 0;
			return DOMRect.fromRect({
				x: (across ? Number(across.dataset.left) : 40) + nudge,
				y: host ? Number(host.dataset.top) : 100,
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

	// A host that places the menu after it mounts, as a contextual menu
	// flips up from the bottom of the screen and a bevel button's pop-up is
	// measured hidden below its button, then placed: the cap follows the
	// final place.
	// The host's items are stable across its renders, as a real host's are.
	const FIVE = items(5);

	it("caps the menu where its host finally places it, not where it first mounted", () => {
		const Host = () => {
			const [top, setTop] = useState(250);
			useLayoutEffect(() => setTop(162), []);
			return (
				<div data-top={top}>
					<ClassicyMenu name="m" menuItems={FIVE} />
				</div>
			);
		};
		const { container } = render(<Host />);
		const list = container.querySelector("ul") as HTMLElement;
		// At 250 the 100 px menu would be capped (300 − 4 − 250 = 46, so the
		// 64 px floor); at 162 it fits (134).
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		expect(list.style.maxHeight).toBe("");
		expect(arrow("down")).toBeNull();
	});

	it("caps it when the host moves it down past the room it has", () => {
		const Host = () => {
			const [top, setTop] = useState(100);
			useLayoutEffect(() => setTop(220), []);
			return (
				<div data-top={top}>
					<ClassicyMenu name="m" menuItems={FIVE} />
				</div>
			);
		};
		const { container } = render(<Host />);
		const list = container.querySelector("ul") as HTMLElement;
		// 300 − 4 − 220 = 76.
		expect(list.style.maxHeight).toBe("76px");
		expect(arrow("down")).not.toBeNull();
	});

	// A menu bar's own list is a row of titles; the pull-down hanging out of
	// it is the pull-down's to scroll. `scrollHeight` counts that pull-down as
	// the bar's overflow, so the cap reads the bar's rows instead.
	it("never caps a list whose open submenu hangs below it", () => {
		const scrollHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			"scrollHeight",
		);
		// The bar's list (one row) reports the pull-down below as overflow.
		Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
			configurable: true,
			get() {
				return (this as HTMLElement).classList.contains("bar") ? 900 : 0;
			},
		});
		try {
			const { container } = render(
				<ClassicyMenu name="bar" navClass="bar" menuItems={items(1)} />,
			);
			const bar = container.querySelector("ul.bar") as HTMLElement;
			expect(bar.classList.contains("classicyMenuListScrolls")).toBe(false);
		} finally {
			if (scrollHeight)
				Object.defineProperty(
					HTMLElement.prototype,
					"scrollHeight",
					scrollHeight,
				);
		}
	});

	it("draws a capped list's frame shadow on a fixed sibling over the list", () => {
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(30)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		const shadow = container.querySelector<HTMLElement>(
			".classicyMenuScrollShadow",
		);
		expect(shadow).not.toBeNull();
		expect(shadow?.getAttribute("aria-hidden")).toBe("true");
		expect(list.contains(shadow)).toBe(false);
		expect(shadow?.style.position).toBe("fixed");
		expect([
			shadow?.style.left,
			shadow?.style.top,
			shadow?.style.width,
			shadow?.style.height,
		]).toEqual(["40px", "100px", "160px", "196px"]);
	});

	it("draws no shadow sibling while the list fits", () => {
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(5)} />,
		);
		expect(container.querySelector(".classicyMenuScrollShadow")).toBeNull();
	});

	it("keeps its scroll position when its items are rebuilt", () => {
		const { container, rerender } = render(
			<ClassicyMenu name="m" menuItems={items(30)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		act(() => {
			list.scrollTop = 60;
			fireEvent.scroll(list);
		});
		expect(arrow("up")).not.toBeNull();
		// The same rows, rebuilt (the desktop's Apple menu and switcher).
		rerender(<ClassicyMenu name="m" menuItems={items(30)} />);
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		expect(list.scrollTop).toBe(60);
		expect(arrow("up")).not.toBeNull();
		// More rows: measured again, and put back where it was scrolled.
		rerender(<ClassicyMenu name="m" menuItems={items(35)} />);
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		expect(list.scrollTop).toBe(60);
		expect(arrow("up")).not.toBeNull();
	});

	it("leaves a short list alone where the floor would cap it above its height", () => {
		window.innerHeight = 150;
		const TWO = items(2);
		const { container } = render(
			<div data-top={115}>
				<ClassicyMenu name="m" menuItems={TWO} />
			</div>,
		);
		const list = container.querySelector("ul") as HTMLElement;
		// 150 − 4 − 115 = 31 of room: the 64 px floor, taller than its 40.
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		expect(list.style.maxHeight).toBe("");
	});

	it("measures from its last laid-out row, past one with no box", () => {
		const rows: ClassicyMenuItem[] = items(30);
		rows[29] = { ...rows[29], className: "gone" };
		const { container } = render(<ClassicyMenu name="m" menuItems={rows} />);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
	});

	it("puts a submenu on the pixel grid where its item leaves it a fraction across", () => {
		const menuItems = [
			{ id: "sub", title: "Sub", menuChildren: items(3, "child") },
		];
		const { container } = render(
			<div data-left={89.5}>
				<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />
			</div>,
		);
		fireEvent.click(screen.getByText("Sub"));
		const sub = container.querySelector("ul.sub") as HTMLElement;
		const wrapper = sub.parentElement as HTMLElement;
		expect(wrapper.style.marginLeft).toBe("0.5px");
		expect(sub.getBoundingClientRect().left).toBe(90);
		// The root list is the host's to place: no nudge.
		const root = container.querySelector(
			":scope > div > .classicyMenuWrapper",
		) as HTMLElement;
		expect(root.style.marginLeft).toBe("");
	});
});
