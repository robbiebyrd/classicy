import { type CSSProperties, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import {
	ClassicyTable,
	type ClassicyTableColumn,
	type ClassicyTableSelectionApi,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

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

	// The focus item (Windows' LVIS_FOCUSED, the Mac list's cursor): one row
	// always carries `focused`, the first until a key or click moves the
	// cursor, so a package can ring it under the list's :focus without :has().
	it("marks the cursor row `focused`: the first row, then the row arrowed to or clicked", () => {
		const { container } = render(
			<ClassicyTable columns={columns} rows={albums} getRowId={(a) => a.id} />,
		);
		const focusedTitles = () =>
			[...container.querySelectorAll("tbody tr.focused td:first-child")].map(
				(td) => td.textContent,
			);
		expect(focusedTitles()).toEqual(["Rubber Soul"]);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(focusedTitles()).toEqual(["Rubber Soul"]);
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(focusedTitles()).toEqual(["Sgt. Pepper"]);
		expect(
			container
				.querySelector("tbody tr.focused")
				?.classList.contains("selected"),
		).toBe(true);
		fireEvent.click(screen.getByText("Abbey Road"));
		expect(focusedTitles()).toEqual(["Abbey Road"]);
	});

	it("with a controlled selection and no cursor yet, the first selected row is the focus row", () => {
		const { container, rerender } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="multi"
				selected={["abbey", "pepper"]}
			/>,
		);
		const focusedTitles = () =>
			[...container.querySelectorAll("tbody tr.focused td:first-child")].map(
				(td) => td.textContent,
			);
		expect(focusedTitles()).toEqual(["Sgt. Pepper"]);
		rerender(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="multi"
				selected={[]}
			/>,
		);
		expect(focusedTitles()).toEqual(["Rubber Soul"]);
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

	// Explorer's New selects the item it made, and Arrange Icons sorts the
	// details view by a column (the remaining chapters' audit's 5.40 and
	// A.4): `select` and `sortBy` beside `selectAll`.
	it("selects given rows and sorts by a column through the selection API", () => {
		const onSelectionChange = vi.fn();
		const apiRef = createRef<ClassicyTableSelectionApi>();
		const { container } = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode={"multi"}
				onSelectionChange={onSelectionChange}
				selectionApiRef={apiRef}
			/>,
		);
		act(() => apiRef.current?.select?.(["pepper"]));
		expect(onSelectionChange).toHaveBeenLastCalledWith(["pepper"]);
		expect(
			container.querySelector('tr[data-row-id="pepper"]')?.classList,
		).toContain("selected");
		act(() => apiRef.current?.sortBy?.("year", true));
		expect(rowTitles(container)).toEqual([
			"Abbey Road",
			"Sgt. Pepper",
			"Rubber Soul",
		]);
		act(() => apiRef.current?.sortBy?.("title"));
		expect(rowTitles(container)).toEqual([
			"Abbey Road",
			"Rubber Soul",
			"Sgt. Pepper",
		]);
		// A column the table does not have changes nothing.
		act(() => apiRef.current?.sortBy?.("missing"));
		expect(rowTitles(container)[0]).toBe("Abbey Road");
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

// Review r0 issue 3: the detached titles are fitted to the list by one
// ResizeObserver, built when the copy mounts or its columns change, not on
// every render (each selection change or sort).
describe("ClassicyTable's detached titles' fitting", () => {
	type Observed = { targets: Element[]; disconnected: boolean };
	let observers: Observed[] = [];
	beforeEach(() => {
		observers = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				record: Observed = { targets: [], disconnected: false };
				constructor() {
					observers.push(this.record);
				}
				observe(el: Element) {
					this.record.targets.push(el);
				}
				unobserve() {}
				disconnect() {
					this.record.disconnected = true;
				}
			},
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	// The fitting's observers: the ones watching the head (the sorted
	// column's measure watches the list alone).
	const listObservers = (container: HTMLElement) => {
		const head = container.querySelector(".classicyScrollAreaHead");
		return observers.filter((o) => head && o.targets.includes(head));
	};

	it("keeps one observer across renders, and re-observes when the columns change", () => {
		const view = (cols: ClassicyTableColumn<Album>[]) => (
			<ClassicyScrollArea>
				<ClassicyTable
					columns={cols}
					rows={albums}
					getRowId={(a) => a.id}
					scrollable={false}
					headerPlacement="aboveList"
				/>
			</ClassicyScrollArea>
		);
		const { container, rerender } = render(view(columns));
		const first = listObservers(container);
		expect(first).toHaveLength(1);
		const cell = container.querySelector("tbody td") as HTMLElement;
		fireEvent.click(cell);
		const sorter = container.querySelector(
			".classicyTableDetachedHeader th",
		) as HTMLElement;
		fireEvent.click(sorter);
		expect(listObservers(container)).toEqual(first);
		expect(first[0].disconnected).toBe(false);
		// A new column's header cell is observed too.
		rerender(
			view([
				...columns,
				{ id: "decade", title: "Decade", accessor: (a) => a.year - 5 },
			]),
		);
		expect(first[0].disconnected).toBe(true);
		const live = listObservers(container).filter((o) => !o.disconnected);
		expect(live).toHaveLength(1);
		expect(live[0].targets.filter((el) => el.tagName === "TH")).toHaveLength(3);
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

// WIG Ch.6 "Activating and Deactivating Windows" (p.81); Ch.13 "Highlighting"
// (p.318): the list says whether its window is the active one (the audit's
// 6.4 / 13.8), as ClassicyScrollArea does, so a package can draw an inactive
// window's selection apart (Windows 98's ButtonFace).
describe("ClassicyTable — inactive", () => {
	const container = () =>
		document.querySelector(".classicyTableContainer") as HTMLElement;
	const table = (scrollable: boolean) => (
		<ClassicyTable
			columns={columns}
			rows={albums}
			getRowId={(a) => a.id}
			scrollable={scrollable}
			className="host"
		/>
	);

	for (const scrollable of [false, true])
		it(`carries inactive in a window that is not the active one (scrollable ${scrollable}), once`, () => {
			render(
				<ClassicyWindowActiveContext.Provider value={false}>
					{table(scrollable)}
				</ClassicyWindowActiveContext.Provider>,
			);
			expect(container()).toHaveClass("inactive");
			expect(
				container()
					.className.split(" ")
					.filter((c) => c === "inactive"),
			).toHaveLength(1);
		});

	for (const scrollable of [false, true])
		it(`does not in the active window, or outside any window (scrollable ${scrollable})`, () => {
			const { unmount } = render(
				<ClassicyWindowActiveContext.Provider value={true}>
					{table(scrollable)}
				</ClassicyWindowActiveContext.Provider>,
			);
			expect(container()).not.toHaveClass("inactive");
			unmount();
			render(table(scrollable));
			expect(container()).not.toHaveClass("inactive");
		});

	it("leaves the unscrolled container's classes as they were when active", () => {
		render(table(false));
		expect(container().className).toBe("classicyTableContainer host");
	});
});

// `sortGroup` keeps groups together through a sort (the file browser's list
// groups folders first under `layout.fileList.foldersFirst`, as Windows
// Explorer does), and a descending sort reverses the whole order, as
// Explorer negates a compare that puts folders first.
describe("ClassicyTable — sortGroup", () => {
	type Item = { id: string; name: string; folder: boolean; items?: Item[] };
	const items: Item[] = [
		{ id: "b", name: "banana", folder: false },
		{
			id: "Z",
			name: "zeta",
			folder: true,
			items: [
				{ id: "y", name: "yam", folder: false },
				{ id: "A", name: "inner", folder: true },
			],
		},
		{ id: "a", name: "apple", folder: false },
		{ id: "M", name: "mid", folder: true },
	];
	const itemColumns: ClassicyTableColumn<Item>[] = [
		{ id: "name", title: "Name", accessor: (i) => i.name },
	];
	const names = (container: HTMLElement) =>
		[...container.querySelectorAll("tbody tr td:first-child")].map(
			(td) => td.textContent,
		);

	it("sorts folders and files together without it", () => {
		const { container } = render(
			<ClassicyTable
				columns={itemColumns}
				rows={items}
				getRowId={(i) => i.id}
				defaultSort={{ columnId: "name" }}
			/>,
		);
		expect(names(container)).toEqual(["apple", "banana", "mid", "zeta"]);
	});

	it("puts the lower group first ascending and last descending, at every level", () => {
		const { container } = render(
			<ClassicyTable
				columns={itemColumns}
				rows={items}
				getRowId={(i) => i.id}
				getSubRows={(i) => i.items}
				expanded={["Z"]}
				defaultSort={{ columnId: "name" }}
				sortGroup={(i) => (i.folder ? 0 : 1)}
			/>,
		);
		expect(names(container)).toEqual([
			"mid",
			"zeta",
			"inner",
			"yam",
			"apple",
			"banana",
		]);
		fireEvent.click(screen.getByText("Name").closest("th") as HTMLElement);
		expect(names(container)).toEqual([
			"banana",
			"apple",
			"zeta",
			"yam",
			"inner",
			"mid",
		]);
	});

	it("walks the keyboard and Shift ranges in the grouped order", () => {
		const { container } = render(
			<ClassicyTable
				columns={itemColumns}
				rows={items}
				getRowId={(i) => i.id}
				defaultSort={{ columnId: "name" }}
				selectionMode={"multi"}
				sortGroup={(i) => (i.folder ? 0 : 1)}
			/>,
		);
		const row = (name: string) =>
			screen.getByText(name).closest("tr") as HTMLElement;
		fireEvent.click(row("zeta"));
		fireEvent.click(row("banana"), { shiftKey: true });
		expect(
			[...container.querySelectorAll("tbody tr.selected")].map((r) =>
				r.getAttribute("data-row-id"),
			),
		).toEqual(["Z", "a", "b"]);
	});
});

// Under the Windows 98 layout: button 2 selects an unselected row before its
// menu (`selection.secondaryButton` "select"; WIG Ch.5 "Selection with the
// Mouse", pp.37-38; App. A Table A.1, p.349), only button 1 resizes a
// column (`mouse` "windows"; Ch.4 "Mouse Actions", pp.24-25), and Escape
// takes a resize back (`input.escapeCancels`; Ch.4 "Shortcut Keys", p.27).
// Without a package the default layout declares none of it.
describe("ClassicyTable — the mouse under the Windows layout", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-table",
			name: "Windows table",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-table-default",
				package: "windows-table",
			},
			layout: windows98.layout as never,
		});
	const row = (container: HTMLElement, id: string) =>
		container.querySelector(`tr[data-row-id="${id}"]`) as HTMLElement;
	const selectedIds = (container: HTMLElement) =>
		[...container.querySelectorAll("tr.classicyTableRow.selected")].map((r) =>
			r.getAttribute("data-row-id"),
		);
	const renderTable = (onSelectionChange = vi.fn()) => {
		const view = render(
			<ClassicyTable
				columns={columns}
				rows={albums}
				getRowId={(a) => a.id}
				selectionMode="multi"
				onSelectionChange={onSelectionChange}
			/>,
		);
		const header = view.container.querySelector("th") as HTMLElement;
		const resizer = header.querySelector(".resizer") as HTMLElement;
		return { ...view, header, resizer, onSelectionChange };
	};
	const pressEscape = () =>
		act(() => {
			document.body.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Escape",
					bubbles: true,
					cancelable: true,
				}),
			);
		});

	it("selects an unselected row at a button-2 press, before its menu, under the Windows layout", () => {
		useWindowsLayout();
		const { container, onSelectionChange } = renderTable();
		const heard: (string | null)[][] = [];
		// What a contextmenu handler above the table sees: the new selection.
		container.addEventListener("contextmenu", () =>
			heard.push(selectedIds(container)),
		);
		fireEvent.mouseDown(row(container, "pepper"), { button: 2 });
		expect(onSelectionChange).toHaveBeenLastCalledWith(["pepper"]);
		fireEvent.contextMenu(row(container, "pepper"), { button: 2 });
		expect(heard).toEqual([["pepper"]]);
	});

	it("keeps a selection a button-2 press lands inside, under the Windows layout", () => {
		useWindowsLayout();
		const { container, onSelectionChange } = renderTable();
		fireEvent.click(row(container, "rubber"));
		fireEvent.click(row(container, "abbey"), { metaKey: true });
		expect(selectedIds(container)).toEqual(["rubber", "abbey"]);
		onSelectionChange.mockClear();
		fireEvent.mouseDown(row(container, "abbey"), { button: 2 });
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(selectedIds(container)).toEqual(["rubber", "abbey"]);
	});

	it("leaves the selection to clicks without the key", () => {
		const { container, onSelectionChange } = renderTable();
		fireEvent.mouseDown(row(container, "pepper"), { button: 2 });
		fireEvent.contextMenu(row(container, "pepper"), { button: 2 });
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(selectedIds(container)).toEqual([]);
	});

	it("resizes a column with button 1 alone under the Windows layout", () => {
		useWindowsLayout();
		const { container, header, resizer } = renderTable();
		for (const button of [1, 2]) {
			fireEvent.mouseDown(resizer, { button, clientX: 100 });
			fireEvent.mouseMove(document, { clientX: 150 });
			fireEvent.mouseUp(document, { clientX: 150 });
			expect(header.style.width).toBe("150px");
		}
		fireEvent.mouseDown(resizer, { button: 0, clientX: 100 });
		expect(container.querySelector(".isResizing")).not.toBeNull();
		fireEvent.mouseMove(document, { clientX: 150 });
		fireEvent.mouseUp(document, { clientX: 150 });
		expect(header.style.width).toBe("200px");
	});

	it("resizes a column with any button without the key", () => {
		const { header, resizer } = renderTable();
		fireEvent.mouseDown(resizer, { button: 1, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 130 });
		fireEvent.mouseUp(document, { clientX: 130 });
		expect(header.style.width).toBe("180px");
	});

	it("puts the column back and ends the resize on Escape under the Windows layout", () => {
		useWindowsLayout();
		const { container, header, resizer } = renderTable();
		// A first resize the second one starts from.
		fireEvent.mouseDown(resizer, { button: 0, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 120 });
		fireEvent.mouseUp(document, { clientX: 120 });
		expect(header.style.width).toBe("170px");
		fireEvent.mouseDown(resizer, { button: 0, clientX: 120 });
		fireEvent.mouseMove(document, { clientX: 200 });
		expect(header.style.width).toBe("250px");
		pressEscape();
		expect(header.style.width).toBe("170px");
		expect(container.querySelector(".isResizing")).toBeNull();
		// The pointer moving on and the release that follows change nothing.
		fireEvent.mouseMove(document, { clientX: 260 });
		fireEvent.mouseUp(document, { clientX: 260 });
		expect(header.style.width).toBe("170px");
	});

	it("leaves Escape alone mid-resize without the key", () => {
		const { container, header, resizer } = renderTable();
		fireEvent.mouseDown(resizer, { button: 0, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		pressEscape();
		expect(header.style.width).toBe("200px");
		expect(container.querySelector(".isResizing")).not.toBeNull();
		fireEvent.mouseUp(document, { clientX: 150 });
	});
});

// Under the Windows 98 layout a row is selected at the button-1 press
// (`selection.selectOn` "press", the audit's 5.5 / A.2; WIG Ch.5 "Selection
// with the Mouse", pp.37-38; comctl32's LISTVIEW_LButtonDown), a press
// dragged across rows that do not drag selects them (`selection.dragRange`,
// 5.3; pp.37-39), and Control with Shift keeps the other selections while a
// double-click opens the whole selection (`selection.modifiers` "windows",
// 5.9 / A.9; p.39; App. A Tables A.2 and A.3). The default layout declares
// none of it: the tests above select at the click.
describe("ClassicyTable — selection by the mouse under the Windows layout", () => {
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		// biome-ignore lint/suspicious/noExplicitAny: jsdom has no elementFromPoint of its own
		delete (document as any).elementFromPoint;
	});
	const useLayout = (selection: Record<string, unknown>) =>
		registerClassicyAppearancePackage({
			id: "windows-table-selection",
			name: "Windows table selection",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-table-selection-default",
				package: "windows-table-selection",
			},
			layout: { ...windows98.layout, selection } as never,
		});
	const useWindowsLayout = () => useLayout(windows98.layout.selection);
	const tracks: Album[] = [
		...albums,
		{ id: "help", title: "Help!", year: 1965 },
		{ id: "revolver", title: "Revolver", year: 1966 },
	];
	const row = (container: HTMLElement, id: string) =>
		container.querySelector(`tr[data-row-id="${id}"]`) as HTMLElement;
	const selectedIds = (container: HTMLElement) =>
		[...container.querySelectorAll("tr.classicyTableRow.selected")].map((r) =>
			r.getAttribute("data-row-id"),
		);
	const renderTable = (
		props: Partial<Parameters<typeof ClassicyTable<Album>>[0]> = {},
	) => {
		const onSelectionChange = vi.fn();
		const view = render(
			<ClassicyTable
				columns={columns}
				rows={tracks}
				getRowId={(a) => a.id}
				selectionMode="multi"
				onSelectionChange={onSelectionChange}
				{...props}
			/>,
		);
		return { ...view, onSelectionChange };
	};
	const press = (
		el: HTMLElement,
		init: Partial<MouseEventInit & { detail: number }> = {},
	) => fireEvent.mouseDown(el, { button: 0, detail: 1, ...init });
	// Lays the rows (unsorted: rubber, pepper, abbey, help, revolver) out 20
	// px apart from y 100 in a 60-px viewport, and answers the hit test by y.
	const layOut = (container: HTMLElement) => {
		const rows = [...container.querySelectorAll<HTMLElement>("tbody tr")];
		const viewport = container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		const box = (top: number, height: number) =>
			({
				top,
				bottom: top + height,
				left: 0,
				right: 300,
				width: 300,
				height,
				x: 0,
				y: top,
				toJSON: () => ({}),
			}) as DOMRect;
		viewport.getBoundingClientRect = () => box(100, 60);
		rows.forEach((r, i) => {
			r.getBoundingClientRect = () => box(100 + i * 20, 20);
		});
		document.elementFromPoint = vi.fn(
			(_x: number, y: number) =>
				rows.find((_, i) => y >= 100 + i * 20 && y < 120 + i * 20) ?? null,
		);
	};
	const moveTo = (index: number) =>
		fireEvent.mouseMove(document, { clientX: 50, clientY: 110 + index * 20 });

	it("selects an unselected row at the press, its click adding nothing", () => {
		useWindowsLayout();
		const { container, onSelectionChange } = renderTable();
		press(row(container, "pepper"));
		expect(onSelectionChange).toHaveBeenLastCalledWith(["pepper"]);
		expect(selectedIds(container)).toEqual(["pepper"]);
		fireEvent.click(row(container, "pepper"), { detail: 1 });
		expect(onSelectionChange).toHaveBeenCalledTimes(1);
	});

	it("selects at the click alone without the key", () => {
		const { container, onSelectionChange } = renderTable();
		press(row(container, "pepper"));
		expect(onSelectionChange).not.toHaveBeenCalled();
		fireEvent.click(row(container, "pepper"), { detail: 1 });
		expect(onSelectionChange).toHaveBeenLastCalledWith(["pepper"]);
	});

	it("leaves a selected row's selection to its click, which resets it to that row", () => {
		useWindowsLayout();
		const { container, onSelectionChange } = renderTable();
		fireEvent.click(row(container, "rubber"));
		fireEvent.click(row(container, "abbey"), { shiftKey: true });
		onSelectionChange.mockClear();
		press(row(container, "pepper"));
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(selectedIds(container)).toEqual(["rubber", "pepper", "abbey"]);
		fireEvent.click(row(container, "pepper"), { detail: 1 });
		expect(selectedIds(container)).toEqual(["pepper"]);
	});

	it("applies a modified press at once, even on a selected row", () => {
		useWindowsLayout();
		const { container } = renderTable();
		fireEvent.click(row(container, "rubber"));
		press(row(container, "abbey"), { ctrlKey: true });
		expect(selectedIds(container)).toEqual(["rubber", "abbey"]);
		fireEvent.click(row(container, "abbey"), { detail: 1, ctrlKey: true });
		expect(selectedIds(container)).toEqual(["rubber", "abbey"]);
		press(row(container, "rubber"), { metaKey: true });
		expect(selectedIds(container)).toEqual(["abbey"]);
		press(row(container, "help"), { shiftKey: true });
		// The anchor is rubber, the Control press's row.
		expect(selectedIds(container)).toEqual([
			"rubber",
			"pepper",
			"abbey",
			"help",
		]);
	});

	it("sets the anchor's range to the anchor's state at a Control-Shift click, keeping the rest", () => {
		useLayout({ modifiers: "windows" });
		const { container } = renderTable();
		fireEvent.click(row(container, "rubber"));
		fireEvent.click(row(container, "abbey"), { metaKey: true });
		fireEvent.click(row(container, "revolver"), {
			ctrlKey: true,
			shiftKey: true,
		});
		expect(selectedIds(container)).toEqual([
			"rubber",
			"abbey",
			"help",
			"revolver",
		]);
		// An unselected anchor takes its range out.
		fireEvent.click(row(container, "help"), { metaKey: true });
		fireEvent.click(row(container, "abbey"), { metaKey: true, shiftKey: true });
		expect(selectedIds(container)).toEqual(["rubber", "revolver"]);
	});

	it("lets Shift win at a Control-Shift click without the key", () => {
		const { container } = renderTable();
		fireEvent.click(row(container, "rubber"));
		fireEvent.click(row(container, "abbey"), { metaKey: true });
		fireEvent.click(row(container, "revolver"), {
			ctrlKey: true,
			shiftKey: true,
		});
		expect(selectedIds(container)).toEqual(["abbey", "help", "revolver"]);
	});

	it("opens the selection a double-click's clicks leave, its second press changing nothing", () => {
		useWindowsLayout();
		const onActivateSelection = vi.fn();
		const onActivateRow = vi.fn();
		const { container } = renderTable({ onActivateSelection, onActivateRow });
		fireEvent.click(row(container, "rubber"));
		const abbey = row(container, "abbey");
		press(abbey, { shiftKey: true });
		fireEvent.click(abbey, { detail: 1, shiftKey: true });
		press(abbey, { detail: 2, shiftKey: true });
		fireEvent.click(abbey, { detail: 2, shiftKey: true });
		fireEvent.doubleClick(abbey, { shiftKey: true });
		expect(onActivateSelection).toHaveBeenCalledWith([
			"rubber",
			"pepper",
			"abbey",
		]);
		expect(onActivateRow).not.toHaveBeenCalled();
	});

	it("opens the double-clicked row alone without the key, without onActivateSelection, or with no selection mode", () => {
		const onActivateSelection = vi.fn();
		const onActivateRow = vi.fn();
		const first = renderTable({ onActivateSelection, onActivateRow });
		fireEvent.click(row(first.container, "rubber"));
		fireEvent.click(row(first.container, "abbey"), { metaKey: true });
		fireEvent.doubleClick(row(first.container, "abbey"));
		expect(onActivateRow).toHaveBeenLastCalledWith("abbey", tracks[2]);
		first.unmount();
		useWindowsLayout();
		const second = renderTable({ onActivateRow });
		fireEvent.doubleClick(row(second.container, "pepper"));
		expect(onActivateRow).toHaveBeenLastCalledWith("pepper", tracks[1]);
		second.unmount();
		const third = renderTable({
			onActivateSelection,
			onActivateRow,
			selectionMode: "none",
		});
		fireEvent.doubleClick(row(third.container, "help"));
		expect(onActivateRow).toHaveBeenLastCalledWith("help", tracks[3]);
		expect(onActivateSelection).not.toHaveBeenCalled();
	});

	it("selects the rows a press drags across, and scrolls toward a pointer below the list", () => {
		useWindowsLayout();
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", () => {});
		try {
			const { container, onSelectionChange } = renderTable();
			layOut(container);
			press(row(container, "pepper"), { clientY: 130 });
			moveTo(2);
			expect(selectedIds(container)).toEqual(["pepper", "abbey"]);
			expect(onSelectionChange).toHaveBeenLastCalledWith(["pepper", "abbey"]);
			moveTo(0);
			expect(selectedIds(container)).toEqual(["rubber", "pepper"]);
			// Below the viewport: its last shown row, then a frame's scroll.
			fireEvent.mouseMove(document, { clientX: 50, clientY: 300 });
			expect(selectedIds(container)).toEqual(["pepper", "abbey"]);
			expect(frames.length).toBeGreaterThan(0);
			fireEvent.mouseUp(document);
			moveTo(4);
			expect(selectedIds(container)).toEqual(["pepper", "abbey"]);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("keeps the selection a Control drag found", () => {
		useWindowsLayout();
		const { container } = renderTable();
		layOut(container);
		fireEvent.click(row(container, "revolver"));
		press(row(container, "rubber"), { ctrlKey: true, clientY: 110 });
		moveTo(1);
		expect(selectedIds(container)).toEqual(["rubber", "pepper", "revolver"]);
		fireEvent.mouseUp(document);
	});

	it("selects no range across rows that drag, without the key, or with a press selection alone", () => {
		useWindowsLayout();
		const dragging = renderTable({ rowsDrag: true });
		layOut(dragging.container);
		press(row(dragging.container, "rubber"), { clientY: 110 });
		moveTo(2);
		fireEvent.mouseUp(document);
		expect(selectedIds(dragging.container)).toEqual(["rubber"]);
		dragging.unmount();
		resetClassicyAppearancePackagesForTests();
		useLayout({ selectOn: "press" });
		const pressOnly = renderTable();
		layOut(pressOnly.container);
		press(row(pressOnly.container, "rubber"), { clientY: 110 });
		moveTo(2);
		fireEvent.mouseUp(document);
		expect(selectedIds(pressOnly.container)).toEqual(["rubber"]);
		pressOnly.unmount();
		resetClassicyAppearancePackagesForTests();
		const plain = renderTable();
		layOut(plain.container);
		press(row(plain.container, "rubber"), { clientY: 110 });
		moveTo(2);
		fireEvent.mouseUp(document);
		expect(selectedIds(plain.container)).toEqual([]);
	});
});

// Under the Windows 98 layout Page Up and Page Down move the cursor a
// screen, selecting as the arrows do (`selection.pageKeys` "move", the
// audit's 5.2 / B.3; WIG Ch.5 Table 5.1, pp.35-36; comctl32's
// LISTVIEW_KeyDown), Space is the Select key, Control (⌘, Option) with a
// navigation key moves the cursor alone and Shift+F8 toggles Add mode
// (`selection.keyboard` "windows", 5.16 / 5.18; pp.43-44), and the tree
// rows expand and collapse on the bare Right and Left Arrows (`tree.keys`
// "windows", B.3). Without the keys (the tests above, Platinum, System 7)
// the scroll area takes the page keys and Space, and the selection
// follows the cursor.
describe("ClassicyTable — the keyboard under the Windows layout", () => {
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
	});
	const useLayout = (
		selection: Record<string, unknown>,
		tree?: Record<string, unknown>,
	) =>
		registerClassicyAppearancePackage({
			id: "windows-table-keys",
			name: "Windows table keys",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-table-keys-default",
				package: "windows-table-keys",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				selection,
				...(tree ? { tree } : {}),
			},
		});
	type Item = { id: string; name: string };
	const items: Item[] = Array.from({ length: 10 }, (_, i) => ({
		id: `i${i}`,
		name: `${String.fromCharCode(65 + i)} item`,
	}));
	const cols: ClassicyTableColumn<Item>[] = [
		{ id: "name", title: "Name", accessor: (n) => n.name },
	];
	const renderTable = (
		props: Partial<Parameters<typeof ClassicyTable<Item>>[0]> = {},
	) => {
		const view = render(
			<ClassicyTable
				columns={cols}
				rows={items}
				getRowId={(n) => n.id}
				selectionMode="multi"
				{...props}
			/>,
		);
		const box = view.container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		return { ...view, box };
	};
	const row = (container: HTMLElement, i: number) =>
		container.querySelector(`tr[data-row-id="i${i}"]`) as HTMLElement;
	const chosen = (container: HTMLElement) =>
		[...container.querySelectorAll("tr.classicyTableRow.selected")].map((r) =>
			r.getAttribute("data-row-id"),
		);
	const cursor = (container: HTMLElement) =>
		container
			.querySelector("tr.classicyTableRow.focused")
			?.getAttribute("data-row-id");
	const key = (box: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
		!fireEvent.keyDown(box, { key: k, ...init });
	const rect = (top: number, height: number) =>
		({
			top,
			bottom: top + height,
			left: 0,
			right: 300,
			width: 300,
			height,
			x: 0,
			y: top,
			toJSON: () => ({}),
		}) as DOMRect;
	// Rows 20 px tall from y 100 in an 80-px viewport (four rows show),
	// scrolled `by` rows; the column titles' bottom at `head`.
	const layOut = (container: HTMLElement, by = 0, head = 0) => {
		const viewport = container.querySelector(
			".classicyScrollAreaViewport",
		) as HTMLElement;
		viewport.getBoundingClientRect = () => rect(100, 80);
		Object.defineProperty(viewport, "clientHeight", {
			value: 80,
			configurable: true,
		});
		for (let i = 0; i < items.length; i++) {
			row(container, i).getBoundingClientRect = () =>
				rect(100 + (i - by) * 20, 20);
		}
		const thead = container.querySelector("thead") as HTMLElement;
		thead.getBoundingClientRect = () => rect(head - 20, 20);
	};

	it("selects the last row shown on Page Down, then a page further, Page Up back", () => {
		useLayout({ pageKeys: "move" });
		const { container, box } = renderTable({ selectionMode: "single" });
		layOut(container);
		fireEvent.click(row(container, 1));
		expect(key(box, "PageDown")).toBe(true);
		expect(chosen(container)).toEqual(["i3"]);
		key(box, "PageDown");
		expect(chosen(container)).toEqual(["i6"]);
		layOut(container, 3);
		key(box, "PageUp");
		expect(chosen(container)).toEqual(["i3"]);
		key(box, "PageUp");
		expect(chosen(container)).toEqual(["i0"]);
	});

	it("extends with Shift, and counts the rows under pinned titles as hidden", () => {
		useLayout({ pageKeys: "move" });
		const { container, box } = renderTable();
		// The titles pinned over the viewport's top 20 px hide row 0.
		layOut(container, 0, 120);
		fireEvent.click(row(container, 2));
		key(box, "PageUp", { shiftKey: true });
		expect(chosen(container)).toEqual(["i1", "i2"]);
		// From the first row shown, a page (three rows) less one back.
		key(box, "PageUp", { shiftKey: true });
		expect(chosen(container)).toEqual(["i0", "i1", "i2"]);
	});

	it("leaves the page keys to the scroll area without the key", () => {
		const { container, box } = renderTable();
		layOut(container);
		fireEvent.click(row(container, 1));
		key(box, "PageDown");
		key(box, "PageUp");
		expect(chosen(container)).toEqual(["i1"]);
		expect(cursor(container)).toBe("i1");
	});

	it("moves the cursor alone with Control, ⌘ or Option, and selects with Space", () => {
		useLayout({ keyboard: "windows" });
		const onSelectionChange = vi.fn();
		const { container, box } = renderTable({ onSelectionChange });
		fireEvent.click(row(container, 0));
		onSelectionChange.mockClear();
		expect(key(box, "ArrowDown", { ctrlKey: true })).toBe(true);
		expect(cursor(container)).toBe("i1");
		key(box, "ArrowDown", { altKey: true });
		key(box, "End", { metaKey: true });
		expect(cursor(container)).toBe("i9");
		key(box, "Home", { ctrlKey: true });
		key(box, "ArrowDown", { ctrlKey: true });
		expect(cursor(container)).toBe("i1");
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(chosen(container)).toEqual(["i0"]);
		// Control+Space toggles the cursor row in; Space alone selects it
		// alone, and its default is taken (no page scroll).
		expect(key(box, " ", { ctrlKey: true })).toBe(true);
		expect(chosen(container)).toEqual(["i0", "i1"]);
		key(box, "ArrowDown", { ctrlKey: true });
		key(box, "ArrowDown", { ctrlKey: true });
		expect(key(box, " ")).toBe(true);
		expect(chosen(container)).toEqual(["i3"]);
		// Control+Space takes it out again.
		key(box, " ", { metaKey: true });
		expect(chosen(container)).toEqual([]);
		// Shift with a navigation key extends from the anchor.
		key(box, " ");
		key(box, "ArrowUp", { shiftKey: true, ctrlKey: true });
		expect(chosen(container)).toEqual(["i2", "i3"]);
	});

	it("selects with Space alone in a single table, where Control still selects", () => {
		useLayout({ keyboard: "windows" });
		const { container, box } = renderTable({ selectionMode: "single" });
		fireEvent.click(row(container, 0));
		key(box, "ArrowDown", { ctrlKey: true });
		expect(chosen(container)).toEqual(["i1"]);
		key(box, " ", { ctrlKey: true });
		expect(chosen(container)).toEqual(["i1"]);
	});

	it("leaves Space alone, and Control selecting, without the key", () => {
		const { container, box } = renderTable();
		fireEvent.click(row(container, 0));
		key(box, "ArrowDown", { ctrlKey: true });
		expect(chosen(container)).toEqual(["i1"]);
		key(box, "ArrowDown", { altKey: true });
		key(box, " ", { ctrlKey: true });
		key(box, " ");
		expect(chosen(container)).toEqual(["i2"]);
	});

	it("takes Add mode on Shift+F8: the keys move alone, Space toggles, Shift extends keeping the rest", () => {
		useLayout({ keyboard: "windows" });
		const { container, box } = renderTable();
		fireEvent.click(row(container, 0));
		expect(box).not.toHaveAttribute("data-classicy-selection-mode");
		expect(key(box, "F8", { shiftKey: true })).toBe(true);
		expect(box).toHaveAttribute("data-classicy-selection-mode", "add");
		key(box, "ArrowDown");
		key(box, "ArrowDown");
		expect(cursor(container)).toBe("i2");
		expect(chosen(container)).toEqual(["i0"]);
		key(box, "f");
		expect(cursor(container)).toBe("i5");
		expect(chosen(container)).toEqual(["i0"]);
		key(box, " ");
		expect(chosen(container)).toEqual(["i0", "i5"]);
		key(box, "ArrowDown");
		key(box, "ArrowDown", { shiftKey: true });
		expect(chosen(container)).toEqual(["i0", "i5", "i6", "i7"]);
		key(box, " ");
		expect(chosen(container)).toEqual(["i0", "i5", "i6"]);
		key(box, "F8", { shiftKey: true });
		expect(box).not.toHaveAttribute("data-classicy-selection-mode");
		expect(chosen(container)).toEqual(["i0", "i5", "i6"]);
		key(box, "ArrowUp");
		expect(chosen(container)).toEqual(["i6"]);
	});

	it("takes no Add mode without the key, or in a single table", () => {
		const { container, box, unmount } = renderTable();
		fireEvent.click(row(container, 0));
		expect(key(box, "F8", { shiftKey: true })).toBe(false);
		expect(box).not.toHaveAttribute("data-classicy-selection-mode");
		unmount();
		useLayout({ keyboard: "windows" });
		const single = renderTable({ selectionMode: "single" });
		fireEvent.click(row(single.container, 0));
		expect(key(single.box, "F8", { shiftKey: true })).toBe(false);
		expect(single.box).not.toHaveAttribute("data-classicy-selection-mode");
	});

	it("publishes Add mode on an unscrolled table's container too", () => {
		useLayout({ keyboard: "windows" });
		const { box } = renderTable({ scrollable: false });
		key(box, "F8", { shiftKey: true });
		expect(box).toHaveAttribute("data-classicy-selection-mode", "add");
	});

	type Node = { id: string; name: string; children?: Node[] };
	const tree: Node[] = [
		{
			id: "docs",
			name: "Documents",
			children: [{ id: "q1", name: "q1.pdf" }],
		},
		{ id: "top", name: "top.pdf" },
	];
	const treeCols: ClassicyTableColumn<Node>[] = [
		{ id: "name", title: "Name", accessor: (n) => n.name },
	];

	it("expands and collapses a tree row on the bare arrows under Windows' tree keys", () => {
		useLayout({}, { keys: "windows" });
		const { container } = render(
			<ClassicyTable
				columns={treeCols}
				rows={tree}
				getRowId={(n) => n.id}
				getSubRows={(n) => n.children}
			/>,
		);
		const box = container.querySelector(
			".classicyTableContainer",
		) as HTMLElement;
		fireEvent.click(screen.getByText("Documents"));
		// The chord gives way to the bare arrows.
		expect(key(box, "ArrowRight", { metaKey: true })).toBe(false);
		expect(screen.queryByText("q1.pdf")).toBeNull();
		expect(key(box, "ArrowRight")).toBe(true);
		expect(screen.getByText("q1.pdf")).toBeInTheDocument();
		key(box, "ArrowLeft", { ctrlKey: true });
		expect(screen.getByText("q1.pdf")).toBeInTheDocument();
		expect(key(box, "ArrowLeft", { shiftKey: true })).toBe(true);
		expect(screen.queryByText("q1.pdf")).toBeNull();
		// A row that cannot expand leaves the key to the scroll area.
		fireEvent.click(screen.getByText("top.pdf"));
		key(box, "ArrowRight");
		expect(screen.queryByText("q1.pdf")).toBeNull();
	});
});
