import { type CSSProperties, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import {
	ClassicyTable,
	type ClassicyTableColumn,
	type ClassicyTableSelectionApi,
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
			container.querySelectorAll(".classicyTableRow.selected"),
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
			".classicyTableRow.selected",
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
		const selected = container.querySelector(".classicyTableRow.selected");
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

	// A cell's DOM has to SURVIVE an ordinary re-render. The browser only
	// synthesizes a `click` when the node that received `mousedown` is still
	// attached once `mouseup` has finished dispatching — and React runs its own
	// handlers during `mouseup`. So if a re-render mid-press (a consumer passing
	// fresh inline callbacks, a store update on window focus) tears down and
	// rebuilds the nodes inside a cell, every click that lands on real cell
	// content — a filename label, an icon, a disclosure triangle — is silently
	// swallowed, while clicks on a cell's empty padding still register.
	it("keeps cell and header DOM nodes across a re-render with fresh callbacks", () => {
		const marked: ClassicyTableColumn<Album>[] = [
			{
				id: "title",
				title: "Title",
				accessor: (a) => a.title,
				render: (a) => <em>{a.title}</em>,
			},
		];
		const view = (onToggleRow: (id: string, open: boolean) => void) => (
			<ClassicyTable
				columns={marked}
				rows={albums}
				getRowId={(a) => a.id}
				onToggleRow={onToggleRow}
			/>
		);
		const { container, rerender } = render(view(() => {}));
		const cellBefore = container.querySelector("tbody em");
		const headerBefore = container.querySelector("thead th span");
		expect(cellBefore).not.toBeNull();
		expect(headerBefore).not.toBeNull();

		// A brand-new inline callback, exactly as consumers pass one.
		rerender(view(() => {}));

		expect(container.querySelector("tbody em")).toBe(cellBefore);
		expect(container.querySelector("thead th span")).toBe(headerBefore);
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

describe("ClassicyTable — Select All", () => {
	type TreeNode = { id: string; name: string; subRows?: TreeNode[] };
	const treeRows: TreeNode[] = [
		{
			id: "parent",
			name: "Parent",
			subRows: [{ id: "child", name: "Child" }],
		},
	];
	const treeColumns: ClassicyTableColumn<TreeNode>[] = [
		{ id: "name", title: "Name", accessor: (n) => n.name },
	];

	it("selects every visible row through the selection API", () => {
		const onSelectionChange = vi.fn();
		const apiRef = createRef<ClassicyTableSelectionApi>();
		render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode={"multi"}
				onSelectionChange={onSelectionChange}
				selectionApiRef={apiRef}
			/>,
		);
		act(() => apiRef.current?.selectAll());
		expect(onSelectionChange).toHaveBeenCalledWith(albums.map((a) => a.id));
	});

	it("includes rows disclosed under an expanded parent", () => {
		const onSelectionChange = vi.fn();
		const apiRef = createRef<ClassicyTableSelectionApi>();
		render(
			<ClassicyTable
				columns={treeColumns}
				rows={treeRows}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.subRows}
				expanded={["parent"]}
				selectionMode={"multi"}
				onSelectionChange={onSelectionChange}
				selectionApiRef={apiRef}
			/>,
		);
		act(() => apiRef.current?.selectAll());
		const ids = onSelectionChange.mock.calls[0][0];
		expect(ids).toContain("parent");
		expect(ids).toContain("child");
	});

	it("selects all on Command-A in multi mode", () => {
		const onSelectionChange = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode={"multi"}
				onSelectionChange={onSelectionChange}
			/>,
		);
		const grid = container.querySelector("[tabindex='0']") as HTMLElement;
		grid.focus();
		fireEvent.keyDown(grid, { key: "a", metaKey: true });
		expect(onSelectionChange).toHaveBeenCalledWith(albums.map((a) => a.id));
	});

	it("ignores Command-A in single-selection mode", () => {
		const onSelectionChange = vi.fn();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode={"single"}
				onSelectionChange={onSelectionChange}
			/>,
		);
		const grid = container.querySelector("[tabindex='0']") as HTMLElement;
		fireEvent.keyDown(grid, { key: "a", metaKey: true });
		expect(onSelectionChange).not.toHaveBeenCalled();
	});

	// Ruling 5: the ⌘A switch case must `break`, not `return`, on a bare "a"
	// so it falls through into the type-select logic below the switch. This
	// proves that fallthrough actually reaches it.
	it("still type-selects on a bare 'a' keypress after the Select-All switch case", () => {
		const onSelectionChange = vi.fn();
		const localAlbums = [
			{ id: "abbey", title: "Abbey Road", year: 1969 },
			{ id: "rubber", title: "Rubber Soul", year: 1965 },
		];
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={localAlbums}
				getRowId={(a) => a.id}
				onSelectionChange={onSelectionChange}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(box, { key: "a" });
		expect(onSelectionChange).toHaveBeenLastCalledWith(["abbey"]);
	});
});

describe("ClassicyTable containerRef (#270)", () => {
	it("receives the focusable list-box container", () => {
		const containerRef = createRef<HTMLDivElement>();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				containerRef={containerRef}
			/>,
		);
		expect(containerRef.current).toBe(
			container.querySelector(".classicyTableContainer"),
		);
		expect(containerRef.current?.tabIndex).toBe(0);
	});

	it("still drives keyboard selection when focused through the ref", () => {
		const onSelectionChange = vi.fn();
		const containerRef = createRef<HTMLDivElement>();
		render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				onSelectionChange={onSelectionChange}
				containerRef={containerRef}
			/>,
		);
		const box = containerRef.current as HTMLDivElement;
		act(() => box.focus());
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(onSelectionChange).toHaveBeenLastCalledWith(["rubber"]);
	});

	it("clears the ref on unmount", () => {
		const containerRef = createRef<HTMLDivElement>();
		const { unmount } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				containerRef={containerRef}
			/>,
		);
		unmount();
		expect(containerRef.current).toBeNull();
	});
});

describe("ClassicyTable column resize when the pointer stream is lost", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const renderTable = () => {
		const view = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		const header = view.container.querySelector("th") as HTMLElement;
		const resizer = header.querySelector(".resizer") as HTMLElement;
		return { ...view, header, resizer };
	};
	const isResizing = (container: HTMLElement) =>
		container.querySelector(".isResizing") !== null;

	it("follows the pointer and ends on release", () => {
		const { container, header, resizer } = renderTable();
		expect(header.style.width).toBe("150px");
		fireEvent.mouseDown(resizer, { clientX: 100 });
		expect(isResizing(container)).toBe(true);
		fireEvent.mouseMove(document, { clientX: 150 });
		expect(header.style.width).toBe("200px");
		fireEvent.mouseUp(document, { clientX: 150 });
		expect(isResizing(container)).toBe(false);
		fireEvent.mouseMove(document, { clientX: 250 });
		expect(header.style.width).toBe("200px");
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a mouse resize at the width reached on a %s", (loss) => {
		const { container, header, resizer } = renderTable();
		const removed = vi.spyOn(document, "removeEventListener");
		fireEvent.mouseDown(resizer, { clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		expect(header.style.width).toBe("200px");

		losePointerStream(loss);
		// Ended as a release there would end it: the column keeps the width
		// on screen, and the table is no longer resizing.
		expect(isResizing(container)).toBe(false);
		expect(header.style.width).toBe("200px");
		// TanStack's own listeners went with it.
		const types = removed.mock.calls.map(([type]) => type);
		expect(types).toContain("mousemove");
		expect(types).toContain("mouseup");

		// The pointer coming back does not move the column, and the release
		// that finally comes changes nothing.
		fireEvent.mouseMove(document, { clientX: 300 });
		fireEvent.mouseUp(document, { clientX: 300 });
		expect(header.style.width).toBe("200px");
		expect(isResizing(container)).toBe(false);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a touch resize at the width reached on a %s", (loss) => {
		const { container, header, resizer } = renderTable();
		fireEvent.touchStart(resizer, { touches: [{ clientX: 100 }] });
		expect(isResizing(container)).toBe(true);
		fireEvent.touchMove(document, { touches: [{ clientX: 130 }] });
		expect(header.style.width).toBe("180px");

		losePointerStream(loss);
		expect(isResizing(container)).toBe(false);
		expect(header.style.width).toBe("180px");

		fireEvent.touchMove(document, { touches: [{ clientX: 300 }] });
		expect(header.style.width).toBe("180px");
	});

	it("keeps the width when the stream is lost before the pointer moved", () => {
		const { container, header, resizer } = renderTable();
		fireEvent.mouseDown(resizer, { clientX: 100 });
		losePointerStream("blur");
		expect(isResizing(container)).toBe(false);
		fireEvent.mouseMove(document, { clientX: 300 });
		expect(header.style.width).toBe("150px");
	});

	it("ends the resize once when one loss fires several events", () => {
		const { container, resizer } = renderTable();
		const released = vi.fn();
		document.addEventListener("mouseup", released);
		fireEvent.mouseDown(resizer, { clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		// Hiding a tab also blurs the window, in one task.
		act(() => {
			window.dispatchEvent(new Event("blur"));
			document.dispatchEvent(new Event("pointercancel"));
		});
		document.removeEventListener("mouseup", released);
		expect(released).toHaveBeenCalledOnce();
		expect(isResizing(container)).toBe(false);
	});

	it("watches the pointer stream only while a resize lasts", () => {
		const live = trackPointerStreamListeners();
		const { resizer } = renderTable();
		expect(live.size).toBe(0);
		fireEvent.mouseDown(resizer, { clientX: 100 });
		expect(live.size).toBe(3);
		fireEvent.mouseMove(document, { clientX: 150 });
		fireEvent.mouseUp(document, { clientX: 150 });
		expect(live.size).toBe(0);
		fireEvent.mouseDown(resizer, { clientX: 100 });
		expect(live.size).toBe(3);
		losePointerStream("pointercancel");
		expect(live.size).toBe(0);
	});

	it("sends no release of its own after a normal one", () => {
		const { resizer, unmount } = renderTable();
		const released = vi.fn();
		document.addEventListener("mouseup", released);
		fireEvent.mouseDown(resizer, { clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		fireEvent.mouseUp(document, { clientX: 150 });
		losePointerStream("blur");
		unmount();
		document.removeEventListener("mouseup", released);
		// Only the user's own release.
		expect(released).toHaveBeenCalledOnce();
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("cleans up when it unmounts mid-resize, then sees a %s", (loss) => {
		const consoleError = vi.spyOn(console, "error");
		const live = trackPointerStreamListeners();
		const removed = vi.spyOn(document, "removeEventListener");
		const { resizer, unmount } = renderTable();
		fireEvent.mouseDown(resizer, { clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		expect(live.size).toBe(3);
		unmount();
		expect(live.size).toBe(0);
		// TanStack's document listeners do not outlive the table.
		const types = removed.mock.calls.map(([type]) => type);
		expect(types).toContain("mousemove");
		expect(types).toContain("mouseup");
		losePointerStream(loss);
		fireEvent.mouseMove(document, { clientX: 300 });
		fireEvent.mouseUp(document, { clientX: 300 });
		expect(consoleError).not.toHaveBeenCalled();
	});
});

// Story 0214-c61: HIGOS8 Figs. 2-24 and 2-43 draw the sorted column's cells
// a step darker, down to the list's bottom. The table marks the sorted
// column's cells with the part class `classicyTableCellSorted` and publishes
// the sorted header's place on its container (`--classicy-table-sorted-start`
// and `--classicy-table-sorted-width`, 0 when nothing is sorted), so a
// package can draw the column below the last row too.
describe("ClassicyTable's sorted column", () => {
	const sortedCells = (container: HTMLElement) =>
		[...container.querySelectorAll("tbody td.classicyTableCellSorted")].map(
			(td) => td.textContent,
		);
	const listBox = (container: HTMLElement) =>
		container.querySelector(".classicyTableContainer") as HTMLElement;

	it("marks the sorted column's cells, and follows a new sort", () => {
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				defaultSort={{ columnId: "title" }}
			/>,
		);
		expect(sortedCells(container)).toEqual([
			"Abbey Road",
			"Rubber Soul",
			"Sgt. Pepper",
		]);
		fireEvent.click(screen.getByText("Year").closest("th") as HTMLElement);
		expect(sortedCells(container)).toEqual(["1965", "1967", "1969"]);
	});

	it("marks no cell when nothing is sorted, and publishes a zero width", () => {
		const { container } = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		expect(sortedCells(container)).toEqual([]);
		const style = listBox(container).style;
		expect(style.getPropertyValue("--classicy-table-sorted-start")).toBe("0px");
		expect(style.getPropertyValue("--classicy-table-sorted-width")).toBe("0px");
	});

	it("publishes the sorted header's place, from the container's left edge", () => {
		const rect = (left: number, width: number) =>
			({
				left,
				width,
				right: left + width,
				top: 0,
				bottom: 0,
				height: 0,
				x: left,
				y: 0,
				toJSON: () => ({}),
			}) as DOMRect;
		const spy = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				if (this.classList.contains("classicyTableContainer"))
					return rect(100, 300);
				if (this.getAttribute("aria-sort")) return rect(220, 80);
				return rect(0, 0);
			});
		try {
			const { container } = render(
				<ClassicyTable
					columns={columns}
					rows={albums}
					getRowId={(a) => a.id}
					defaultSort={{ columnId: "year" }}
				/>,
			);
			const style = listBox(container).style;
			expect(style.getPropertyValue("--classicy-table-sorted-start")).toBe(
				"120px",
			);
			expect(style.getPropertyValue("--classicy-table-sorted-width")).toBe(
				"80px",
			);
		} finally {
			spy.mockRestore();
		}
	});
});

// Story 0216-1im F9: column titles above the list, in the scroll area's head
// (System 7's Finder list view, HIG p.218), the vertical bar starting under
// them. A table that leaves the scrolling to an ancestor portals them into
// that ancestor's head; one that scrolls itself puts them in its own.
describe("ClassicyTable's titles above the list", () => {
	const headOf = (container: HTMLElement) =>
		container.querySelector<HTMLElement>(".classicyScrollAreaHead");

	it("keeps its titles in the list by default", () => {
		const { container } = render(
			<ClassicyScrollArea>
				<ClassicyTable
					columns={columns}
					rows={albums}
					getRowId={(a) => a.id}
					scrollable={false}
				/>
			</ClassicyScrollArea>,
		);
		expect(headOf(container)).toBeNull();
		expect(container.querySelector(".classicyTableDetachedHeader")).toBeNull();
		expect(
			container
				.querySelector("thead")
				?.classList.contains("classicyTableHeaderSticky"),
		).toBe(true);
	});

	it("puts its titles in the scrolling ancestor's head, the list's own titles kept for assistive technology", () => {
		const { container } = render(
			<ClassicyScrollArea>
				<ClassicyTable
					columns={columns}
					rows={albums}
					getRowId={(a) => a.id}
					scrollable={false}
					headerPlacement="aboveList"
				/>
			</ClassicyScrollArea>,
		);
		const head = headOf(container) as HTMLElement;
		const detached = head.querySelector(
			":scope > .classicyTableDetachedHeader",
		) as HTMLElement;
		expect(detached).not.toBeNull();
		expect(detached.getAttribute("aria-hidden")).toBe("true");
		expect(
			[...detached.querySelectorAll("th")].map((th) => th.textContent),
		).toEqual(["Title", "Year"]);
		const own = container.querySelector(
			".classicyTableContainer thead",
		) as HTMLElement;
		expect(own.classList.contains("classicyTableHeaderHidden")).toBe(true);
		expect(own.classList.contains("classicyTableHeaderSticky")).toBe(false);
		expect(own.getAttribute("aria-hidden")).toBeNull();
	});

	it("sorts from a title above the list", () => {
		const { container } = render(
			<ClassicyScrollArea>
				<ClassicyTable
					columns={columns}
					rows={albums}
					getRowId={(a) => a.id}
					scrollable={false}
					headerPlacement="aboveList"
				/>
			</ClassicyScrollArea>,
		);
		const year = [
			...(headOf(container) as HTMLElement).querySelectorAll("th"),
		].find((th) => th.textContent === "Year") as HTMLElement;
		fireEvent.click(year);
		fireEvent.click(year);
		expect(rowTitles(container)).toEqual([
			"Abbey Road",
			"Sgt. Pepper",
			"Rubber Soul",
		]);
		expect(year.classList.contains("selected")).toBe(true);
		expect(
			container
				.querySelector(".classicyTableContainer thead th[aria-sort]")
				?.getAttribute("aria-sort"),
		).toBe("descending");
	});

	it("puts its titles in its own head when it scrolls itself", () => {
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				headerPlacement="aboveList"
			/>,
		);
		const root = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		expect(root.classList.contains("classicyScrollArea")).toBe(true);
		const head = root.querySelector(":scope > .classicyScrollAreaHead");
		expect(head).not.toBeNull();
		expect(
			(head as Element).querySelector(".classicyTableDetachedHeader th"),
		).not.toBeNull();
	});

	it("keeps its titles in the list with no scroll area to put them above", () => {
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				scrollable={false}
				headerPlacement="aboveList"
			/>,
		);
		expect(container.querySelector(".classicyTableDetachedHeader")).toBeNull();
		expect(
			container
				.querySelector("thead")
				?.classList.contains("classicyTableHeaderHidden"),
		).toBe(false);
	});
});

describe("ClassicyTable's detached titles' style", () => {
	it("takes the container's custom properties, not its other styles", () => {
		const { container } = render(
			<ClassicyScrollArea>
				<ClassicyTable
					columns={columns}
					rows={albums}
					getRowId={(a) => a.id}
					scrollable={false}
					headerPlacement="aboveList"
					style={
						{
							"--album-art-size": "16px",
							height: "40px",
						} as CSSProperties
					}
				/>
			</ClassicyScrollArea>,
		);
		const detached = container.querySelector(
			".classicyTableDetachedHeader",
		) as HTMLElement;
		expect(detached.style.getPropertyValue("--album-art-size")).toBe("16px");
		expect(
			detached.style.getPropertyValue("--classicy-table-sorted-width"),
		).not.toBe("");
		expect(detached.style.height).toBe("");
	});
});
