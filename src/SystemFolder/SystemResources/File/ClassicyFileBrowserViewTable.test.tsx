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

	it("renders the disclosure triangle inside the Filename column, not its own column", async () => {
		const cfs = makeNestedFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);

		const { container } = render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
			/>,
		);

		await screen.findByText("Reports");
		// Exactly three columns: Filename, File Type, Size — no leading
		// disclosure-only column.
		expect(container.querySelectorAll("thead th")).toHaveLength(3);
		// The folder's triangle shares the Filename cell with its label.
		const nameCell = screen.getByText("Reports").closest("td") as HTMLElement;
		expect(nameCell).toContainElement(screen.getByRole("button"));
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

describe("ClassicyFileBrowserViewTable opening disclosed rows", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Documents/Reports/q1.pdf — q1.pdf is only reachable by disclosing Reports,
	// so its real path is two levels below the table's `path` prop.
	const makeNestedFs = () =>
		new ClassicyFileSystem("test-table-open-nested", {
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

	const discloseReports = async (
		user: ReturnType<typeof userEvent.setup>,
		fileOnClickFunc: (path: string) => void,
		dirOnClickFunc: (path: string) => void,
	) => {
		const cfs = makeNestedFs();
		vi.spyOn(cfs, "size").mockResolvedValue(100);
		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
				fileOnClickFunc={fileOnClickFunc}
				dirOnClickFunc={dirOnClickFunc}
			/>,
		);
		await screen.findByText("Reports");
		await user.click(screen.getByRole("button"));
		await screen.findByText("q1.pdf");
	};

	it("double-clicking a top-level row opens its full path", async () => {
		const user = userEvent.setup();
		const fileOnClickFunc = vi.fn();
		const dirOnClickFunc = vi.fn();
		await discloseReports(user, fileOnClickFunc, dirOnClickFunc);

		await user.dblClick(screen.getByText("top.pdf"));

		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:top.pdf");
	});

	it("double-clicking a disclosed child opens its real path, not one rebuilt from the table root", async () => {
		const user = userEvent.setup();
		const fileOnClickFunc = vi.fn();
		const dirOnClickFunc = vi.fn();
		await discloseReports(user, fileOnClickFunc, dirOnClickFunc);

		await user.dblClick(screen.getByText("q1.pdf"));

		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:Reports:q1.pdf");
	});

	it("opens a disclosed child's real path on Enter too", async () => {
		const user = userEvent.setup();
		const fileOnClickFunc = vi.fn();
		const dirOnClickFunc = vi.fn();
		await discloseReports(user, fileOnClickFunc, dirOnClickFunc);

		await user.click(screen.getByText("q1.pdf"));
		await user.keyboard("{Enter}");

		expect(fileOnClickFunc).toHaveBeenCalledWith("Documents:Reports:q1.pdf");
	});
});

const OPTIONS_BASE = {
	useRelativeDate: true,
	calculateFolderSizes: false,
	iconSize: "medium" as const,
	columns: {
		modified: false,
		created: false,
		size: false,
		kind: false,
		label: false,
		comments: false,
		version: false,
	},
};

const makeFs = (key: string) =>
	new ClassicyFileSystem(key, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"a.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
				_size: 2048,
				// Seeded as an ISO string on purpose: the tree round-trips through
				// JSON, so this is the shape the component actually receives.
				_modifiedOn: "2001-09-11T12:46:00.000Z",
				_label: "Hot",
				_comments: "A note",
				_version: "1.0.1",
			},
		},
	});

describe("ClassicyFileBrowserViewTable configurable columns", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows only the columns the options enable", () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-cols-modified-only")}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					columns: { ...OPTIONS_BASE.columns, modified: true },
				}}
				now={new Date(2001, 8, 11, 9, 3)}
			/>,
		);
		// Filename is unconditional; everything else follows the flags.
		expect(screen.getByText("Filename")).toBeInTheDocument();
		expect(screen.getByText("Date Modified")).toBeInTheDocument();
		expect(screen.queryByText("Size")).not.toBeInTheDocument();
		expect(screen.queryByText("Kind")).not.toBeInTheDocument();
		expect(screen.queryByText("Label")).not.toBeInTheDocument();
	});

	it("renders Kind rather than the old File Type header", () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-cols-kind")}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					columns: { ...OPTIONS_BASE.columns, kind: true },
				}}
			/>,
		);
		expect(screen.getByText("Kind")).toBeInTheDocument();
		expect(screen.queryByText("File Type")).not.toBeInTheDocument();
	});

	it("renders the label, comments, and version columns when enabled", () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-cols-extras")}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					columns: {
						...OPTIONS_BASE.columns,
						label: true,
						comments: true,
						version: true,
					},
				}}
			/>,
		);
		expect(screen.getByText("Hot")).toBeInTheDocument();
		expect(screen.getByText("A note")).toBeInTheDocument();
		expect(screen.getByText("1.0.1")).toBeInTheDocument();
	});

	it("does not compute folder sizes when the option is off", async () => {
		const cfs = makeFs("test-sizes-off");
		const sizeSpy = vi.spyOn(cfs, "size");
		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					calculateFolderSizes: false,
					columns: { ...OPTIONS_BASE.columns, size: true },
				}}
			/>,
		);
		await waitFor(() =>
			expect(screen.getByText("Filename")).toBeInTheDocument(),
		);
		expect(sizeSpy).not.toHaveBeenCalled();
		// And the size cell must not sit on a permanent "Calculating…".
		expect(screen.queryByText("Calculating…")).not.toBeInTheDocument();
	});

	it("computes folder sizes when the option is on", async () => {
		const cfs = new ClassicyFileSystem("test-sizes-on", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				Nested: { _type: ClassicyFileSystemEntryFileType.Directory },
			},
		});
		const sizeSpy = vi.spyOn(cfs, "size").mockResolvedValue(4096);
		render(
			<ClassicyFileBrowserViewTable
				fs={cfs}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					calculateFolderSizes: true,
					columns: { ...OPTIONS_BASE.columns, size: true },
				}}
			/>,
		);
		await waitFor(() => expect(sizeSpy).toHaveBeenCalled());
	});

	it("formats the modified column against the supplied in-world now", async () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-relative-date")}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					useRelativeDate: true,
					columns: { ...OPTIONS_BASE.columns, modified: true },
				}}
				// Same in-world day as the fixture's _modifiedOn, in UTC.
				now={new Date("2001-09-11T14:03:00.000Z")}
			/>,
		);
		// The fixture seeds an ISO STRING, so this also proves the component
		// revives it rather than calling Date methods on a string.
		expect(
			await screen.findByText(/^Today, \d{1,2}:\d{2} (AM|PM)$/),
		).toBeInTheDocument();
	});

	it("renders an absolute date when relative dates are off", async () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-absolute-date")}
				path="Documents"
				appId="Finder.app"
				listViewOptions={{
					...OPTIONS_BASE,
					useRelativeDate: false,
					columns: { ...OPTIONS_BASE.columns, modified: true },
				}}
				now={new Date("2001-09-11T14:03:00.000Z")}
			/>,
		);
		expect(await screen.findByText(/Sep 11, 2001/)).toBeInTheDocument();
	});

	it("keeps today's three columns when no options are passed", () => {
		render(
			<ClassicyFileBrowserViewTable
				fs={makeFs("test-cols-default")}
				path="Documents"
				appId="Finder.app"
			/>,
		);
		expect(screen.getByText("Filename")).toBeInTheDocument();
		expect(screen.getByText("Size")).toBeInTheDocument();
		expect(screen.getByText("Kind")).toBeInTheDocument();
		expect(screen.queryByText("Date Modified")).not.toBeInTheDocument();
	});
});
