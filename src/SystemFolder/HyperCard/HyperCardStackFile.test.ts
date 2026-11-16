// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeStack } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSave";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";
import { readHyperCardStackFileText } from "@/SystemFolder/HyperCard/HyperCardStackFile";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { compressToBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

const stack = {
	name: "Mine",
	cards: [{ id: "c1", parts: [] }],
} as unknown as HCStack;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("readHyperCardStackFileText", () => {
	it("reads a stack saved by the Save Stack dialog (raw JSON in _data)", async () => {
		// What ClassicyFileDialogVolume does with the HyperCard format's data().
		const fs = new ClassicyFileSystem("hc-stack-file-test", {});
		fs.writeFile("Macintosh HD:Mine.stack", serializeStack(stack), {
			_type: ClassicyFileSystemEntryFileType.Stack,
		});

		const text = await readHyperCardStackFileText(
			fs.resolve("Macintosh HD:Mine.stack"),
		);

		expect(JSON.parse(text)).toEqual(stack);
	});

	it("reads a seeded stack stored gzip + base64url in _data", async () => {
		const data = await compressToBase64(
			new TextEncoder().encode(serializeStack(stack)),
		);

		const text = await readHyperCardStackFileText({
			_type: ClassicyFileSystemEntryFileType.Stack,
			_data: data,
		});

		expect(JSON.parse(text)).toEqual(stack);
	});

	it("fetches a stack that lives at a _url", async () => {
		const fetchMock = vi.fn(async () => new Response(serializeStack(stack)));
		vi.stubGlobal("fetch", fetchMock);

		const text = await readHyperCardStackFileText({
			_type: ClassicyFileSystemEntryFileType.Stack,
			_url: "https://example.com/mine.stack.json",
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/mine.stack.json",
		);
		expect(JSON.parse(text)).toEqual(stack);
	});

	it("rejects on an HTTP error", async () => {
		vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));

		await expect(
			readHyperCardStackFileText({
				_type: ClassicyFileSystemEntryFileType.Stack,
				_url: "https://example.com/gone.stack.json",
			}),
		).rejects.toThrow("HTTP 404");
	});

	it("rejects an entry with no content", async () => {
		await expect(readHyperCardStackFileText(undefined)).rejects.toThrow(
			"the file has no content",
		);
	});
});
