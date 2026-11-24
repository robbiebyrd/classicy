// A windowed table draws only the rows in view and a few either side, two
// spacer rows holding the rest's height (Find File's Items Found, story
// 0227-815 fix rounds 1 and 2): numbered for assistive technology, its
// spacers hidden from it, and sorting, Shift ranges and type-select working
// over the whole list, drawn or not.
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ClassicyTable,
	type ClassicyTableColumn,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import {
	CLASSICY_TABLE_WINDOW_FIRST_ROWS,
	CLASSICY_TABLE_WINDOW_OVERSCAN,
	classicyTableWindowRange,
} from "@/SystemFolder/SystemResources/Table/useClassicyTableWindow.internal";

type Row = { id: string; name: string };
const many = (n: number): Row[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `r${i}`,
		name: `item ${String(i).padStart(4, "0")}`,
	}));

const columns: ClassicyTableColumn<Row>[] = [
	{ id: "name", title: "Name", accessor: (r) => r.name },
];

/** 200 px of viewport, 20 px rows. */
const ROW = 20;
const SHOWN = 200 / ROW + 1;

describe("classicyTableWindowRange", () => {
	const measure = { rowHeight: ROW, rowsTop: 20, viewHeight: 200 };
	it("draws the first rows until it can measure", () => {
		expect(classicyTableWindowRange(1000, 0, undefined)).toEqual([
			0,
			CLASSICY_TABLE_WINDOW_FIRST_ROWS,
		]);
		expect(classicyTableWindowRange(10, 0, undefined)).toEqual([0, 10]);
		expect(
			classicyTableWindowRange(1000, 0, { ...measure, rowHeight: 0 }),
		).toEqual([0, CLASSICY_TABLE_WINDOW_FIRST_ROWS]);
	});

	it("draws the rows in view and the overscan either side, within the list", () => {
		expect(classicyTableWindowRange(1000, 0, measure)).toEqual([
			0,
			SHOWN + CLASSICY_TABLE_WINDOW_OVERSCAN,
		]);
		expect(classicyTableWindowRange(1000, 20 + 500 * ROW, measure)).toEqual([
			500 - CLASSICY_TABLE_WINDOW_OVERSCAN,
			500 + SHOWN + CLASSICY_TABLE_WINDOW_OVERSCAN,
		]);
		expect(classicyTableWindowRange(1000, 20 + 995 * ROW, measure)).toEqual([
			995 - CLASSICY_TABLE_WINDOW_OVERSCAN,
			1000,
		]);
	});
});

/**
 * jsdom does no layout: stand one in. 20 px rows under a 20 px header in a
 * 200 px viewport, whose content moves up as it scrolls; the viewport's
 * scroll position is read and written through `scrollTop`.
 */
const stubLayout = () => {
	let scrolled = 0;
	vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
		function (this: HTMLElement) {
			return this.classList.contains("classicyScrollAreaViewport") ? 200 : 0;
		},
	);
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			const height = this.matches("tr[data-row-id]") ? ROW : 0;
			const top = this.matches("tbody") ? 20 - scrolled : 0;
			return {
				x: 0,
				y: top,
				top,
				left: 0,
				right: 100,
				bottom: top + height,
				width: 100,
				height,
				toJSON: () => ({}),
			} as DOMRect;
		},
	);
	const viewportOf = (container: HTMLElement) => {
		const viewport = container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		Object.defineProperty(viewport, "scrollTop", {
			configurable: true,
			get: () => scrolled,
			set: (value: number) => {
				scrolled = value;
			},
		});
		return viewport;
	};
	/** Scroll to put row `index` at the top of the rows in view. */
	const scrollToRow = (viewport: HTMLElement, index: number) => {
		scrolled = 20 + index * ROW;
		act(() => {
			fireEvent.scroll(viewport);
		});
	};
	return { viewportOf, scrollToRow };
};

const drawnIds = (container: HTMLElement) =>
	Array.from(
		container.querySelectorAll<HTMLElement>("tr[data-row-id]"),
		(tr) => tr.dataset.rowId,
	);

describe("ClassicyTable windowed", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("draws every row when it is not windowed, numbering and reporting none", () => {
		const onRowsShown = vi.fn();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(150)}
				getRowId={(r) => r.id}
				onRowsShown={onRowsShown}
			/>,
		);
		expect(container.querySelectorAll("tr[data-row-id]")).toHaveLength(150);
		expect(container.querySelector(".classicyTableSpacer")).toBeNull();
		expect(container.querySelector("[aria-rowcount]")).toBeNull();
		expect(container.querySelector("[aria-rowindex]")).toBeNull();
		expect(onRowsShown).not.toHaveBeenCalled();
	});

	it("draws a window of the rows, spacers holding the rest, and follows the scroll", async () => {
		const layout = stubLayout();
		const onRowsShown = vi.fn();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
				onRowsShown={onRowsShown}
			/>,
		);
		const viewport = layout.viewportOf(container);
		await waitFor(() =>
			expect(drawnIds(container)).toHaveLength(
				SHOWN + CLASSICY_TABLE_WINDOW_OVERSCAN,
			),
		);
		expect(drawnIds(container)[0]).toBe("r0");
		const spacers = container.querySelectorAll<HTMLElement>(
			".classicyTableSpacer",
		);
		expect(spacers).toHaveLength(1);
		expect(spacers[0].style.height).toBe(
			`${(1000 - SHOWN - CLASSICY_TABLE_WINDOW_OVERSCAN) * ROW}px`,
		);
		expect(onRowsShown).toHaveBeenLastCalledWith(drawnIds(container));

		layout.scrollToRow(viewport, 500);
		await waitFor(() =>
			expect(drawnIds(container)[0]).toBe(
				`r${500 - CLASSICY_TABLE_WINDOW_OVERSCAN}`,
			),
		);
		const [before, after] = Array.from(
			container.querySelectorAll<HTMLElement>(".classicyTableSpacer"),
		);
		expect(before.style.height).toBe(
			`${(500 - CLASSICY_TABLE_WINDOW_OVERSCAN) * ROW}px`,
		);
		expect(after.style.height).toBe(
			`${(1000 - 500 - SHOWN - CLASSICY_TABLE_WINDOW_OVERSCAN) * ROW}px`,
		);
		expect(onRowsShown).toHaveBeenLastCalledWith(drawnIds(container));
	});

	it("numbers its rows from the header's, and hides its spacer rows, for assistive technology", async () => {
		const layout = stubLayout();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
			/>,
		);
		const viewport = layout.viewportOf(container);
		layout.scrollToRow(viewport, 500);
		await waitFor(() =>
			expect(container.querySelectorAll(".classicyTableSpacer")).toHaveLength(
				2,
			),
		);
		const table = container.querySelector("table") as HTMLElement;
		expect(table.getAttribute("aria-rowcount")).toBe("1001");
		expect(table.querySelector("thead tr")?.getAttribute("aria-rowindex")).toBe(
			"1",
		);
		const first = drawnIds(container)[0] as string;
		expect(
			table
				.querySelector(`tr[data-row-id="${first}"]`)
				?.getAttribute("aria-rowindex"),
		).toBe(String(500 - CLASSICY_TABLE_WINDOW_OVERSCAN + 2));
		for (const spacer of Array.from(
			container.querySelectorAll(".classicyTableSpacer"),
		)) {
			expect(spacer.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("reports ids as they are, a newline in one included", async () => {
		stubLayout();
		const onRowsShown = vi.fn();
		render(
			<ClassicyTable<Row>
				columns={columns}
				rows={[
					{ id: "a\nb", name: "first" },
					{ id: "c", name: "second" },
				]}
				getRowId={(r) => r.id}
				windowed
				onRowsShown={onRowsShown}
			/>,
		);
		await waitFor(() =>
			expect(onRowsShown).toHaveBeenLastCalledWith(["a\nb", "c"]),
		);
	});

	it("sorted while scrolled, draws the new order's rows where it stands", async () => {
		const layout = stubLayout();
		const { container, getByText } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
			/>,
		);
		const viewport = layout.viewportOf(container);
		layout.scrollToRow(viewport, 500);
		await waitFor(() => expect(drawnIds(container)[0]).toBe("r490"));
		// First click: ascending (the order it has); second: descending.
		fireEvent.click(getByText("Name"));
		fireEvent.click(getByText("Name"));
		await waitFor(() =>
			expect(drawnIds(container)[0]).toBe(
				`r${999 - (500 - CLASSICY_TABLE_WINDOW_OVERSCAN)}`,
			),
		);
		expect(viewport.scrollTop).toBe(20 + 500 * ROW);
		expect(
			container.querySelector("th[aria-sort]")?.getAttribute("aria-sort"),
		).toBe("descending");
	});

	it("extends a Shift range across rows it has not drawn", async () => {
		const layout = stubLayout();
		const onSelectionChange = vi.fn();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				selectionMode="multi"
				onSelectionChange={onSelectionChange}
				windowed
			/>,
		);
		const viewport = layout.viewportOf(container);
		await waitFor(() => expect(drawnIds(container)).toContain("r2"));
		fireEvent.click(
			container.querySelector('tr[data-row-id="r2"]') as HTMLElement,
		);
		layout.scrollToRow(viewport, 500);
		await waitFor(() => expect(drawnIds(container)).toContain("r505"));
		expect(drawnIds(container)).not.toContain("r2");
		fireEvent.click(
			container.querySelector('tr[data-row-id="r505"]') as HTMLElement,
			{ shiftKey: true },
		);
		const range = onSelectionChange.mock.lastCall?.[0] as string[];
		expect(range).toHaveLength(504);
		expect(range[0]).toBe("r2");
		expect(range.at(-1)).toBe("r505");
	});

	it("type-selects a row it has not drawn, scrolling to it", async () => {
		const layout = stubLayout();
		// Space is no type-select key: names without one.
		const rows = many(1000).map((r) => ({
			...r,
			name: r.name.replace(" ", ""),
		}));
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={rows}
				getRowId={(r) => r.id}
				windowed
			/>,
		);
		const viewport = layout.viewportOf(container);
		await waitFor(() => expect(drawnIds(container)[0]).toBe("r0"));
		const list = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		for (const key of "item09") fireEvent.keyDown(list, { key });
		// "item09" first matches "item0900": scrolled to, then drawn.
		await waitFor(() => expect(viewport.scrollTop).toBeGreaterThan(0));
		act(() => {
			fireEvent.scroll(viewport);
		});
		await waitFor(() =>
			expect(
				container
					.querySelector('tr[data-row-id="r900"]')
					?.getAttribute("data-selected"),
			).toBe("true"),
		);
	});

	it("brings a row the keyboard reaches into view, drawn or not", async () => {
		const layout = stubLayout();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
			/>,
		);
		const viewport = layout.viewportOf(container);
		const list = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(list, { key: "End" });
		// Row 999 ends at 20 + 1000 × 20 px; the 200 px viewport ends there.
		await waitFor(() => expect(viewport.scrollTop).toBe(20 + 1000 * ROW - 200));
		act(() => {
			fireEvent.scroll(viewport);
		});
		await waitFor(() =>
			expect(
				container
					.querySelector('tr[data-row-id="r999"]')
					?.getAttribute("data-selected"),
			).toBe("true"),
		);
	});

	it("windows the list under titles above it, numbered from its own header row", async () => {
		const layout = stubLayout();
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
				headerPlacement="aboveList"
			/>,
		);
		const viewport = layout.viewportOf(container);
		layout.scrollToRow(viewport, 300);
		await waitFor(() =>
			expect(drawnIds(container)[0]).toBe(
				`r${300 - CLASSICY_TABLE_WINDOW_OVERSCAN}`,
			),
		);
		expect(drawnIds(container).length).toBeLessThan(60);
		// The titles drawn are a copy, hidden from assistive technology; the
		// list's own header row stays, row 1, and the rows count from it.
		const copy = container.querySelector(
			".classicyTableDetachedHeader",
		) as HTMLElement;
		expect(copy.getAttribute("aria-hidden")).toBe("true");
		const table = container.querySelector(
			".classicyScrollAreaViewport table",
		) as HTMLElement;
		expect(table.getAttribute("aria-rowcount")).toBe("1001");
		expect(table.querySelector("thead tr")?.getAttribute("aria-rowindex")).toBe(
			"1",
		);
		expect(
			table
				.querySelector(
					`tr[data-row-id="r${300 - CLASSICY_TABLE_WINDOW_OVERSCAN}"]`,
				)
				?.getAttribute("aria-rowindex"),
		).toBe(String(300 - CLASSICY_TABLE_WINDOW_OVERSCAN + 2));
		for (const spacer of Array.from(
			table.querySelectorAll(".classicyTableSpacer"),
		)) {
			expect(spacer.getAttribute("aria-hidden")).toBe("true");
		}
	});
});
