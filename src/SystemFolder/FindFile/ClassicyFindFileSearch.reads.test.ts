// @vitest-environment node
// Find File never waits on a read it does not need (story 0227-815, fix
// round 1): a search reads a size or contents only for a candidate every
// other row already matched, a few at a time, under its signal; a size it
// could not read is not asked again while Find File runs.
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
	ClassicyFindCriterion,
	ClassicyFindCriterionKey,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import { searchClassicyFileSystem } from "@/SystemFolder/FindFile/ClassicyFindFileSearch";
import {
	CLASSICY_FIND_LOOKUPS,
	createClassicyFindLookupMemory,
} from "@/SystemFolder/FindFile/ClassicyFindLookups.internal";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType as T,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { compressToBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

let counter = 0;

const row = (
	key: ClassicyFindCriterionKey,
	operator: string,
	value: string,
): ClassicyFindCriterion => ({ key, operator, value });

/** `count` files whose bytes live behind a URL, with no recorded size. */
const archive = (count: number, named = (i: number) => `photo ${i}.jpg`) => {
	const folder: ClassicyFileSystemEntry = { _type: T.Directory };
	for (let i = 0; i < count; i += 1) {
		folder[named(i)] = {
			_type: T.Image,
			_url: `https://archive.example/${i}.jpg`,
		};
	}
	return new ClassicyFileSystem(`test-find-reads-${++counter}`, {
		"Macintosh HD": { _type: T.Drive, Archive: folder },
	});
};

/** A fetch that answers HEAD after a little while, counting what it gets. */
const slowHead = (length = "1024") => {
	const seen = { calls: 0, inFlight: 0, most: 0, signals: [] as AbortSignal[] };
	const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
		seen.calls += 1;
		seen.inFlight += 1;
		seen.most = Math.max(seen.most, seen.inFlight);
		if (init?.signal) seen.signals.push(init.signal);
		try {
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(resolve, 5);
				init?.signal?.addEventListener("abort", () => {
					clearTimeout(timer);
					reject(new DOMException("aborted", "AbortError"));
				});
			});
			return {
				ok: true,
				headers: new Headers({ "Content-Length": length }),
			} as Response;
		} finally {
			seen.inFlight -= 1;
		}
	});
	vi.stubGlobal("fetch", fetchMock);
	return seen;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("searchClassicyFileSystem's reads", () => {
	it("finds 300 files behind URLs by name without a single size request", async () => {
		const seen = slowHead();
		const results = await searchClassicyFileSystem(archive(300), {
			location: "local",
			criteria: [row("name", "contains", "photo")],
		});
		expect(results).toHaveLength(300);
		expect(seen.calls).toBe(0);
		// No size: Items Found reads it as it draws the row.
		expect(results.every((r) => r.size === undefined)).toBe(true);
	});

	it("reads a size row's sizes only for the files every other row matched, a few at a time", async () => {
		const seen = slowHead("2048");
		const fs = archive(300, (i) =>
			i % 15 === 0 ? `match ${i}.jpg` : `other ${i}.jpg`,
		);
		const results = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [
				row("size", "lessThan", "128"),
				row("name", "contains", "match"),
			],
		});
		expect(results).toHaveLength(20);
		expect(seen.calls).toBe(20);
		expect(seen.most).toBeGreaterThan(1);
		expect(seen.most).toBeLessThanOrEqual(CLASSICY_FIND_LOOKUPS);
		expect(results[0].size).toBe(2048);
		// A name that matches nothing reads nothing.
		seen.calls = 0;
		await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [
				row("name", "contains", "nothing"),
				row("size", "lessThan", "128"),
			],
		});
		expect(seen.calls).toBe(0);
	});

	it("uses a recorded size without a request", async () => {
		const seen = slowHead();
		const fs = new ClassicyFileSystem(`test-find-reads-${++counter}`, {
			"Macintosh HD": {
				_type: T.Drive,
				"Big.mov": {
					_type: T.Video,
					_url: "https://x.example/big",
					_size: 900_000,
				},
				"Small.mov": {
					_type: T.Video,
					_url: "https://x.example/s",
					_size: 1000,
				},
			},
		});
		const results = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("size", "greaterThan", "128")],
		});
		expect(results.map((r) => r.name)).toEqual(["Big.mov"]);
		expect(seen.calls).toBe(0);
	});

	it("passes its signal to the requests, a few at a time, and stops when it aborts", async () => {
		// Hosts that never answer: the reads wait on the signal alone.
		const signals: AbortSignal[] = [];
		const fetchMock = vi.fn(
			(_url: unknown, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					if (init?.signal) signals.push(init.signal);
					init?.signal?.addEventListener("abort", () =>
						reject(new DOMException("aborted", "AbortError")),
					);
				}),
		);
		vi.stubGlobal("fetch", fetchMock);
		const controller = new AbortController();
		const search = searchClassicyFileSystem(archive(40), {
			location: "local",
			criteria: [row("size", "lessThan", "128")],
			signal: controller.signal,
		});
		await vi.waitFor(() =>
			expect(fetchMock).toHaveBeenCalledTimes(CLASSICY_FIND_LOOKUPS),
		);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchMock).toHaveBeenCalledTimes(CLASSICY_FIND_LOOKUPS);
		controller.abort(new DOMException("stopped", "AbortError"));
		await expect(search).rejects.toThrow("stopped");
		expect(signals).toHaveLength(CLASSICY_FIND_LOOKUPS);
		expect(signals.every((s) => s.aborted)).toBe(true);
		// No request starts after the abort.
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchMock).toHaveBeenCalledTimes(CLASSICY_FIND_LOOKUPS);
	});

	it("does not ask again, while Find File runs, for a size that could not be read", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new TypeError("CORS"));
		vi.stubGlobal("fetch", fetchMock);
		const fs = archive(10);
		const memory = createClassicyFindLookupMemory();
		const search = () =>
			searchClassicyFileSystem(fs, {
				location: "local",
				criteria: [row("size", "lessThan", "128")],
				memory,
			});
		expect(await search()).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(10);
		expect(await search()).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(10);
	});

	it("counts the items found as it finds them", async () => {
		const counts: number[] = [];
		await searchClassicyFileSystem(archive(5), {
			location: "local",
			criteria: [row("name", "contains", "photo")],
			onProgress: (n) => counts.push(n),
		});
		expect(counts).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("the contents criterion", () => {
	const contentsFs = async () =>
		new ClassicyFileSystem(`test-find-contents-${++counter}`, {
			"Macintosh HD": {
				_type: T.Drive,
				Notes: {
					_type: T.Directory,
					"Welcome.txt": {
						_type: T.TextFile,
						_data: "Welcome to Infinite Macintosh!",
					},
					"Packed.txt": {
						_type: T.TextFile,
						_data: await compressToBase64(
							new TextEncoder().encode("A stack about the Oregon Trail"),
						),
					},
					"Remote.txt": {
						_type: T.TextFile,
						_url: "https://notes.example/remote.txt",
					},
					Inner: { _type: T.Directory },
				},
			},
		});

	it("reads the data Classicy holds, compressed or not, ignoring case", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		const fs = await contentsFs();
		const names = async (operator: string, value: string) =>
			(
				await searchClassicyFileSystem(fs, {
					location: "local",
					criteria: [row("contents", operator, value)],
				})
			).map((r) => r.name);
		// 8.1 found the Stickies file by "infinite macintosh".
		expect(await names("contain", "infinite macintosh")).toEqual([
			"Welcome.txt",
		]);
		expect(await names("contain", "OREGON")).toEqual(["Packed.txt"]);
		// Folders never match, nor does a file whose bytes Classicy does not
		// hold (8.1: "do not contain" found none of the desktop's folders).
		expect(await names("doNotContain", "zzq")).toEqual([
			"Packed.txt",
			"Welcome.txt",
		]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("reads contents only for the files every other row matched", async () => {
		const fs = await contentsFs();
		const welcome = fs.resolve("Macintosh HD:Notes:Welcome.txt");
		const packed = fs.resolve("Macintosh HD:Notes:Packed.txt");
		const reads: string[] = [];
		for (const [name, entry] of [
			["Welcome.txt", welcome],
			["Packed.txt", packed],
		] as const) {
			const data = entry?._data;
			Object.defineProperty(entry, "_data", {
				configurable: true,
				enumerable: true,
				get: () => {
					reads.push(name);
					return data;
				},
			});
		}
		const results = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [
				row("name", "startsWith", "pack"),
				row("contents", "contain", "trail"),
			],
		});
		expect(results.map((r) => r.name)).toEqual(["Packed.txt"]);
		expect(reads).not.toContain("Welcome.txt");
	});
});
