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

describe("ClassicyTable — tree rows (expansion)", () => {
	type Node = { id: string; name: string; children?: Node[] };
	const tree: Node[] = [
		{
			id: "docs",
			name: "Documents",
			children: [{ id: "q1", name: "q1.pdf" }],
		},
		{ id: "top", name: "top.pdf" },
	];
	const treeColumns: ClassicyTableColumn<Node>[] = [
		{
			id: "name",
			title: "Name",
			accessor: (n) => n.name,
			render: (n, expansion) => (
				<span data-depth={expansion.depth}>
					{expansion.canExpand && (
						<button type="button" onClick={expansion.toggle}>
							{expansion.isExpanded ? "▼" : "▶"}
						</button>
					)}
					{n.name}
				</span>
			),
		},
	];

	it("renders children only while their parent is expanded (uncontrolled)", () => {
		render(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
			/>,
		);
		expect(screen.queryByText("q1.pdf")).toBeNull();
		fireEvent.click(screen.getByText("▶"));
		expect(screen.getByText("q1.pdf")).toBeInTheDocument();
		fireEvent.click(screen.getByText("▼"));
		expect(screen.queryByText("q1.pdf")).toBeNull();
	});

	it("reports depth and expandability through the cell context", () => {
		render(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
				expanded={["docs"]}
			/>,
		);
		expect(screen.getByText("q1.pdf")).toHaveAttribute("data-depth", "1");
		expect(screen.getByText("top.pdf")).toHaveAttribute("data-depth", "0");
		// Only the branch row got a disclosure control from the render.
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});

	it("rowCanExpand marks lazily-materialized rows expandable before children exist", () => {
		const lazy: Node[] = [{ id: "docs", name: "Documents" }];
		render(
			<ClassicyTable
				columns={treeColumns}
				rows={lazy}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
				rowCanExpand={(n) => n.id === "docs"}
			/>,
		);
		expect(screen.getByText("▶")).toBeInTheDocument();
	});

	it("controlled expansion fires onToggleRow and follows the prop", () => {
		const onToggle = vi.fn();
		const { rerender } = render(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
				expanded={[]}
				onToggleRow={onToggle}
			/>,
		);
		fireEvent.click(screen.getByText("▶"));
		expect(onToggle).toHaveBeenCalledWith("docs", true);
		// Controlled: nothing appears until the prop changes.
		expect(screen.queryByText("q1.pdf")).toBeNull();
		rerender(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
				expanded={["docs"]}
				onToggleRow={onToggle}
			/>,
		);
		expect(screen.getByText("q1.pdf")).toBeInTheDocument();
	});

	it("keyboard navigation walks expanded children in visual order", () => {
		const onSelection = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
				expanded={["docs"]}
				onSelectionChange={onSelection}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(onSelection).toHaveBeenLastCalledWith(["docs"]);
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(onSelection).toHaveBeenLastCalledWith(["q1"]);
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(onSelection).toHaveBeenLastCalledWith(["top"]);
	});

	it("applies rowClassName alongside the generic classes", () => {
		const { container } = render(
			<ClassicyTable
				columns={treeColumns}
				rows={tree}
				getRowId={(n) => n.id}
				rowClassName={(_n, isSelected) =>
					isSelected ? "legacySelected" : "legacyRow"
				}
			/>,
		);
		fireEvent.click(screen.getByText("top.pdf"));
		const selected = container.querySelector(".classicyTableRowSelected");
		expect(selected).toHaveClass("legacySelected");
		expect(container.querySelector(".legacyRow")).toHaveClass(
			"classicyTableRow",
		);
	});
});

describe("ClassicyTable — Command+Arrow expansion shortcuts", () => {
	type Node = { id: string; name: string; children?: Node[] };
	const tree: Node[] = [
		{
			id: "docs",
			name: "Documents",
			children: [{ id: "q1", name: "q1.pdf" }],
		},
		{ id: "top", name: "top.pdf" },
	];
	const cols: ClassicyTableColumn<Node>[] = [
		{ id: "name", title: "Name", accessor: (n) => n.name },
	];

	it("Cmd+Right expands the cursor row and Cmd+Left collapses it", () => {
		const { container } = render(
			<ClassicyTable
				columns={cols}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.click(screen.getByText("Documents"));
		fireEvent.keyDown(box, { key: "ArrowRight", metaKey: true });
		expect(screen.getByText("q1.pdf")).toBeInTheDocument();
		fireEvent.keyDown(box, { key: "ArrowLeft", metaKey: true });
		expect(screen.queryByText("q1.pdf")).toBeNull();
	});

	it("plain arrows never toggle expansion", () => {
		const { container } = render(
			<ClassicyTable
				columns={cols}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.click(screen.getByText("Documents"));
		fireEvent.keyDown(box, { key: "ArrowRight" });
		expect(screen.queryByText("q1.pdf")).toBeNull();
	});
});
