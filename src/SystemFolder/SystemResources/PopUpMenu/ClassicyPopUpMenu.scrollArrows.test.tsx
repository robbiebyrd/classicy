// A pop-up menu too long for its space scrolls as Mac OS menus do (HIG7
// pp.78 and 83, "it scrolls like other menus"): no scroll bar, but an
// indicator at the end with items hidden past it, and the menu scrolls while
// the pointer rests on one. jsdom lays nothing out, so the list's extents,
// its scroll position and the rows' height are stubbed.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

const ROW = 20;
const many = Array.from({ length: 40 }, (_, i) => ({
	value: `opt-${i}`,
	label: `Option ${i}`,
}));

// The open list: 40 rows of 20 px (800) in a 200 px box.
let content = 40 * ROW;
const VISIBLE = 200;
const scroll = new WeakMap<Element, number>();
const isList = (el: Element) => el.classList.contains("classicyPopUpMenuList");
const originals = new Map<string, PropertyDescriptor | undefined>();

const stub = (key: string, descriptor: PropertyDescriptor) => {
	originals.set(
		key,
		Object.getOwnPropertyDescriptor(HTMLElement.prototype, key) ??
			Object.getOwnPropertyDescriptor(Element.prototype, key),
	);
	Object.defineProperty(HTMLElement.prototype, key, {
		configurable: true,
		...descriptor,
	});
};

beforeEach(() => {
	content = 40 * ROW;
	stub("scrollHeight", {
		get(this: HTMLElement) {
			return isList(this) ? content : 0;
		},
	});
	stub("clientHeight", {
		get(this: HTMLElement) {
			return isList(this) ? Math.min(VISIBLE, content) : 0;
		},
	});
	stub("offsetHeight", {
		get(this: HTMLElement) {
			return this.getAttribute("role") === "option" ? ROW : 0;
		},
	});
	stub("scrollTop", {
		get(this: HTMLElement) {
			return scroll.get(this) ?? 0;
		},
		set(this: HTMLElement, value: number) {
			const max = Math.max(content - Math.min(VISIBLE, content), 0);
			scroll.set(this, Math.min(Math.max(value, 0), max));
		},
	});
});

afterEach(() => {
	for (const [key, descriptor] of originals) {
		if (descriptor)
			Object.defineProperty(HTMLElement.prototype, key, descriptor);
		else
			delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
	}
	originals.clear();
	vi.useRealTimers();
});

const arrow = (direction: "up" | "down") =>
	document.querySelector<HTMLElement>(
		`[${CLASSICY_PART_ATTRIBUTE.part}="menu-scroll-${direction}"]`,
	);

const open = (options = many, selected = "opt-0") => {
	render(<ClassicyPopUpMenu id="list" options={options} selected={selected} />);
	fireEvent.click(screen.getByRole("combobox"));
	const list = screen.getByRole("listbox");
	// From the top of the list, whatever the aligned placement scrolled to.
	act(() => {
		list.scrollTop = 0;
		fireEvent.scroll(list);
	});
	return list;
};

describe("ClassicyPopUpMenu scroll indicators", () => {
	it("shows the indicator toward the hidden items only", () => {
		open();
		const down = arrow("down");
		expect(down).not.toBeNull();
		expect(down?.getAttribute("aria-hidden")).toBe("true");
		expect(down?.classList.contains("classicyPopUpMenuScrollArrow")).toBe(true);
		expect(down?.classList.contains("classicyPopUpMenuScrollArrowDown")).toBe(
			true,
		);
		expect(arrow("up")).toBeNull();
	});

	it("draws none on a menu that fits", () => {
		content = 3 * ROW;
		open(many.slice(0, 3));
		expect(arrow("up")).toBeNull();
		expect(arrow("down")).toBeNull();
	});

	it("follows the list's scrolling: up once scrolled, down gone at the end", () => {
		const list = open();
		act(() => {
			list.scrollTop = 300;
			fireEvent.scroll(list);
		});
		expect(arrow("up")).not.toBeNull();
		expect(arrow("down")).not.toBeNull();
		act(() => {
			list.scrollTop = 600;
			fireEvent.scroll(list);
		});
		expect(arrow("up")).not.toBeNull();
		expect(arrow("down")).toBeNull();
	});

	it("scrolls a row at a time while the pointer rests on an indicator, until it leaves", () => {
		vi.useFakeTimers();
		const list = open();
		fireEvent.mouseEnter(arrow("down") as HTMLElement);
		expect(list.scrollTop).toBe(ROW);
		act(() => {
			vi.advanceTimersByTime(120 * 2);
		});
		expect(list.scrollTop).toBe(3 * ROW);
		fireEvent.mouseLeave(arrow("down") as HTMLElement);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(list.scrollTop).toBe(3 * ROW);
		// And back up from the other end.
		fireEvent.mouseEnter(arrow("up") as HTMLElement);
		expect(list.scrollTop).toBe(2 * ROW);
		fireEvent.mouseLeave(arrow("up") as HTMLElement);
	});

	it("stops at the end of the list, where its indicator goes", () => {
		vi.useFakeTimers();
		const list = open();
		fireEvent.mouseEnter(arrow("down") as HTMLElement);
		act(() => {
			vi.advanceTimersByTime(120 * 100);
		});
		expect(list.scrollTop).toBe(600);
		expect(arrow("down")).toBeNull();
	});

	it("keeps the menu open on a press on an indicator", () => {
		open();
		fireEvent.mouseDown(arrow("down") as HTMLElement);
		expect(screen.queryByRole("listbox")).not.toBeNull();
	});

	it("scrolls the list for the wheel over an indicator", () => {
		const list = open();
		fireEvent.wheel(arrow("down") as HTMLElement, { deltaY: 45 });
		expect(list.scrollTop).toBe(45);
	});

	it("scrolls the list by rows for a wheel that counts lines, and by pages", () => {
		const list = open();
		// deltaMode 1: lines, a row each.
		fireEvent.wheel(arrow("down") as HTMLElement, { deltaY: 2, deltaMode: 1 });
		expect(list.scrollTop).toBe(2 * ROW);
		// deltaMode 2: pages, the list's height each.
		fireEvent.wheel(arrow("down") as HTMLElement, { deltaY: 1, deltaMode: 2 });
		expect(list.scrollTop).toBe(2 * ROW + VISIBLE);
	});

	it("reads only the scroll extents as the list scrolls, never its box or style", () => {
		const list = open();
		const boxes = vi.spyOn(list, "getBoundingClientRect");
		const styles = vi.spyOn(window, "getComputedStyle");
		act(() => {
			list.scrollTop = 300;
			fireEvent.scroll(list);
		});
		fireEvent.mouseEnter(arrow("down") as HTMLElement);
		fireEvent.mouseLeave(arrow("down") as HTMLElement);
		fireEvent.wheel(arrow("down") as HTMLElement, { deltaY: 20 });
		expect(arrow("up")).not.toBeNull();
		expect(boxes).not.toHaveBeenCalled();
		expect(styles).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});

	// The keyboard moves the highlight, and the pop-up scrolls it into view
	// (`scrollIntoView({ block: "nearest" })`), which honors the list's scroll
	// padding. jsdom scrolls nothing, so a stand-in does what a browser does
	// with the padding the list really carries.
	it("lets the keyboard scroll the list past the indicators, which follow", () => {
		const nearest = vi.fn(function (this: Element) {
			const list = this.closest(".classicyPopUpMenuList") as HTMLElement;
			const pad = (side: "Top" | "Bottom") =>
				Number.parseFloat(list.style[`scrollPadding${side}`]) || 0;
			const index = Number(this.id.split("-opt-").pop());
			const top = index * ROW;
			if (top - pad("Top") < list.scrollTop) {
				list.scrollTop = top - pad("Top");
			} else if (top + ROW + pad("Bottom") > list.scrollTop + VISIBLE) {
				list.scrollTop = top + ROW + pad("Bottom") - VISIBLE;
			}
			list.dispatchEvent(new Event("scroll"));
		});
		Object.defineProperty(Element.prototype, "scrollIntoView", {
			configurable: true,
			value: nearest,
		});
		try {
			const list = open();
			const button = screen.getByRole("combobox");
			expect(list.style.scrollPaddingTop).toBe(`${ROW}px`);
			expect(list.style.scrollPaddingBottom).toBe(`${ROW}px`);
			expect(arrow("up")).toBeNull();
			// Down to the tenth item: the list scrolls, its bottom row (under
			// the down indicator) left clear, and the up indicator appears.
			for (let i = 0; i < 9; i++)
				fireEvent.keyDown(button, { key: "ArrowDown" });
			expect(list.scrollTop).toBe(10 * ROW + ROW - VISIBLE);
			expect(arrow("up")).not.toBeNull();
			expect(arrow("down")).not.toBeNull();
			// End: the last item, the down indicator gone.
			fireEvent.keyDown(button, { key: "End" });
			expect(arrow("down")).toBeNull();
			// Home: back to the top, the up indicator gone.
			fireEvent.keyDown(button, { key: "Home" });
			expect(list.scrollTop).toBe(0);
			expect(arrow("up")).toBeNull();
		} finally {
			delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
		}
	});

	it("lies inside the list's frame, padding and rows' margins, one row tall", () => {
		const sheet = document.createElement("style");
		sheet.textContent =
			".classicyPopUpMenuList { padding: 2px; } .classicyPopUpMenuListItem { margin: 0 3px; }";
		document.head.append(sheet);
		stub("clientLeft", {
			get(this: HTMLElement) {
				return isList(this) ? 1 : 0;
			},
		});
		stub("clientTop", {
			get(this: HTMLElement) {
				return isList(this) ? 1 : 0;
			},
		});
		stub("clientWidth", {
			get(this: HTMLElement) {
				return isList(this) ? 198 : 0;
			},
		});
		// The list's box on screen; measured when it opens and is placed.
		const rect = HTMLElement.prototype.getBoundingClientRect;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				return isList(this)
					? DOMRect.fromRect({ x: 40, y: 100, width: 200, height: 202 })
					: rect.call(this);
			},
		);
		try {
			const list = open();
			act(() => {
				list.scrollTop = 100;
				fireEvent.scroll(list);
			});
			const box = (el: HTMLElement | null) => ({
				left: el?.style.left,
				top: el?.style.top,
				width: el?.style.width,
				height: el?.style.height,
			});
			// 40 + border 1 + padding 2 + margin 3; 198 + 1 less 6 on the left
			// and 5 on the right.
			expect(box(arrow("up"))).toEqual({
				left: "46px",
				top: "103px",
				width: "188px",
				height: "20px",
			});
			// The inside bottom, 100 + 1 + 200 - 2, less a row.
			expect(box(arrow("down"))).toEqual({
				left: "46px",
				top: "279px",
				width: "188px",
				height: "20px",
			});
		} finally {
			sheet.remove();
			vi.restoreAllMocks();
		}
	});

	it("is not a menu item: no option role, outside the listbox", () => {
		const list = open();
		expect(list.contains(arrow("down"))).toBe(false);
		expect(screen.getAllByRole("option")).toHaveLength(40);
	});
});

// A combo box's suggestion list is the same menu (it shares the pop-up's
// list), so it scrolls the same way.
describe("ClassicyComboBox scroll indicators", () => {
	const openCombo = () => {
		render(<ClassicyComboBox id="combo" options={many} />);
		fireEvent.click(screen.getByRole("button", { name: "Show options" }));
		return screen.getByRole("listbox");
	};

	it("shows the indicator toward the hidden suggestions and scrolls on it", () => {
		vi.useFakeTimers();
		const list = openCombo();
		expect(arrow("up")).toBeNull();
		fireEvent.mouseEnter(arrow("down") as HTMLElement);
		expect(list.scrollTop).toBe(ROW);
		fireEvent.mouseLeave(arrow("down") as HTMLElement);
		expect(arrow("up")).not.toBeNull();
	});

	it("keeps the list open and the field focused on a press on an indicator", () => {
		openCombo();
		const input = screen.getByRole("combobox");
		input.focus();
		const press = fireEvent.mouseDown(arrow("down") as HTMLElement);
		// Default prevented: the press never moves focus off the field.
		expect(press).toBe(false);
		expect(screen.queryByRole("listbox")).not.toBeNull();
	});

	it("follows the suggestions as they are filtered", () => {
		openCombo();
		expect(arrow("down")).not.toBeNull();
		content = 3 * ROW;
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "Option 1" },
		});
		expect(arrow("down")).toBeNull();
	});
});

describe("ClassicyPopUpMenu scroll indicators: vocabulary and stylesheet", () => {
	it("declares the indicator parts", () => {
		const vocabulary = JSON.parse(
			readFileSync(
				path.join(
					__dirname,
					"../../../Appearance/vocabulary/ClassicyVocabulary.json",
				),
				"utf8",
			),
		);
		expect(vocabulary.attributes["data-classicy-part"]).toEqual(
			expect.arrayContaining(["menu-scroll-up", "menu-scroll-down"]),
		);
		expect(vocabulary.components.PopUpMenu).toEqual(
			expect.arrayContaining([
				"ScrollArrow",
				"ScrollArrowUp",
				"ScrollArrowDown",
			]),
		);
	});

	it("hides the browser's own bar on the list, in every engine", () => {
		const base = readFileSync(
			path.join(__dirname, "ClassicyPopUpMenu.scss"),
			"utf8",
		);
		const start = base.indexOf(".classicyPopUpMenuList {");
		const list = base.slice(start, base.indexOf("\n}", start));
		expect(list).toMatch(/scrollbar-width:\s*none/);
		expect(list).toMatch(/&::-webkit-scrollbar\s*{\s*display:\s*none/);
	});
});
