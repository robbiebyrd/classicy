import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_FIND_SOURCE_LABELS,
	CLASSICY_FIND_SOURCE_TIMEOUT_MS,
	type ClassicyFindResult,
	type ClassicyFindSource,
	type ClassicyFindSourceResult,
	getClassicyFindSourceLabels,
	listClassicyFindSources,
	openClassicyFindSourceResult,
	registerClassicyFindSource,
	searchClassicyFindSources,
	subscribeClassicyFindSources,
	unregisterClassicyFindSource,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const result = (name: string, open = () => {}): ClassicyFindResult => ({
	name,
	kind: "page",
	open,
});

const source = (
	id: string,
	search: ClassicyFindSource["search"],
	name = id,
): ClassicyFindSource => ({ id, name, search });

const logs: ClassicyLogEntry[] = [];
registerClassicyLogSink({
	id: "find-sources-test",
	onLog: (e) => logs.push(e),
});

afterEach(() => {
	for (const s of listClassicyFindSources()) unregisterClassicyFindSource(s.id);
	logs.length = 0;
});

describe("registerClassicyFindSource", () => {
	it("lists sources in registration order, replacing an id in its place", () => {
		const a = source("a", async () => []);
		const b = source("b", async () => []);
		registerClassicyFindSource(a);
		registerClassicyFindSource(b);
		const a2 = source("a", async () => [], "Archive");
		registerClassicyFindSource(a2);
		expect(listClassicyFindSources()).toEqual([a2, b]);
	});

	it("tells subscribers, and its unregister removes only its own registration", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyFindSources(listener);
		const first = registerClassicyFindSource(source("a", async () => []));
		registerClassicyFindSource(source("a", async () => [], "Replaced"));
		first();
		expect(listClassicyFindSources().map((s) => s.name)).toEqual(["Replaced"]);
		expect(unregisterClassicyFindSource("a")).toBe(true);
		expect(unregisterClassicyFindSource("a")).toBe(false);
		expect(listener).toHaveBeenCalledTimes(3);
		unsubscribe();
	});

	it("ignores a source without an id, a name or a search, with a warning", () => {
		registerClassicyFindSource({ id: "", name: "x", search: async () => [] });
		registerClassicyFindSource({ id: "x", name: "", search: async () => [] });
		registerClassicyFindSource({
			id: "y",
			name: "y",
		} as unknown as ClassicyFindSource);
		expect(listClassicyFindSources()).toEqual([]);
		expect(logs.filter((l) => l.level === "warn")).toHaveLength(3);
	});
});

describe("searchClassicyFindSources", () => {
	it("asks each chosen source for the words and tags what it returns", async () => {
		const search = vi.fn(async (query: string) => [result(`${query} one`)]);
		registerClassicyFindSource(source("a", search));
		registerClassicyFindSource(source("b", async () => [result("b one")]));
		registerClassicyFindSource(source("c", async () => [result("c one")]));
		const seen: [string, ClassicyFindSourceResult[]][] = [];
		const outcomes = await searchClassicyFindSources("maps", {
			sourceIds: ["a", "c"],
			signal: new AbortController().signal,
			onResults: (id, results) => seen.push([id, results]),
		});
		expect(search).toHaveBeenCalledWith("maps", {
			signal: expect.any(AbortSignal),
		});
		expect(
			seen.map(([id, r]) => [id, r.map((x) => [x.name, x.sourceId])]),
		).toEqual([
			["a", [["maps one", "a"]]],
			["c", [["c one", "c"]]],
		]);
		expect(outcomes).toEqual([
			{ sourceId: "a", status: "found", count: 1 },
			{ sourceId: "c", status: "found", count: 1 },
		]);
	});

	it("keeps a failing source from breaking the others, and logs it", async () => {
		const boom = new Error("archive offline");
		registerClassicyFindSource(
			source("throws", () => {
				throw boom;
			}),
		);
		registerClassicyFindSource(
			source("rejects", async () => Promise.reject(boom)),
		);
		registerClassicyFindSource(
			source(
				"junk",
				async () => "nope" as unknown as readonly ClassicyFindResult[],
			),
		);
		registerClassicyFindSource(
			source("good", async () => [result("Found it")]),
		);
		const onResults = vi.fn();
		const outcomes = await searchClassicyFindSources("x", {
			signal: new AbortController().signal,
			onResults,
		});
		expect(outcomes.map((o) => [o.sourceId, o.status])).toEqual([
			["throws", "failed"],
			["rejects", "failed"],
			["junk", "failed"],
			["good", "found"],
		]);
		expect(onResults).toHaveBeenCalledTimes(1);
		expect(onResults.mock.calls[0][0]).toBe("good");
		const errors = logs.filter((l) => l.level === "error");
		// One each, in whatever order they settled.
		expect(errors.map((l) => [l.subsystem, l.message]).sort()).toEqual([
			["ClassicyFindFile", 'Search source "junk" failed'],
			["ClassicyFindFile", 'Search source "rejects" failed'],
			["ClassicyFindFile", 'Search source "throws" failed'],
		]);
		expect(errors.find((l) => l.message.includes('"throws"'))?.details).toEqual(
			[{ source: "throws", error: boom }],
		);
	});

	it("drops malformed results with a warning, keeping the good ones", async () => {
		registerClassicyFindSource(
			source("a", async () => [
				result("Good"),
				{ name: "No open", kind: "page" } as unknown as ClassicyFindResult,
				{
					name: 3,
					kind: "page",
					open: () => {},
				} as unknown as ClassicyFindResult,
			]),
		);
		const onResults = vi.fn();
		await searchClassicyFindSources("x", {
			signal: new AbortController().signal,
			onResults,
		});
		expect(
			onResults.mock.calls[0][1].map((r: ClassicyFindResult) => r.name),
		).toEqual(["Good"]);
		expect(logs.filter((l) => l.level === "warn")).toHaveLength(1);
	});

	it("reports nothing from a search its signal aborted, and logs no failure", async () => {
		let release: (() => void) | undefined;
		registerClassicyFindSource(
			source(
				"slow",
				(_query, { signal }) =>
					new Promise((resolve, reject) => {
						release = () => resolve([result("too late")]);
						signal.addEventListener("abort", () =>
							reject(new DOMException("Aborted", "AbortError")),
						);
					}),
			),
		);
		registerClassicyFindSource(
			// A source that ignores the signal and answers after the abort.
			source(
				"deaf",
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve([result("ignored")]), 0);
					}),
			),
		);
		const controller = new AbortController();
		const onResults = vi.fn();
		const run = searchClassicyFindSources("x", {
			signal: controller.signal,
			onResults,
		});
		controller.abort();
		release?.();
		const outcomes = await run;
		expect(outcomes.map((o) => o.status)).toEqual(["aborted", "aborted"]);
		expect(onResults).not.toHaveBeenCalled();
		expect(logs.filter((l) => l.level === "error")).toEqual([]);
	});
});

describe("a source that never settles", () => {
	it("is given up after its time, its signal aborted, the others shown", async () => {
		vi.useFakeTimers();
		try {
			let seen: AbortSignal | undefined;
			registerClassicyFindSource({
				...source("hang", (_query, { signal }) => {
					seen = signal;
					return new Promise(() => {});
				}),
				timeoutMs: 5_000,
			});
			registerClassicyFindSource(source("good", async () => [result("Good")]));
			const onResults = vi.fn();
			const run = searchClassicyFindSources("x", {
				signal: new AbortController().signal,
				onResults,
			});
			await vi.advanceTimersByTimeAsync(4_999);
			expect(onResults).toHaveBeenCalledTimes(1);
			expect(seen?.aborted).toBe(false);
			await vi.advanceTimersByTimeAsync(1);
			const outcomes = await run;
			expect(outcomes.map((o) => [o.sourceId, o.status])).toEqual([
				["hang", "timedOut"],
				["good", "found"],
			]);
			expect(seen?.aborted).toBe(true);
			expect((seen?.reason as DOMException).name).toBe("TimeoutError");
			expect(
				logs.filter((l) => l.level === "warn").map((l) => l.message),
			).toEqual([
				'Search source "hang" did not answer within 5000 ms; its results were left out',
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("waits 30 seconds by default, and drops an answer that comes after", async () => {
		vi.useFakeTimers();
		try {
			let answer: ((r: readonly ClassicyFindResult[]) => void) | undefined;
			registerClassicyFindSource(
				source(
					"late",
					() =>
						new Promise((resolve) => {
							answer = resolve;
						}),
				),
			);
			const onResults = vi.fn();
			const run = searchClassicyFindSources("x", {
				signal: new AbortController().signal,
				onResults,
			});
			await vi.advanceTimersByTimeAsync(CLASSICY_FIND_SOURCE_TIMEOUT_MS);
			expect((await run)[0].status).toBe("timedOut");
			answer?.([result("too late")]);
			await vi.advanceTimersByTimeAsync(1);
			expect(onResults).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("the sources' labels", () => {
	it("are Sherlock's until a source brings its own, the first labeled source's then", () => {
		expect(getClassicyFindSourceLabels()).toEqual({
			tab: "Search Internet",
			sites: "Search Sites",
			site: "Site",
		});
		registerClassicyFindSource(source("plain", async () => []));
		registerClassicyFindSource(
			source("archive", async () => []),
			{
				labels: { tab: "Search Archive", sites: "Collections" },
			},
		);
		registerClassicyFindSource(
			source("other", async () => []),
			{
				labels: { tab: "Search Elsewhere" },
			},
		);
		expect(getClassicyFindSourceLabels()).toEqual({
			tab: "Search Archive",
			sites: "Collections",
			site: "Site",
		});
		unregisterClassicyFindSource("archive");
		expect(getClassicyFindSourceLabels()).toEqual({
			...CLASSICY_FIND_SOURCE_LABELS,
			tab: "Search Elsewhere",
		});
		unregisterClassicyFindSource("other");
		expect(getClassicyFindSourceLabels()).toBe(CLASSICY_FIND_SOURCE_LABELS);
	});

	it("keeps only single-line labels of 1 to 64 characters, warning for the rest", () => {
		registerClassicyFindSource(
			source("a", async () => []),
			{
				labels: { tab: "  ", sites: "two\nlines", site: "Shelf" },
			},
		);
		expect(getClassicyFindSourceLabels()).toEqual({
			...CLASSICY_FIND_SOURCE_LABELS,
			site: "Shelf",
		});
		expect(logs.filter((l) => l.level === "warn")).toHaveLength(2);
	});
});

describe("openClassicyFindSourceResult", () => {
	it("opens a result, and logs an open that throws or rejects", async () => {
		const opened = vi.fn();
		openClassicyFindSourceResult({ ...result("a", opened), sourceId: "s" });
		expect(opened).toHaveBeenCalledTimes(1);
		const boom = new Error("gone");
		openClassicyFindSourceResult({
			...result("b", () => {
				throw boom;
			}),
			sourceId: "s",
		});
		openClassicyFindSourceResult({
			name: "c",
			kind: "page",
			open: () => Promise.reject(boom),
			sourceId: "s",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(
			logs
				.filter((l) => l.level === "error")
				.map((l) => [l.message, l.details]),
		).toEqual([
			["A search result failed to open", [{ source: "s", error: boom }]],
			["A search result failed to open", [{ source: "s", error: boom }]],
		]);
	});
});

afterAll(() => unregisterClassicyLogSink("find-sources-test"));
