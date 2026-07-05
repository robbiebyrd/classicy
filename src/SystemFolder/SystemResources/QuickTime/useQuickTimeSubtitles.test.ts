import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuickTimeSubtitles } from "@/SystemFolder/SystemResources/QuickTime/useQuickTimeSubtitles";

const VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello <i>world</i>

2
00:00:05.000 --> 00:00:08.000
Second cue
`;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useQuickTimeSubtitles", () => {
	it("fetches, parses, and reports the active cue for a given time", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(VTT),
			}),
		);
		const { result } = renderHook(() =>
			useQuickTimeSubtitles("https://example.com/subs.vtt"),
		);
		await waitFor(() =>
			expect(result.current.activeCueText(2)).toContain("Hello"),
		);
		expect(result.current.activeCueText(4.5)).toBeNull();
		expect(result.current.activeCueText(6)).toBe("Second cue");
	});

	it("returns null for all times when no URL is given", () => {
		const { result } = renderHook(() => useQuickTimeSubtitles(undefined));
		expect(result.current.activeCueText(2)).toBeNull();
	});

	it("does not fetch non-HTTP URLs", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		renderHook(() => useQuickTimeSubtitles("not-a-url"));
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
