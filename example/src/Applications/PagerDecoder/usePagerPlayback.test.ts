import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PagerRecord } from "./pagerUtils";
import { usePagerPlayback } from "./usePagerPlayback";

vi.mock("./pagerUtils", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./pagerUtils")>();
	return { ...actual, getCurrentEasternHMS: vi.fn(() => "03:00:00") };
});

import { getCurrentEasternHMS } from "./pagerUtils";

function makeRecord(message: string, timeKey = "03:00:00"): PagerRecord {
	return {
		timestamp: `2001-09-11 ${timeKey}`,
		provider: "Metrocall",
		recipient_id: "0001234",
		mode: "ALPHA",
		message,
	};
}

function makeIndex(
	entries: [string, PagerRecord[]][],
): Map<string, PagerRecord[]> {
	return new Map(entries);
}

describe("usePagerPlayback", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(getCurrentEasternHMS).mockReturnValue("03:00:00");
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns empty state when index is null", () => {
		const { result } = renderHook(() => usePagerPlayback(null));
		expect(result.current.lines).toHaveLength(0);
		expect(result.current.streamingText).toBe("");
		expect(result.current.streamingMeta).toBeNull();
	});

	it("enqueues messages that match the current second on clock tick", () => {
		const record = makeRecord("Hello world");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			// 1000ms clock tick enqueues message; +30ms stream tick picks it up
			vi.advanceTimersByTime(1030);
		});

		expect(result.current.streamingMeta).not.toBeNull();
		expect(result.current.streamingMeta?.provider).toBe("Metrocall");
	});

	it("streams message characters one at a time at 30ms intervals", () => {
		const record = makeRecord("Hello");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1030); // clock tick + first stream tick → "H"
		});
		expect(result.current.streamingText).toBe("H");

		act(() => {
			vi.advanceTimersByTime(30); // second char → "He"
		});
		expect(result.current.streamingText).toBe("He");
	});

	it("moves completed line to lines[] and clears streamingMeta", () => {
		const record = makeRecord("Hi");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1000); // clock tick
			vi.advanceTimersByTime(30 * 2 + 30); // stream both chars + one more tick
		});

		expect(result.current.lines).toHaveLength(1);
		expect(result.current.lines[0].text).toBe("Hi");
		expect(result.current.streamingMeta).toBeNull();
		expect(result.current.streamingText).toBe("");
	});

	it("streams queued messages in order", () => {
		const r1 = makeRecord("Msg1");
		const r2 = makeRecord("Msg2");
		const index = makeIndex([["03:00:00", [r1, r2]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			// clock tick + stream all of r1 (4 chars × 30ms) + move to lines
			vi.advanceTimersByTime(1000 + 30 * 4 + 30);
		});

		// r1 complete, r2 started
		expect(result.current.lines).toHaveLength(1);
		expect(result.current.lines[0].text).toBe("Msg1");
		expect(result.current.streamingMeta).not.toBeNull();
	});

	it("does not enqueue the same second twice", () => {
		const record = makeRecord("Hello");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1000); // first tick at 03:00:00
		});
		act(() => {
			vi.advanceTimersByTime(1000); // second tick still at 03:00:00 (same mock)
		});

		// Only one message should be streaming/queued — not duplicated
		act(() => {
			vi.advanceTimersByTime(30 * 5 + 30 * 5 + 100); // stream it all + extra
		});

		expect(result.current.lines).toHaveLength(1);
	});
});
