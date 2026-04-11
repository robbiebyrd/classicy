import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePagerIndex } from "./usePagerIndex";

function makeStreamResponse(text: string, contentLength?: number): Response {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(text);
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(bytes);
			controller.close();
		},
	});
	return {
		ok: true,
		body: stream,
		headers: {
			get: (name: string) =>
				name === "Content-Length"
					? String(contentLength ?? bytes.byteLength)
					: null,
		},
	} as unknown as Response;
}

const ALPHA_LINE = JSON.stringify({
	timestamp: "2001-09-11 14:23:07",
	provider: "Metrocall",
	recipient_id: "1060278",
	id_type: "capcode",
	channel: "B",
	mode: "ALPHA",
	message: "Server is UP",
});

const NON_ALPHA_LINE = JSON.stringify({
	timestamp: "2001-09-11 14:23:08",
	provider: "Arch",
	recipient_id: "0001234",
	id_type: "capcode",
	channel: "A",
	mode: "ST NUM",
	message: "9145551234",
});

describe("usePagerIndex", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("initially returns null index, progress 0, no error", () => {
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		expect(result.current.index).toBeNull();
		expect(result.current.progress).toBe(0);
		expect(result.current.error).toBeNull();
	});

	it("populates the Map after fetch completes", async () => {
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.index).not.toBeNull());
		expect(result.current.index?.get("14:23:07")).toHaveLength(1);
		expect(result.current.index?.get("14:23:07")?.[0].message).toBe("Server is UP");
	});

	it("groups multiple records at the same second", async () => {
		const line2 = JSON.stringify({
			timestamp: "2001-09-11 14:23:07",
			provider: "Arch",
			recipient_id: "0000001",
			id_type: "capcode",
			channel: "A",
			mode: "ALPHA",
			message: "Alert: disk full",
		});
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n" + line2 + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.index).not.toBeNull());
		expect(result.current.index?.get("14:23:07")).toHaveLength(2);
	});

	it("excludes non-ALPHA records from the index", async () => {
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n" + NON_ALPHA_LINE + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.index).not.toBeNull());
		expect(result.current.index?.get("14:23:08")).toBeUndefined();
		expect(result.current.index?.get("14:23:07")).toHaveLength(1);
	});

	it("silently skips malformed lines", async () => {
		const content = ALPHA_LINE + "\n{bad json}\n" + NON_ALPHA_LINE + "\n";
		vi.mocked(fetch).mockResolvedValue(makeStreamResponse(content));
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.index).not.toBeNull());
		expect(result.current.index?.get("14:23:07")).toHaveLength(1);
	});

	it("sets progress to 1 when done", async () => {
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.progress).toBe(1));
	});

	it("sets error when fetch fails", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.error).toBe("Network error"));
		expect(result.current.index).toBeNull();
	});

	it("populates uniqueValues after fetch completes", async () => {
		vi.mocked(fetch).mockResolvedValue(
			makeStreamResponse(ALPHA_LINE + "\n"),
		);
		const { result } = renderHook(() => usePagerIndex());
		await waitFor(() => expect(result.current.uniqueValues).not.toBeNull());
		expect(result.current.uniqueValues?.provider).toContain("Metrocall");
		expect(result.current.uniqueValues?.id_type).toContain("capcode");
		expect(result.current.uniqueValues?.channel).toContain("B");
	});

	it("fetches from /pager/output.jsonl", async () => {
		vi.mocked(fetch).mockResolvedValue(makeStreamResponse(""));
		renderHook(() => usePagerIndex());
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(
				"/pager/output.jsonl",
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			),
		);
	});
});
