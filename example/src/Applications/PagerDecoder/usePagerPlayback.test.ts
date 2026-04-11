import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PagerDecoderSettings } from "./PagerDecoderContext";
import { DEFAULT_PAGER_SETTINGS } from "./PagerDecoderContext";
import type { PagerRecord } from "./pagerUtils";
import { usePagerPlayback } from "./usePagerPlayback";

vi.mock("classicy", async (importOriginal) => {
	const actual = await importOriginal<typeof import("classicy")>();
	return { ...actual, useClassicyDateTime: vi.fn(() => ({ localHMS: "03:00:00" })) };
});

import { useClassicyDateTime } from "classicy";

function makeRecord(message: string, timeKey = "03:00:00", provider = "Metrocall"): PagerRecord {
	return {
		timestamp: `2001-09-11 ${timeKey}`,
		provider,
		recipient_id: "0001234",
		id_type: "capcode",
		channel: "B",
		mode: "ALPHA",
		message,
	};
}

function makeSettings(overrides: Partial<PagerDecoderSettings> = {}): PagerDecoderSettings {
	return { ...DEFAULT_PAGER_SETTINGS, ...overrides };
}

function makeIndex(
	entries: [string, PagerRecord[]][],
): Map<string, PagerRecord[]> {
	return new Map(entries);
}

describe("usePagerPlayback", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(useClassicyDateTime).mockReturnValue({ localHMS: "03:00:00" } as ReturnType<typeof useClassicyDateTime>);
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
		// 3 words — won't complete within the first 2 stream ticks
		const record = makeRecord("Hello world foo");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			// clock at t=1000 fires alongside stream tick; advance enough for both
			vi.advanceTimersByTime(1001);
		});

		expect(result.current.streamingMeta).not.toBeNull();
		expect(result.current.streamingMeta?.provider).toBe("Metrocall");
	});

	it("streams message words one at a time", () => {
		// 3-word message; clock+stream coincide at t=1000 (first word),
		// then each subsequent ms advances one word
		const record = makeRecord("Hello world foo");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1000); // clock fires; stream fires at same ms → "Hello"
		});
		expect(result.current.streamingText).toBe("Hello");

		act(() => {
			vi.advanceTimersByTime(1); // next stream tick → "Hello world"
		});
		expect(result.current.streamingText).toBe("Hello world");
	});

	it("moves completed line to lines[] and clears streamingMeta", () => {
		// 2-word message: word 1 at t=1000, word 2 (+complete) at t=1001
		const record = makeRecord("Hi there");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1001);
		});

		expect(result.current.lines).toHaveLength(1);
		expect(result.current.lines[0].text).toBe("Hi there");
		expect(result.current.streamingMeta).toBeNull();
		expect(result.current.streamingText).toBe("");
	});

	it("streams queued messages in order", () => {
		// r1 is 1 word (completes at t=1000); r2 has 3 words (starts at t=1001)
		const r1 = makeRecord("Msg1");
		const r2 = makeRecord("Msg two three");
		const index = makeIndex([["03:00:00", [r1, r2]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1001);
		});

		// r1 complete, r2 started (streaming first word)
		expect(result.current.lines).toHaveLength(1);
		expect(result.current.lines[0].text).toBe("Msg1");
		expect(result.current.streamingMeta).not.toBeNull();
	});

	it("does not enqueue the same second twice", () => {
		const record = makeRecord("Hello");
		const index = makeIndex([["03:00:00", [record]]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			vi.advanceTimersByTime(1000); // first clock tick at 03:00:00
		});
		act(() => {
			vi.advanceTimersByTime(1000); // second clock tick still at 03:00:00 (mocked)
		});
		act(() => {
			vi.advanceTimersByTime(100); // drain any remaining queue
		});

		expect(result.current.lines).toHaveLength(1);
	});

	it("respects retentionLines setting (e.g. 3)", () => {
		const records = Array.from({ length: 4 }, (_, i) => makeRecord(`Msg${i}`));
		const index = makeIndex([["03:00:00", records]]);
		const settings = makeSettings({ retentionLines: 3 });
		const { result } = renderHook(() => usePagerPlayback(index, settings));

		act(() => {
			vi.advanceTimersByTime(1000 + 4 + 10);
		});

		expect(result.current.lines.length).toBe(3);
		expect(result.current.lines[0].text).toBe("Msg1");
	});

	it("retentionLines=0 keeps all lines (unlimited)", () => {
		const records = Array.from({ length: 5 }, (_, i) => makeRecord(`Msg${i}`));
		const index = makeIndex([["03:00:00", records]]);
		const settings = makeSettings({ retentionLines: 0 });
		const { result } = renderHook(() => usePagerPlayback(index, settings));

		act(() => {
			vi.advanceTimersByTime(1000 + 5 + 10);
		});

		expect(result.current.lines.length).toBe(5);
	});

	it("filters records by provider", () => {
		const r1 = makeRecord("From Metrocall", "03:00:00", "Metrocall");
		const r2 = makeRecord("From Arch", "03:00:00", "Arch");
		const index = makeIndex([["03:00:00", [r1, r2]]]);
		const settings = makeSettings({
			filter: { ...DEFAULT_PAGER_SETTINGS.filter, provider: "Arch" },
		});
		const { result } = renderHook(() => usePagerPlayback(index, settings));

		act(() => {
			vi.advanceTimersByTime(1000 + 10);
		});

		expect(result.current.lines.length).toBe(1);
		expect(result.current.lines[0].text).toBe("From Arch");
	});

	it("caps lines at 200, dropping oldest entries", () => {
		// Use a flat index with all 201 records at the same second for simplicity
		const records = Array.from({ length: 201 }, (_, i) =>
			makeRecord(`Word${i}`),
		);
		const index = makeIndex([["03:00:00", records]]);
		const { result } = renderHook(() => usePagerPlayback(index));

		act(() => {
			// clock tick + enough stream ticks to complete all 201 messages
			vi.advanceTimersByTime(1000 + 201 + 10);
		});

		expect(result.current.lines.length).toBe(200);
		// Oldest message (Word0) should have been dropped
		expect(result.current.lines[0].text).toBe("Word1");
		expect(result.current.lines[199].text).toBe("Word200");
	});
});
