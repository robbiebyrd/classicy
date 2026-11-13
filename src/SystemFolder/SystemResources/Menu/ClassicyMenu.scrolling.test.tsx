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
// 300 px tall. A list's padding and border (each side, from computed style)
// and its wrapper's position are a test's to set.
let padding = 0;
let border = 0;
let wrapperPosition = "relative";
const frame = () => 2 * (padding + border);
const scroll = new WeakMap<Element, number>();
const originals = new Map<string, PropertyDescriptor | undefined>();
const isList = (el: Element) => el.tagName === "UL";
const rowsOf = (el: Element) =>
	el.querySelectorAll(":scope > li, :scope > * > li").length;
const capOf = (el: HTMLElement) =>
	Number.parseFloat(el.style.maxHeight) || Number.POSITIVE_INFINITY;
// An inline length in px, `calc(10px + 0.5px)` included (the nudge added to
// a host's value).
const pxOf = (value: string) =>
	[...value.matchAll(/(-?[\d.]+)px/g)].reduce(
		(sum, [, n]) => sum + Number(n),
		0,
	);
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
	const computed = window.getComputedStyle;
	vi.spyOn(window, "getComputedStyle").mockImplementation(
		(el: Element, pseudo?: string | null) => {
			if (isList(el)) {
				return {
					boxSizing: "content-box",
					paddingTop: `${padding}px`,
					paddingBottom: `${padding}px`,
					borderTopWidth: `${border}px`,
					borderBottomWidth: `${border}px`,
				} as unknown as CSSStyleDeclaration;
			}
			if (el.classList.contains("classicyMenuWrapper")) {
				return {
					// Placed fixed beside its item by ClassicyMenu (inline), else
					// the package's.
					position: (el as HTMLElement).style.position || wrapperPosition,
					borderLeftWidth: "0px",
					borderTopWidth: "0px",
				} as unknown as CSSStyleDeclaration;
			}
			return computed.call(window, el, pseudo);
		},
	);
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
				const listRect = list.getBoundingClientRect();
				const top = listRect.y + padding + border;
				const index = Array.prototype.indexOf.call(list.children, this);
				return DOMRect.fromRect({
					x: listRect.x,
					y: top + index * ROW - list.scrollTop,
					width: 160,
					height: ROW,
				});
			}
			// A wrapper sits a little up and left of its list.
			if (this.classList.contains("classicyMenuWrapper")) {
				return DOMRect.fromRect({ x: 30.25, y: 90, width: 200, height: 0 });
			}
			if (!isList(this))
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			// A hidden submenu list has no box. A host may place the list
			// (`data-top` on an ancestor); else it sits 100 px down.
			const hidden = this.closest("li") && !this.closest("li.open");
			const host = this.closest<HTMLElement>("[data-top]");
			// A host may place the root list a fraction across (`data-left`). A
			// submenu's list hangs 155 px right of its parent's, or where a
			// fixed wrapper is put, and the wrapper's nudge moves it: `left` on
			// a relative wrapper moves the list with it; `margin-left` moves a
			// list anchored to the wrapper's left edge, not one anchored to
			// its right (`data-anchor="right"`), as in a browser.
			const across = this.closest<HTMLElement>("[data-left]");
			const wrapper = this.parentElement as HTMLElement;
			const parentList = wrapper.parentElement?.closest("ul");
			const position = getComputedStyle(wrapper).position;
			const natural =
				position === "fixed"
					? pxOf(wrapper.style.left)
					: parentList
						? parentList.getBoundingClientRect().x + 155
						: across
							? Number(across.dataset.left)
							: 40;
			const nudge = position === "relative" ? pxOf(wrapper.style.left) : 0;
			const margin = this.closest("[data-anchor='right']")
				? 0
				: pxOf(wrapper.style.marginLeft);
			return DOMRect.fromRect({
				x: natural + nudge + margin,
				y: host ? Number(host.dataset.top) : 100,
				width: 160,
				height: hidden
					? 0
					: Math.min(rowsOf(this) * ROW, capOf(this)) + frame(),
			});
		},
	);
});

afterEach(() => {
	window.innerHeight = innerHeight;
	padding = 0;
	border = 0;
	wrapperPosition = "relative";
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

	it("closes a submenu it holds open when it scrolls, and places it fixed while open, on the grid", () => {
		const menuItems = [
			{ id: "nested", title: "Nested", menuChildren: items(3, "grand") },
			...items(29),
		];
		const { container } = render(
			<div data-left={89.5}>
				<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />
			</div>,
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
		// Put beside its item at 89.5 by the item's own effect, which renders
		// the submenu alone: the submenu nudges its wrapper by its margins
		// (its `left` is the item's).
		expect(wrapper.style.left).toBe("89.5px");
		expect(wrapper.style.marginLeft).toBe("0.5px");
		expect(wrapper.style.marginRight).toBe("-0.5px");
		expect(
			(container.querySelector("ul.sub") as HTMLElement).getBoundingClientRect()
				.left,
		).toBe(90);
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

	it("draws a capped list's frame shadow on a sibling over the list, placed in their wrapper", () => {
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
		expect(shadow?.parentElement).toBe(list.parentElement);
		// Absolute, from the wrapper's padding box (at 30.25, 90), so it moves
		// with the list; its offsets keep their fractions.
		expect(shadow?.style.position).toBe("absolute");
		expect([
			shadow?.style.left,
			shadow?.style.top,
			shadow?.style.width,
			shadow?.style.height,
		]).toEqual(["9.75px", "10px", "160px", "196px"]);
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

	// The cap is a `max-height`, which bounds the content box: a list with
	// padding and a border (Platinum's are 1 px each) capped at the room
	// would run its frame past the margin.
	it("caps a list with padding and a border so its border box ends at the margin", () => {
		padding = 1;
		border = 1;
		const { container } = render(
			<ClassicyMenu name="m" menuItems={items(30)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		// 196 of room, less 4 of padding and border.
		expect(list.style.maxHeight).toBe("192px");
		expect(list.getBoundingClientRect().bottom).toBe(300 - 4);
		expect(
			container.querySelector<HTMLElement>(".classicyMenuScrollShadow")?.style
				.height,
		).toBe("196px");
	});

	it("leaves a list alone whose rows fit the floor though its border box does not fit the room", () => {
		padding = 2;
		border = 1;
		window.innerHeight = 300;
		const THREE = items(3);
		const { container } = render(
			<div data-top={246}>
				<ClassicyMenu name="m" menuItems={THREE} />
			</div>,
		);
		const list = container.querySelector("ul") as HTMLElement;
		// 50 of room: the 64 px floor holds its 60 px of rows, though its 66 px
		// border box runs past the margin.
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		expect(list.style.maxHeight).toBe("");
	});

	// A list that fit is measured on every render, so a rebuild with more
	// rows caps it in the effect that measures it; the rebuild effect must
	// not then clear that cap (the two sets would cancel, and React would
	// not commit the list capped).
	it("caps a list that fit once more rows make it too long", () => {
		const { container, rerender } = render(
			<ClassicyMenu name="m" menuItems={items(3)} />,
		);
		const list = container.querySelector("ul") as HTMLElement;
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		rerender(<ClassicyMenu name="m" menuItems={items(30)} />);
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		expect(list.style.maxHeight).toBe("196px");
		expect(arrow("down")).not.toBeNull();
	});

	it("forgets a saved scroll position once a rebuild makes the list fit", () => {
		const { container, rerender } = render(
			<div data-top={100}>
				<ClassicyMenu name="m" menuItems={items(30)} />
			</div>,
		);
		const list = container.querySelector("ul") as HTMLElement;
		act(() => {
			list.scrollTop = 60;
			fireEvent.scroll(list);
		});
		// Fewer rows, and the host moves the list up: the position is saved as
		// the rows change (13 rows still overflow the old cap), then the list
		// is found to fit (260 in 276 of room).
		rerender(
			<div data-top={20}>
				<ClassicyMenu name="m" menuItems={items(13)} />
			</div>,
		);
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(false);
		expect(list.scrollTop).toBe(0);
		// Capped again: from the top, not where it was scrolled before.
		rerender(
			<div data-top={20}>
				<ClassicyMenu name="m" menuItems={items(30)} />
			</div>,
		);
		expect(list.classList.contains("classicyMenuListScrolls")).toBe(true);
		expect(list.scrollTop).toBe(0);
		expect(arrow("up")).toBeNull();
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
		// The submenu hangs at 89.5 + 155: its relative wrapper is moved by
		// `left`, which carries a list anchored to either of its edges.
		expect(wrapper.style.left).toBe("0.5px");
		expect(wrapper.style.marginLeft).toBe("");
		expect(sub.getBoundingClientRect().left).toBe(245);
		// The root list is the host's to place: no nudge.
		const root = container.querySelector(
			":scope > div > .classicyMenuWrapper",
		) as HTMLElement;
		expect(root.style.left).toBe("");
		expect(root.style.marginLeft).toBe("");
	});

	it("nudges an absolute wrapper by its margins, both so the box moves whole", () => {
		wrapperPosition = "absolute";
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
		expect(wrapper.style.left).toBe("");
		expect(wrapper.style.marginLeft).toBe("0.5px");
		expect(wrapper.style.marginRight).toBe("-0.5px");
		expect(sub.getBoundingClientRect().left).toBe(245);
	});

	// A list anchored to its wrapper's right edge (the App Switcher's
	// pull-down, a contextual submenu) does not follow a `margin-left`. A
	// nudge that read its natural place as the list's less the nudge would
	// flip between the nudge and none on every render.
	it("keeps the same nudge across renders, reading the natural place with the nudge cleared", () => {
		const menuItems = [
			{ id: "sub", title: "Sub", menuChildren: items(3, "child") },
		];
		const { container, rerender } = render(
			<div data-left={89.5} data-anchor="right">
				<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />
			</div>,
		);
		fireEvent.click(screen.getByText("Sub"));
		const sub = container.querySelector("ul.sub") as HTMLElement;
		const wrapper = sub.parentElement as HTMLElement;
		for (let i = 0; i < 3; i++) {
			expect(wrapper.style.left).toBe("0.5px");
			expect(sub.getBoundingClientRect().left).toBe(245);
			rerender(
				<div data-left={89.5} data-anchor="right">
					<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />
				</div>,
			);
		}
	});

	// The passthrough contract: a consumer's `style` keys win. A host that
	// shows a submenu list itself (`open`) may place its wrapper with the
	// very properties the nudge uses.
	it("adds its nudge to a host's own left, and keeps it across renders", () => {
		const menu = (
			<div data-left={89.5}>
				<ClassicyMenu
					name="m"
					menuItems={items(3)}
					open
					style={{ left: "10px", marginLeft: "2px" }}
				/>
			</div>
		);
		const { container, rerender } = render(menu);
		const list = container.querySelector("ul") as HTMLElement;
		const wrapper = list.parentElement as HTMLElement;
		for (let i = 0; i < 3; i++) {
			// Hanging at 89.5 + 10 + 2 = 101.5: nudged to 102 over the host's
			// own, in a `calc()` (which the engine stores simplified).
			expect(wrapper.style.left).toMatch(/^calc\(/);
			expect(pxOf(wrapper.style.left)).toBe(10.5);
			expect(wrapper.style.marginLeft).toBe("2px");
			expect(list.getBoundingClientRect().left).toBe(102);
			rerender(menu);
		}
	});

	it("adds its nudge to a host's own margins on an absolute wrapper", () => {
		wrapperPosition = "absolute";
		const { container } = render(
			<div data-left={89.5}>
				<ClassicyMenu
					name="m"
					menuItems={items(3)}
					open
					style={{ marginLeft: "2px", marginRight: "3px" }}
				/>
			</div>,
		);
		const list = container.querySelector("ul") as HTMLElement;
		const wrapper = list.parentElement as HTMLElement;
		expect(pxOf(wrapper.style.marginLeft)).toBe(2.5);
		expect(pxOf(wrapper.style.marginRight)).toBe(2.5);
		expect(list.getBoundingClientRect().left).toBe(92);
	});

	// Layout effects run child-first: a submenu nudged from its parent's
	// unnudged place is left off the grid once the parent moves. So a menu
	// nudges its own wrapper, then its open descendants' in tree order.
	it("nudges a parent before its open submenu when both open in one commit", () => {
		const menuItems = [
			{
				id: "sub",
				title: "Sub",
				menuChildren: [
					{ id: "grand", title: "Grand", menuChildren: items(3, "leaf") },
				],
			},
		];
		const { container } = render(
			<div data-left={40.5}>
				<ClassicyMenu name="m" menuItems={menuItems} subNavClass="sub" />
			</div>,
		);
		act(() => {
			fireEvent.click(screen.getByText("Sub"));
			fireEvent.click(screen.getByText("Grand"));
		});
		const [sub, grand] = Array.from(
			container.querySelectorAll<HTMLElement>("ul.sub"),
		);
		// Sub hangs at 40.5 + 155 = 195.5, nudged to 196; Grand at 196 + 155 =
		// 351, on the grid already: no nudge of its own.
		expect(sub.getBoundingClientRect().left).toBe(196);
		expect((sub.parentElement as HTMLElement).style.left).toBe("0.5px");
		expect(grand.getBoundingClientRect().left).toBe(351);
		expect((grand.parentElement as HTMLElement).style.left).toBe("");
	});
});
