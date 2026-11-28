import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	type ClassicyListNavigationOptions,
	useListNavigation,
} from "@/SystemFolder/SystemResources/Keyboard/useListNavigation";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

const ROWS = Array.from({ length: 12 }, (_, i) => ({
	id: `r${i}`,
	label: `${String.fromCharCode(65 + i)} row`,
}));

// A list driven by the hook alone: each row a focusable option, the keys
// on the list, the id each key reached recorded.
const Harness = ({
	options,
	onNav,
}: {
	options?: ClassicyListNavigationOptions;
	onNav: (id: string | null) => void;
}) => {
	const { tabStopId, registerRef, handleNavKey, setActiveId } =
		useListNavigation(ROWS, options);
	return (
		<div
			role="listbox"
			data-testid="viewport"
			onKeyDown={(e) => onNav(handleNavKey(e))}
		>
			{ROWS.map((r) => (
				<div
					key={r.id}
					role="option"
					aria-selected={false}
					tabIndex={tabStopId === r.id ? 0 : -1}
					ref={(el) => registerRef(r.id, el)}
					onFocus={() => setActiveId(r.id)}
				>
					{r.label}
				</div>
			))}
		</div>
	);
};

const rect = (top: number, height: number) =>
	({
		top,
		bottom: top + height,
		left: 0,
		right: 200,
		width: 200,
		height,
		x: 0,
		y: top,
		toJSON: () => ({}),
	}) as DOMRect;

// Rows 20 px tall from y 100, scrolled `scrolled` rows, in an 80 px viewport
// (four rows shown) registered as a scroll area's.
const layOut = (scrolled = 0) => {
	const viewport = screen.getByTestId("viewport");
	viewport.getBoundingClientRect = () => rect(100, 80);
	Object.defineProperty(viewport, "clientHeight", {
		value: 80,
		configurable: true,
	});
	Object.defineProperty(viewport, "clientWidth", {
		value: 200,
		configurable: true,
	});
	const place = (by: number) =>
		screen.getAllByRole("option").forEach((row, i) => {
			row.getBoundingClientRect = () => rect(100 + (i - by) * 20, 20);
		});
	place(scrolled);
	const unregister = registerClassicyScrollViewport(viewport, {
		lineStep: () => 20,
		scrollBy: () => {},
	});
	return { place, unregister };
};

const row = (i: number) => screen.getAllByRole("option")[i];
const focusRow = (i: number) => act(() => row(i).focus());
// A keydown on the focused row; whether its default was taken.
const press = (key: string, init: KeyboardEventInit = {}) => ({
	defaultPrevented: !fireEvent.keyDown(
		(document.activeElement as HTMLElement) ?? document.body,
		{ key, ...init },
	),
});

afterEach(() => {
	// biome-ignore lint/suspicious/noExplicitAny: jsdom has no scrollIntoView of its own
	delete (Element.prototype as any).scrollIntoView;
});

describe("useListNavigation", () => {
	it("moves one row per arrow, to the ends on Home and End, and type-selects", () => {
		const onNav = vi.fn();
		render(<Harness onNav={onNav} />);
		expect(row(0)).toHaveAttribute("tabindex", "0");
		focusRow(0);
		press("ArrowDown");
		expect(row(1)).toHaveFocus();
		expect(onNav).toHaveBeenLastCalledWith("r1");
		press("End");
		expect(row(11)).toHaveFocus();
		press("Home");
		expect(row(0)).toHaveFocus();
		press("ArrowUp");
		expect(row(0)).toHaveFocus();
		press("e");
		expect(row(4)).toHaveFocus();
		expect(onNav).toHaveBeenLastCalledWith("r4");
	});

	// Without `pageRows` (Platinum, System 7: `selection.pageKeys` absent)
	// the page keys are not the hook's: the list scrolls as it did.
	it("leaves PageUp and PageDown to the caller without pageRows", () => {
		const onNav = vi.fn();
		render(<Harness onNav={onNav} />);
		const { unregister } = layOut();
		focusRow(0);
		const event = press("PageDown");
		expect(event.defaultPrevented).toBe(false);
		expect(onNav).toHaveBeenLastCalledWith(null);
		expect(row(0)).toHaveFocus();
		expect(press("PageUp").defaultPrevented).toBe(false);
		unregister();
	});

	// With it (Windows 98's `selection.pageKeys` "move"; WIG Ch.5 Table 5.1,
	// pp.35-36; comctl32's LISTVIEW_KeyDown): the page's last row shown,
	// then a page less one further; the page's first row, then a page back.
	it("moves to the page's edge, then a page further, with pageRows", () => {
		const onNav = vi.fn();
		const pageRows = vi.fn(() => 4);
		render(<Harness onNav={onNav} options={{ pageRows }} />);
		const { place, unregister } = layOut();
		Element.prototype.scrollIntoView = vi.fn();
		focusRow(1);
		const event = press("PageDown");
		expect(event.defaultPrevented).toBe(true);
		expect(onNav).toHaveBeenLastCalledWith("r3");
		expect(row(3)).toHaveFocus();
		expect(pageRows).toHaveBeenCalled();
		// Scrolled into view by the least amount.
		expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
			block: "nearest",
			inline: "nearest",
		});
		press("PageDown");
		expect(row(6)).toHaveFocus();
		// The browser scrolled row 6 to the bottom: rows 3-6 are shown.
		place(3);
		press("PageUp");
		expect(row(3)).toHaveFocus();
		press("PageUp");
		expect(row(0)).toHaveFocus();
		place(0);
		press("PageUp");
		expect(row(0)).toHaveFocus();
		unregister();
	});

	it("steps the page less one from the row when nothing is laid out", () => {
		const onNav = vi.fn();
		render(<Harness onNav={onNav} options={{ pageRows: () => 5 }} />);
		focusRow(2);
		press("PageDown");
		expect(row(6)).toHaveFocus();
		press("PageDown");
		press("PageDown");
		expect(row(11)).toHaveFocus();
		press("PageUp");
		expect(row(7)).toHaveFocus();
	});
});
