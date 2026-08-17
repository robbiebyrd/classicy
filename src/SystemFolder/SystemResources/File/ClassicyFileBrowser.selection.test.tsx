import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

afterEach(cleanup);

const makeFs = (key: string) =>
	new ClassicyFileSystem(key, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"apple.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
			},
			"mango.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/m.pdf",
			},
			"zebra.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/z.pdf",
			},
		},
	});

// ClassicyTable's own tests prove `selectAll` works when the handle is wired
// directly to it. These prove the handle actually survives the trip
// ClassicyFileBrowser → ClassicyFileBrowserViewTable → ClassicyTable — the
// second half of the chain Finder's Edit → Select All depends on. Without
// them, dropping the prop anywhere along the way leaves every suite green
// while Select All silently does nothing.
describe("ClassicyFileBrowser selection handle", () => {
	const renderList = (key: string) => {
		const apiRef = createRef<ClassicyTableSelectionApi>();
		const { container } = render(
			<ClassicyFileBrowser
				fs={makeFs(key)}
				path="Documents"
				appId="Finder.app"
				display="list"
				selectionApiRef={apiRef}
			/>,
		);
		return { apiRef, container };
	};

	const rows = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("tr.classicyTableRow"));

	const selectedNames = (container: HTMLElement) =>
		Array.from(container.querySelectorAll("tr.classicyTableRowSelected")).map(
			(row) => row.getAttribute("data-row-id"),
		);

	it("hands the caller a working handle in list view", async () => {
		const { apiRef, container } = renderList("test-browser-selectall");
		await waitFor(() => expect(rows(container)).toHaveLength(3));
		expect(apiRef.current).not.toBeNull();

		expect(selectedNames(container)).toEqual([]);
		act(() => apiRef.current?.selectAll());

		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
			"Documents:zebra.pdf",
		]);
	});

	it("selects rows through the browser's own multi-select semantics", async () => {
		const { container } = renderList("test-browser-multiselect");
		await waitFor(() => expect(rows(container)).toHaveLength(3));
		const [first, , third] = rows(container);

		act(() => {
			first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		expect(selectedNames(container)).toEqual(["Documents:apple.pdf"]);

		// Shift extends from the anchor over the current visual order.
		act(() => {
			third.dispatchEvent(
				new MouseEvent("click", { bubbles: true, shiftKey: true }),
			);
		});
		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
			"Documents:zebra.pdf",
		]);

		// Command-click toggles a single row out of the selection.
		act(() => {
			third.dispatchEvent(
				new MouseEvent("click", { bubbles: true, metaKey: true }),
			);
		});
		expect(selectedNames(container)).toEqual([
			"Documents:apple.pdf",
			"Documents:mango.pdf",
		]);
	});

	it("leaves the handle unset in the icons view, where the command is disabled", async () => {
		const apiRef = createRef<ClassicyTableSelectionApi>();
		render(
			<ClassicyFileBrowser
				fs={makeFs("test-browser-icons")}
				path="Documents"
				appId="Finder.app"
				display="icons"
				selectionApiRef={apiRef}
			/>,
		);
		await waitFor(() => expect(apiRef.current).toBeNull());
	});
});
