import { describe, expect, it } from "vitest";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

describe("resolveFileSystemEntrySource", () => {
	it("resolves to url when only _url is set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "https://example.com/sample.pdf",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "url",
			url: "https://example.com/sample.pdf",
		});
	});

	it("resolves to data when only _data is set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_data: "H4sIAAAAAAAA",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "data",
			data: "H4sIAAAAAAAA",
		});
	});

	it("prefers _data over _url when both are set", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "https://example.com/sample.pdf",
			_data: "H4sIAAAAAAAA",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({
			kind: "data",
			data: "H4sIAAAAAAAA",
		});
	});

	it("resolves to none when neither is set", () => {
		const entry = { _type: ClassicyFileSystemEntryFileType.Pdf };
		expect(resolveFileSystemEntrySource(entry)).toEqual({ kind: "none" });
	});

	it("resolves to none when entry is undefined", () => {
		expect(resolveFileSystemEntrySource(undefined)).toEqual({ kind: "none" });
	});

	it("resolves to none when _url/_data are empty strings", () => {
		const entry = {
			_type: ClassicyFileSystemEntryFileType.Pdf,
			_url: "",
			_data: "",
		};
		expect(resolveFileSystemEntrySource(entry)).toEqual({ kind: "none" });
	});
});
