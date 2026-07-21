import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyFileSystemAdapter,
	getClassicyFileSystemAdapters,
	getClassicyFileSystemSnapshotDebounceMs,
	invokeClassicyFileSystemAdapterHook,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";

const makeAdapter = (id: string): ClassicyFileSystemAdapter => ({ id });

afterEach(() => {
	for (const adapter of getClassicyFileSystemAdapters()) {
		unregisterClassicyFileSystemAdapter(adapter.id);
	}
	vi.restoreAllMocks();
});

describe("ClassicyFileSystemAdapter registry", () => {
	it("registers and enumerates adapters in registration order", () => {
		registerClassicyFileSystemAdapter(makeAdapter("a"));
		registerClassicyFileSystemAdapter(makeAdapter("b"));
		expect(getClassicyFileSystemAdapters().map((a) => a.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("re-registering an id replaces the previous adapter", () => {
		const first = makeAdapter("dup");
		const second = makeAdapter("dup");
		registerClassicyFileSystemAdapter(first);
		registerClassicyFileSystemAdapter(second);
		const adapters = getClassicyFileSystemAdapters();
		expect(adapters).toHaveLength(1);
		expect(adapters[0]).toBe(second);
	});

	it("unregister removes the adapter", () => {
		registerClassicyFileSystemAdapter(makeAdapter("gone"));
		unregisterClassicyFileSystemAdapter("gone");
		expect(getClassicyFileSystemAdapters()).toHaveLength(0);
	});
});

describe("getClassicyFileSystemSnapshotDebounceMs", () => {
	it("defaults to 500 with no adapters", () => {
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(500);
	});

	it("returns the minimum snapshotDebounceMs across adapters", () => {
		registerClassicyFileSystemAdapter(makeAdapter("slow"), {
			snapshotDebounceMs: 2000,
		});
		registerClassicyFileSystemAdapter(makeAdapter("fast"), {
			snapshotDebounceMs: 100,
		});
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(100);
	});

	it("uses the 500 default for adapters that do not specify a debounce", () => {
		registerClassicyFileSystemAdapter(makeAdapter("plain"));
		expect(getClassicyFileSystemSnapshotDebounceMs()).toBe(500);
	});
});

describe("invokeClassicyFileSystemAdapterHook", () => {
	const entry = {
		seq: 1,
		op: "write" as const,
		path: "Macintosh HD:file.txt",
		data: "x",
		timestamp: "2026-07-20T00:00:00.000Z",
	};

	it("calls the hook with the payload", () => {
		const onChange = vi.fn();
		invokeClassicyFileSystemAdapterHook(
			{ id: "spy", onChange },
			"onChange",
			entry,
		);
		expect(onChange).toHaveBeenCalledWith(entry);
	});

	it("is a no-op when the adapter does not implement the hook", () => {
		expect(() =>
			invokeClassicyFileSystemAdapterHook({ id: "none" }, "onChange", entry),
		).not.toThrow();
	});

	it("catches synchronous throws and logs them", () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		invokeClassicyFileSystemAdapterHook(
			{
				id: "thrower",
				onChange: () => {
					throw new Error("boom");
				},
			},
			"onChange",
			entry,
		);
		expect(errorSpy).toHaveBeenCalledWith(
			'[ClassicyFileSystem] adapter "thrower" failed in onChange',
			expect.any(Error),
		);
	});

	it("catches async rejections and logs them", async () => {
		const errorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		invokeClassicyFileSystemAdapterHook(
			{
				id: "rejector",
				onChange: () => Promise.reject(new Error("async boom")),
			},
			"onChange",
			entry,
		);
		await vi.waitFor(() => {
			expect(errorSpy).toHaveBeenCalledWith(
				'[ClassicyFileSystem] adapter "rejector" failed in onChange',
				expect.any(Error),
			);
		});
	});
});
