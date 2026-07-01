import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResolvedMediaSource } from "@/SystemFolder/SystemResources/File/useResolvedMediaSource";

// jsdom's Blob has no .stream(), which the real compressToBase64/
// decompressFromBase64 need (base64Compression.test.ts runs those under
// a plain Node test environment instead). This hook's own contract is
// "decompress, then wrap in a Blob object URL" — mock the decompression
// step so the test doesn't depend on a real gzip round-trip.
vi.mock("@/SystemFolder/SystemResources/Utils/base64Compression", () => ({
	decompressFromBase64: vi.fn(async (data: string) =>
		new TextEncoder().encode(data),
	),
}));

describe("useResolvedMediaSource", () => {
	beforeEach(() => {
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL: vi.fn(() => "blob:mock-url"),
			revokeObjectURL: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("passes a plain url through unchanged", () => {
		const { result } = renderHook(() =>
			useResolvedMediaSource("http://example.com/a.jpg", undefined, undefined),
		);

		expect(result.current).toBe("http://example.com/a.jpg");
	});

	it("decompresses _data into a Blob object URL", async () => {
		const { result } = renderHook(() =>
			useResolvedMediaSource(undefined, "fake-compressed-data", "image/jpeg"),
		);

		expect(result.current).toBeUndefined();
		await waitFor(() => expect(result.current).toBe("blob:mock-url"));
		expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
	});

	it("prefers url over data when both are present", async () => {
		const { result } = renderHook(() =>
			useResolvedMediaSource(
				"http://example.com/a.jpg",
				"fake-compressed-data",
				"image/jpeg",
			),
		);

		expect(result.current).toBe("http://example.com/a.jpg");
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});

	it("returns undefined when neither url nor data is present", () => {
		const { result } = renderHook(() =>
			useResolvedMediaSource(undefined, undefined, undefined),
		);

		expect(result.current).toBeUndefined();
	});

	it("revokes the previous object URL when the source changes", async () => {
		const { rerender } = renderHook(
			({ data }: { data: string | undefined }) =>
				useResolvedMediaSource(undefined, data, "image/jpeg"),
			{ initialProps: { data: "fake-compressed-data" } },
		);

		await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));

		rerender({ data: undefined });

		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
	});
});
