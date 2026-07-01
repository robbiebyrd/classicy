import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

describe("useFinderFolderSize", () => {
	it("starts undefined, then resolves to the folder's computed size", async () => {
		const cfs = new ClassicyFileSystem("test-hook-folder-size", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.txt": {
					_type: ClassicyFileSystemEntryFileType.File,
					_data: "hello",
				},
			},
		});

		const { result } = renderHook(() =>
			useFinderFolderSize("Documents", cfs),
		);

		expect(result.current).toBeUndefined();

		await waitFor(() => expect(result.current).toBe(5));
	});

	it("re-resolves to the new folder's size when path changes", async () => {
		const cfs = new ClassicyFileSystem("test-hook-folder-size-path-change", {
			_type: "directory",
			Documents: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"a.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hello" },
			},
			Downloads: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"b.txt": { _type: ClassicyFileSystemEntryFileType.File, _data: "hi" },
			},
		});

		const { result, rerender } = renderHook(
			({ path }) => useFinderFolderSize(path, cfs),
			{ initialProps: { path: "Documents" } },
		);
		await waitFor(() => expect(result.current).toBe(5));

		rerender({ path: "Downloads" });
		await waitFor(() => expect(result.current).toBe(2));
	});
});
