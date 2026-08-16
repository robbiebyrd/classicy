import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	ClassicyTable,
	type ClassicyTableColumn,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";

vi.mock("@/SystemFolder/SystemResources/Table/ClassicyTable.scss", () => ({}));

type Album = { id: string; title: string; year: number };

const albums: Album[] = [
	{ id: "rubber", title: "Rubber Soul", year: 1965 },
	{ id: "pepper", title: "Sgt. Pepper", year: 1967 },
	{ id: "abbey", title: "Abbey Road", year: 1969 },
];

const columns: ClassicyTableColumn<Album>[] = [
	{ id: "title", title: "Title", accessor: (a) => a.title },
	{ id: "year", title: "Year", accessor: (a) => a.year, align: "right" },
];

const rowTitles = (container: HTMLElement) =>
	[...container.querySelectorAll("tbody tr td:first-child")].map(
		(td) => td.textContent,
	);

describe("ClassicyTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a semantic table with headers and one row per record", () => {
		const { container } = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		expect(container.querySelector("table")).not.toBeNull();
		expect(screen.getByText("Title")).toBeInTheDocument();
		expect(screen.getByText("Year")).toBeInTheDocument();
		expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
		expect(screen.getByText("Rubber Soul")).toBeInTheDocument();
	});

	it("uses a custom render when provided", () => {
		const custom: ClassicyTableColumn<Album>[] = [
			{
				id: "title",
				title: "Title",
				accessor: (a) => a.title,
				render: (a) => <em>{a.title.toUpperCase()}</em>,
			},
		];
		const { container } = render(
			<ClassicyTable columns={custom} rows={albums} getRowId={(a) => a.id} />,
		);
		expect(container.querySelector("tbody em")).toHaveTextContent(
			"RUBBER SOUL",
		);
	});

	it("clicking a header sorts ascending, clicking again flips to descending, with aria-sort", () => {
		const { container } = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		const yearHeader = screen.getByText("Year").closest("th") as HTMLElement;
		fireEvent.click(yearHeader);
		expect(yearHeader).toHaveAttribute("aria-sort", "ascending");
		expect(rowTitles(container)).toEqual([
			"Rubber Soul",
			"Sgt. Pepper",
			"Abbey Road",
		]);
		fireEvent.click(yearHeader);
		expect(yearHeader).toHaveAttribute("aria-sort", "descending");
		expect(rowTitles(container)).toEqual([
			"Abbey Road",
			"Sgt. Pepper",
			"Rubber Soul",
		]);
	});

	it("honors defaultSort", () => {
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				defaultSort={{ columnId: "title" }}
			/>,
		);
		expect(rowTitles(container)).toEqual([
			"Abbey Road",
			"Rubber Soul",
			"Sgt. Pepper",
		]);
	});

	it("single mode: a click replaces the selection", () => {
		const onSelection = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				onSelectionChange={onSelection}
			/>,
		);
		fireEvent.click(screen.getByText("Sgt. Pepper"));
		expect(onSelection).toHaveBeenLastCalledWith(["pepper"]);
		fireEvent.click(screen.getByText("Abbey Road"));
		expect(onSelection).toHaveBeenLastCalledWith(["abbey"]);
		expect(
			container.querySelectorAll(".classicyTableRowSelected"),
		).toHaveLength(1);
	});

	it("multi mode: ⌘-click toggles and Shift-click extends over the visual order", () => {
		const onSelection = vi.fn();
		render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="multi"
				onSelectionChange={onSelection}
			/>,
		);
		fireEvent.click(screen.getByText("Rubber Soul"));
		fireEvent.click(screen.getByText("Abbey Road"), { shiftKey: true });
		expect(onSelection).toHaveBeenLastCalledWith(["rubber", "pepper", "abbey"]);
		fireEvent.click(screen.getByText("Sgt. Pepper"), { metaKey: true });
		expect(onSelection).toHaveBeenLastCalledWith(["rubber", "abbey"]);
	});

	it("selectionMode none ignores clicks", () => {
		const onSelection = vi.fn();
		render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="none"
				onSelectionChange={onSelection}
			/>,
		);
		fireEvent.click(screen.getByText("Rubber Soul"));
		expect(onSelection).not.toHaveBeenCalled();
	});

	it("arrow keys walk the selection through the sorted order", () => {
		const onSelection = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				defaultSort={{ columnId: "year", desc: true }}
				onSelectionChange={onSelection}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(box, { key: "ArrowDown" });
		// Sorted descending by year, the first row is Abbey Road.
		expect(onSelection).toHaveBeenLastCalledWith(["abbey"]);
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(onSelection).toHaveBeenLastCalledWith(["pepper"]);
		fireEvent.keyDown(box, { key: "End" });
		expect(onSelection).toHaveBeenLastCalledWith(["rubber"]);
	});

	it("Enter activates the cursor row; double-click activates too", () => {
		const onActivate = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				onActivateRow={onActivate}
			/>,
		);
		fireEvent.doubleClick(screen.getByText("Sgt. Pepper"));
		expect(onActivate).toHaveBeenLastCalledWith("pepper", albums[1]);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.click(screen.getByText("Abbey Road"));
		fireEvent.keyDown(box, { key: "Enter" });
		expect(onActivate).toHaveBeenLastCalledWith("abbey", albums[2]);
	});

	it("type-select jumps to the first matching row by the first column", () => {
		const onSelection = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				onSelectionChange={onSelection}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(box, { key: "s" });
		expect(onSelection).toHaveBeenLastCalledWith(["pepper"]);
	});

	it("honors a controlled selected prop", () => {
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="multi"
				selected={["rubber", "abbey"]}
			/>,
		);
		const selectedRows = container.querySelectorAll(
			".classicyTableRowSelected",
		);
		expect(selectedRows).toHaveLength(2);
	});

	it("keeps the sticky header class by default and drops it when disabled", () => {
		const { container, rerender } = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		expect(container.querySelector("thead")).toHaveClass(
			"classicyTableHeaderSticky",
		);
		rerender(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				stickyHeader={false}
			/>,
		);
		expect(container.querySelector("thead")).not.toHaveClass(
			"classicyTableHeaderSticky",
		);
	});
});
