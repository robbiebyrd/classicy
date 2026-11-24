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
	CLASSICY_FIND_CONTENTS_LIMIT,
	CLASSICY_FIND_LOOKUPS,
	classicyFindReadText,
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

describe("the contents criterion's bounds (fix round 2)", {
	timeout: 60_000,
}, () => {
	const fileOf = (data: string): ClassicyFileSystemEntry => ({
		_type: T.TextFile,
		_data: data,
	});

	it("reads data that only begins like compressed data as text", async () => {
		const note = fileOf("H4sI is how a gzip stream begins in base64");
		expect(await classicyFindReadText(note)).toBe(
			"H4sI is how a gzip stream begins in base64",
		);
		// Valid base64 that begins "H4sI" but is no gzip stream: text too.
		expect(await classicyFindReadText(fileOf("H4sIabcd"))).toBe("H4sIabcd");
		const fs = new ClassicyFileSystem(`test-find-h4si-${++counter}`, {
			"Macintosh HD": {
				_type: T.Drive,
				"Note.txt": note,
			},
		});
		const found = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("contents", "contain", "gzip stream")],
		});
		expect(found.map((r) => r.name)).toEqual(["Note.txt"]);
		const missed = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("contents", "doNotContain", "gzip stream")],
		});
		expect(missed).toEqual([]);
	});

	it("reads at most CLASSICY_FIND_CONTENTS_LIMIT of a file, compressed or not", async () => {
		expect(CLASSICY_FIND_CONTENTS_LIMIT).toBe(5 * 1024 * 1024);
		// A small limit, to see the cut: plain text and inflated text alike.
		expect(await classicyFindReadText(fileOf("abcdefgh"), undefined, 4)).toBe(
			"abcd",
		);
		const packed = await compressToBase64(new TextEncoder().encode("abcdefgh"));
		expect(await classicyFindReadText(fileOf(packed), undefined, 4)).toBe(
			"abcd",
		);
		// The real limit: a word 1 MiB in is found, one past 5 MiB is not.
		const bytes = new Uint8Array(6 * 1024 * 1024).fill(0x2e);
		bytes.set(new TextEncoder().encode("early-word"), 1024 * 1024);
		bytes.set(new TextEncoder().encode("late-word"), 6 * 1024 * 1024 - 100);
		const text = await classicyFindReadText(
			fileOf(await compressToBase64(bytes)),
		);
		expect(text?.length).toBe(CLASSICY_FIND_CONTENTS_LIMIT);
		expect(text?.includes("early-word")).toBe(true);
		expect(text?.includes("late-word")).toBe(false);
	});

	it("ends an inflation in flight as soon as the search aborts (24 files of 16 MB)", async () => {
		// The re-review's case: 24 files that inflate to 16 MB each. Every
		// inflated chunk is counted, and those made after the abort.
		const Real = globalThis.DecompressionStream;
		let aborted = false;
		let afterAbort = 0;
		const perStream: number[] = [];
		class Counting {
			readable: ReadableStream<Uint8Array>;
			writable: WritableStream<BufferSource>;
			constructor(format: CompressionFormat) {
				const real = new Real(format);
				const at = perStream.push(0) - 1;
				this.writable = real.writable;
				this.readable = real.readable.pipeThrough(
					new TransformStream<Uint8Array, Uint8Array>({
						transform(chunk, out) {
							perStream[at] += chunk.byteLength;
							if (aborted) afterAbort += chunk.byteLength;
							out.enqueue(chunk);
						},
					}),
				);
			}
		}
		vi.stubGlobal("DecompressionStream", Counting);
		const blob = await compressToBase64(new Uint8Array(16 * 1024 * 1024));
		const folder: ClassicyFileSystemEntry = { _type: T.Directory };
		for (let i = 0; i < 24; i += 1) folder[`blob ${i}.bin`] = fileOf(blob);
		const fs = new ClassicyFileSystem(`test-find-blobs-${++counter}`, {
			"Macintosh HD": { _type: T.Drive, Blobs: folder },
		});
		const controller = new AbortController();
		const search = searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("contents", "contain", "needle")],
			signal: controller.signal,
			memory: createClassicyFindLookupMemory(),
		});
		await vi.waitFor(() => expect(perStream.length).toBeGreaterThan(0));
		await new Promise((resolve) => setTimeout(resolve, 20));
		aborted = true;
		controller.abort(new DOMException("stopped", "AbortError"));
		await expect(search).rejects.toThrow("stopped");
		await new Promise((resolve) => setTimeout(resolve, 50));
		// At most four inflations ran, each cut at the limit, and the abort
		// ended them: what came after is a chunk or so each, not 16 MB.
		expect(perStream.length).toBeLessThanOrEqual(CLASSICY_FIND_LOOKUPS);
		for (const bytes of perStream) {
			expect(bytes).toBeLessThanOrEqual(
				CLASSICY_FIND_CONTENTS_LIMIT + 1024 * 1024,
			);
		}
		expect(afterAbort).toBeLessThan(CLASSICY_FIND_LOOKUPS * 1024 * 1024);
	});

	it("hands the event loop a turn between files, so an abort lands (400 files of 108 KB)", async () => {
		const body = "lorem ipsum dolor sit amet ".repeat(4000);
		const folder: ClassicyFileSystemEntry = { _type: T.Directory };
		for (let i = 0; i < 400; i += 1) folder[`doc ${i}.txt`] = fileOf(body + i);
		const fs = new ClassicyFileSystem(`test-find-docs-${++counter}`, {
			"Macintosh HD": { _type: T.Drive, Docs: folder },
		});
		let last = performance.now();
		let longest = 0;
		let ticking = true;
		const tick = () => {
			const now = performance.now();
			longest = Math.max(longest, now - last);
			last = now;
			if (ticking) setTimeout(tick, 0);
		};
		setTimeout(tick, 0);
		const done = await searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("contents", "contain", "not-there")],
			memory: createClassicyFindLookupMemory(),
		});
		ticking = false;
		expect(done).toEqual([]);
		// The read phase yields every few milliseconds (8 ms slices).
		expect(longest).toBeLessThan(250);
		const controller = new AbortController();
		const aborted = searchClassicyFileSystem(fs, {
			location: "local",
			criteria: [row("contents", "contain", "not-there")],
			signal: controller.signal,
			memory: createClassicyFindLookupMemory(),
		});
		setTimeout(
			() => controller.abort(new DOMException("stopped", "AbortError")),
			5,
		);
		await expect(aborted).rejects.toThrow("stopped");
	});
});
