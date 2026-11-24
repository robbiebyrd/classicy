// A windowed table draws only the rows in view and a few either side, two
// spacer rows holding the rest's height (Find File's Items Found, story
// 0227-815 fix round 1).
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyTable } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
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

describe("classicyTableWindowRange", () => {
	const measure = { rowHeight: 20, rowsTop: 20, viewHeight: 200 };
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
		// 200 px of 20 px rows: 10 in view, 11 counted, plus the overscan.
		expect(classicyTableWindowRange(1000, 0, measure)).toEqual([
			0,
			11 + CLASSICY_TABLE_WINDOW_OVERSCAN,
		]);
		expect(classicyTableWindowRange(1000, 20 + 500 * 20, measure)).toEqual([
			500 - CLASSICY_TABLE_WINDOW_OVERSCAN,
			500 + 11 + CLASSICY_TABLE_WINDOW_OVERSCAN,
		]);
		expect(classicyTableWindowRange(1000, 20 + 995 * 20, measure)).toEqual([
			995 - CLASSICY_TABLE_WINDOW_OVERSCAN,
			1000,
		]);
	});
});

describe("ClassicyTable windowed", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const columns = [{ id: "name", title: "Name", accessor: (r: Row) => r.name }];

	it("draws every row when it is not windowed, and tells which", () => {
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
		expect(onRowsShown).toHaveBeenLastCalledWith(many(150).map((r) => r.id));
	});

	it("draws a window of the rows, spacers holding the rest, and follows the scroll", async () => {
		// A layout: 20 px rows under a 20 px header, a 200 px viewport whose
		// content moves up as it scrolls.
		let scrolled = 0;
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyScrollAreaViewport") ? 200 : 0;
			},
		);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const height = this.matches("tr[data-row-id]") ? 20 : 0;
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
		const drawn = () =>
			Array.from(
				container.querySelectorAll<HTMLElement>("tr[data-row-id]"),
				(tr) => tr.dataset.rowId,
			);
		await waitFor(() =>
			expect(drawn()).toHaveLength(11 + CLASSICY_TABLE_WINDOW_OVERSCAN),
		);
		expect(drawn()[0]).toBe("r0");
		const spacers = container.querySelectorAll<HTMLElement>(
			".classicyTableSpacer",
		);
		expect(spacers).toHaveLength(1);
		expect(spacers[0].style.height).toBe(
			`${(1000 - 11 - CLASSICY_TABLE_WINDOW_OVERSCAN) * 20}px`,
		);
		expect(spacers[0].querySelector("td")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
		expect(
			container.querySelector("table")?.getAttribute("aria-rowcount"),
		).toBe("1001");
		expect(
			container
				.querySelector('tr[data-row-id="r3"]')
				?.getAttribute("aria-rowindex"),
		).toBe("5");

		// Scrolled to row 500.
		const viewport = container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		// jsdom does no layout: the viewport's scroll position is stubbed.
		scrolled = 20 + 500 * 20;
		Object.defineProperty(viewport, "scrollTop", {
			configurable: true,
			value: scrolled,
		});
		act(() => {
			fireEvent.scroll(viewport);
		});
		await waitFor(() =>
			expect(drawn()[0]).toBe(`r${500 - CLASSICY_TABLE_WINDOW_OVERSCAN}`),
		);
		const [before, after] = Array.from(
			container.querySelectorAll<HTMLElement>(".classicyTableSpacer"),
		);
		expect(before.style.height).toBe(
			`${(500 - CLASSICY_TABLE_WINDOW_OVERSCAN) * 20}px`,
		);
		expect(after.style.height).toBe(
			`${(1000 - 500 - 11 - CLASSICY_TABLE_WINDOW_OVERSCAN) * 20}px`,
		);
		expect(onRowsShown).toHaveBeenLastCalledWith(drawn());
	});

	it("brings a row the keyboard reaches into view, drawn or not", async () => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("classicyScrollAreaViewport") ? 200 : 0;
			},
		);
		let top = 0;
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const height = this.matches("tr[data-row-id]") ? 20 : 0;
				const y = this.matches("tbody") ? 20 - top : 0;
				return {
					x: 0,
					y,
					top: y,
					left: 0,
					right: 100,
					bottom: y + height,
					width: 100,
					height,
					toJSON: () => ({}),
				} as DOMRect;
			},
		);
		const { container } = render(
			<ClassicyTable<Row>
				columns={columns}
				rows={many(1000)}
				getRowId={(r) => r.id}
				windowed
			/>,
		);
		const list = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		const viewport = container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		Object.defineProperty(viewport, "scrollTop", {
			configurable: true,
			get: () => top,
			set: (value: number) => {
				top = value;
			},
		});
		fireEvent.keyDown(list, { key: "End" });
		// The last row: scrolled to, then drawn and selected.
		// Row 999 ends at 20 + 1000 × 20 px; the 200 px viewport ends there.
		await waitFor(() => expect(viewport.scrollTop).toBe(20 + 1000 * 20 - 200));
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
});
