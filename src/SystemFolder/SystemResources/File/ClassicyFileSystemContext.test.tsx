import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	ClassicyDefaultFileSystemContext,
	useClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

type ContextValue = {
	defaultFileSystem?: Record<string, unknown>;
	mode: "merge" | "exclusive";
};

function wrapperFor(value: ContextValue) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ClassicyDefaultFileSystemContext.Provider value={value}>
				{children}
			</ClassicyDefaultFileSystemContext.Provider>
		);
	};
}

describe("useClassicyFileSystem", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("resolves to DefaultFSContent when no provider is present", () => {
		const { result } = renderHook(() =>
			useClassicyFileSystem("test-no-provider"),
		);
		expect(result.current.fs).toEqual(DefaultFSContent);
	});

	it("resolves to a merge of DefaultFSContent and the override", () => {
		const { result } = renderHook(() => useClassicyFileSystem("test-merge"), {
			wrapper: wrapperFor({
				defaultFileSystem: {
					"Macintosh HD": {
						Documents: {
							"Welcome.txt": {
								_type: ClassicyFileSystemEntryFileType.TextFile,
								_data: "hello",
							},
						},
					},
				},
				mode: "merge",
			}),
		});
		expect(
			result.current.fs["Macintosh HD"].Documents["Welcome.txt"]._data,
		).toBe("hello");
		// original default content still present alongside the merged addition
		expect(
			result.current.fs["Macintosh HD"].Documents["Read Me.txt"],
		).toBeDefined();
	});

	it("resolves to exactly the override tree in exclusive mode", () => {
		const override = {
			"My Drive": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		const { result } = renderHook(
			() => useClassicyFileSystem("test-exclusive"),
			{ wrapper: wrapperFor({ defaultFileSystem: override, mode: "exclusive" }) },
		);
		expect(result.current.fs).toEqual(override);
	});

	it("resolves to DefaultFSContent when defaultFileSystem is omitted regardless of mode", () => {
		const { result } = renderHook(
			() => useClassicyFileSystem("test-omitted"),
			{ wrapper: wrapperFor({ mode: "exclusive" }) },
		);
		expect(result.current.fs).toEqual(DefaultFSContent);
	});
});
