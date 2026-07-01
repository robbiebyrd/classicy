import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
			return entry._path?.endsWith("big.pdf") ? 9000 : 100;
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
