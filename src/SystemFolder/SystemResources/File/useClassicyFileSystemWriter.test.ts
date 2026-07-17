import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/__tests__/test-utils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { useClassicyFileSystemWriter } from "@/SystemFolder/SystemResources/File/useClassicyFileSystemWriter";

const mockDispatch = vi.hoisted(() => vi.fn());

// Fixed virtual clock so timestamps are deterministic and detached from the
// wall clock (the writer stamps _createdOn/_modifiedOn from it).
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: { Manager: { DateAndTime: { dateTime: "2026-07-17T12:00:00Z" } } },
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

function makeFs(): ClassicyFileSystem {
	return new ClassicyFileSystem(
		"writer-test-key",
		{
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				Documents: {
					_type: ClassicyFileSystemEntryFileType.Directory,
					"existing.txt": {
						_type: ClassicyFileSystemEntryFileType.TextFile,
						_data: "old",
					},
				},
			},
		},
		":",
	);
}

describe("useClassicyFileSystemWriter", () => {
	beforeEach(() => {
		localStorage.clear();
		mockDispatch.mockClear();
	});

	it("creates a file with content, type, and timestamps under a folder", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		const path = result.current.createFile(
			"Macintosh HD:Documents",
			"notes.txt",
			"hello world",
			ClassicyFileSystemEntryFileType.TextFile,
		);

		expect(path).toBe("Macintosh HD:Documents:notes.txt");
		const entry = fs.resolve("Macintosh HD:Documents:notes.txt");
		expect(entry._data).toBe("hello world");
		expect(entry._type).toBe(ClassicyFileSystemEntryFileType.TextFile);
		expect(entry._mimeType).toBe("text/plain");
		expect(new Date(entry._createdOn).toISOString()).toBe(
			"2026-07-17T12:00:00.000Z",
		);
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFileSystemChanged",
		});
	});

	it("uses the markdown mime type for markdown documents", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		result.current.createFile(
			"Macintosh HD:Documents",
			"note.md",
			"# Title",
			ClassicyFileSystemEntryFileType.Markdown,
		);

		expect(fs.resolve("Macintosh HD:Documents:note.md")._mimeType).toBe(
			"text/markdown",
		);
	});

	it("rejects invalid names without mutating the tree", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		expect(
			result.current.createFile(
				"Macintosh HD:Documents",
				"",
				"x",
				ClassicyFileSystemEntryFileType.TextFile,
			),
		).toBeNull();
		expect(
			result.current.createFile(
				"Macintosh HD:Documents",
				"a:b",
				"x",
				ClassicyFileSystemEntryFileType.TextFile,
			),
		).toBeNull();
		expect(
			result.current.createFile(
				"Macintosh HD:Documents",
				"__proto__",
				"x",
				ClassicyFileSystemEntryFileType.TextFile,
			),
		).toBeNull();
		expect(
			(Object.prototype as Record<string, unknown>)._data,
		).toBeUndefined();
	});

	it("returns null when the parent folder does not exist", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		expect(
			result.current.createFile(
				"Macintosh HD:Nowhere",
				"x.txt",
				"x",
				ClassicyFileSystemEntryFileType.TextFile,
			),
		).toBeNull();
	});

	it("writes content back into an existing file and stamps _modifiedOn", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		const ok = result.current.saveToPath(
			"Macintosh HD:Documents:existing.txt",
			"updated",
		);

		expect(ok).toBe(true);
		const entry = fs.resolve("Macintosh HD:Documents:existing.txt");
		expect(entry._data).toBe("updated");
		expect(new Date(entry._modifiedOn).toISOString()).toBe(
			"2026-07-17T12:00:00.000Z",
		);
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyAppFileSystemChanged",
		});
	});

	it("returns false when saving to a path with no file", () => {
		const fs = makeFs();
		const { result } = renderHook(() => useClassicyFileSystemWriter(fs));

		expect(
			result.current.saveToPath("Macintosh HD:Documents:missing.txt", "x"),
		).toBe(false);
	});
});
