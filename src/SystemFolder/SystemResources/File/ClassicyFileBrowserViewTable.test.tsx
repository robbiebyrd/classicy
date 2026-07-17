import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe("ClassicyFileBrowserViewTable size column", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows Calculating… then the resolved size once size() resolves", async () => {
		const cfs = new ClassicyFileSystem("test-table-calculating", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/a.pdf",
				},
			},
		});
		const { promise, resolve } = deferred<number>();
		vi.spyOn(cfs, "size").mockReturnValue(promise);

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		expect(await screen.findByText("Calculating…")).toBeInTheDocument();

		resolve(2048);

		await waitFor(() => expect(screen.getByText("2 KB")).toBeInTheDocument());
	});

	it("shows — when size() resolves to -1", async () => {
		const cfs = new ClassicyFileSystem("test-table-unknown", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/a.pdf",
				},
			},
		});
		vi.spyOn(cfs, "size").mockResolvedValue(-1);

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
	});

	it("sorts rows by resolved size once all sizes settle", async () => {
		const cfs = new ClassicyFileSystem("test-table-sort", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"big.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/big.pdf",
				},
				"small.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/small.pdf",
				},
			},
		});
		vi.spyOn(cfs, "size").mockImplementation(async (entryOrPath) => {
			const entry =
				typeof entryOrPath === "string"
					? cfs.resolve(entryOrPath)
					: entryOrPath;
			return entry._url?.endsWith("big.pdf") ? 9000 : 100;
		});

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await waitFor(() =>
			expect(screen.getByText("8.79 KB")).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByText("Size"));

		const rows = screen.getAllByRole("row").slice(1); // drop header row
		expect(rows[0]).toHaveTextContent("small.pdf");
		expect(rows[1]).toHaveTextContent("big.pdf");
	});
});

describe("ClassicyFileBrowserViewTable disclosure tree", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeNestedFs = () =>
		new ClassicyFileSystem("test-table-disclosure", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				Reports: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"q1.pdf": {
						_type: ClassicyFileSystemEntryFileType.Pdf,
						_url: "https://example.com/q1.pdf",
					},
				},
				"top.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/top.pdf",
				},
			},
		});

	it("shows a disclosure triangle for folders and none for files", async () => {
		const cfs = makeNestedFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("Reports");
		// Only the single folder (Reports) at this level owns a triangle.
		expect(screen.getAllByRole("button")).toHaveLength(1);
	});

	it("expands a folder inline when its triangle is clicked and collapses again", async () => {
		const user = userEvent.setup();
		const cfs = makeNestedFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("Reports");
		expect(screen.queryByText("q1.pdf")).not.toBeInTheDocument();

		const triangle = screen.getByRole("button");
		await user.click(triangle);

		expect(await screen.findByText("q1.pdf")).toBeInTheDocument();

		await user.click(screen.getByRole("button"));
		await waitFor(() =>
			expect(screen.queryByText("q1.pdf")).not.toBeInTheDocument(),
		);
	});

	it("indents disclosed children by --window-control-size per level", async () => {
		const user = userEvent.setup();
		const cfs = makeNestedFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("Reports");
		await user.click(screen.getByRole("button"));

		const childRow = (await screen.findByText("q1.pdf")).closest(
			".classicyFileBrowserViewTableRowContainer",
		) as HTMLElement;
		expect(childRow.style.paddingLeft).toBe(
			"calc(var(--window-control-size) * 1)",
		);
	});
});

describe("ClassicyFileBrowserViewTable keyboard navigation", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const makeFs = () =>
		new ClassicyFileSystem("test-table-keyboard", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"apple.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/apple.pdf",
				},
				"banana.pdf": {
					_type: ClassicyFileSystemEntryFileType.Pdf,
					_url: "https://example.com/banana.pdf",
				},
			},
		});

	const dataRow = (name: string) =>
		screen
			.getByText(name)
			.closest("tr.classicyFileBrowserViewTableRow") as HTMLElement;

	it("moves the selection with the Down arrow key", async () => {
		const user = userEvent.setup();
		const cfs = makeFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("apple.pdf");
		const listbox = container.querySelector(
			".classicyFileBrowserViewTableContainer",
		) as HTMLElement;
		listbox.focus();
		await user.keyboard("{ArrowDown}");
		expect(dataRow("apple.pdf")).toHaveClass(
			"classicyFileBrowserViewTableRowSelected",
		);

		await user.keyboard("{ArrowDown}");
		expect(dataRow("banana.pdf")).toHaveClass(
			"classicyFileBrowserViewTableRowSelected",
		);
	});

	it("selects a row by typing its leading characters", async () => {
		const user = userEvent.setup();
		const cfs = makeFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("banana.pdf");
		const listbox = container.querySelector(
			".classicyFileBrowserViewTableContainer",
		) as HTMLElement;
		listbox.focus();
		await user.keyboard("b");
		expect(dataRow("banana.pdf")).toHaveClass(
			"classicyFileBrowserViewTableRowSelected",
		);
	});

	it("opens the selected item on Enter", async () => {
		const user = userEvent.setup();
		const cfs = makeFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);
		const fileOnClickFunc = vi.fn();

		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
				fileOnClickFunc={fileOnClickFunc}
			/>,
		);

		await screen.findByText("apple.pdf");
		const listbox = container.querySelector(
			".classicyFileBrowserViewTableContainer",
		) as HTMLElement;
		listbox.focus();
		await user.keyboard("{ArrowDown}{Enter}");

		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:apple.pdf");
	});
});
