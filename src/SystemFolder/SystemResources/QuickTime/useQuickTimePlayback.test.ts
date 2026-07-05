import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuickTimePlayback } from "@/SystemFolder/SystemResources/QuickTime/useQuickTimePlayback";

describe("useQuickTimePlayback", () => {
	it("defaults to internal state (not playing, volume 0.5)", () => {
		const { result } = renderHook(() => useQuickTimePlayback({}));
		expect(result.current.playing).toBe(false);
		expect(result.current.volume).toBe(0.5);
		act(() => result.current.handlePlayPause());
		expect(result.current.playing).toBe(true);
	});

	it("honors autoPlay as the uncontrolled initial playing value", () => {
		const { result } = renderHook(() =>
			useQuickTimePlayback({ autoPlay: true }),
		);
		expect(result.current.playing).toBe(true);
	});

	it("mirrors controlled playing/volume and reports changes", () => {
		const onPlayingChange = vi.fn();
		const { result, rerender } = renderHook(
			({ playing }) => useQuickTimePlayback({ playing, onPlayingChange }),
			{ initialProps: { playing: false } },
		);
		act(() => result.current.handlePlayPause());
		expect(onPlayingChange).toHaveBeenCalledWith(true);
		expect(result.current.playing).toBe(false); // still prop-driven
		rerender({ playing: true });
		expect(result.current.playing).toBe(true);
	});

	it("exposes the media element through attachMediaRef and onMediaElement", () => {
		const onMediaElement = vi.fn();
		const { result } = renderHook(() =>
			useQuickTimePlayback({ onMediaElement }),
		);
		const el = document.createElement("video");
		act(() => result.current.attachMediaRef(el));
		expect(result.current.playerRef.current).toBe(el);
		expect(onMediaElement).toHaveBeenCalledWith(el);
		act(() => result.current.attachMediaRef(null));
		expect(onMediaElement).toHaveBeenCalledWith(null);
	});

	it("keeps attachMediaRef referentially stable across renders", () => {
		const { result, rerender } = renderHook(
			({ cb }) => useQuickTimePlayback({ onMediaElement: cb }),
			{ initialProps: { cb: () => {} } },
		);
		const first = result.current.attachMediaRef;
		rerender({ cb: () => {} }); // new inline callback identity, as TV passes
		expect(result.current.attachMediaRef).toBe(first);
	});

	it("seeks the attached element", () => {
		const { result } = renderHook(() => useQuickTimePlayback({}));
		const el = document.createElement("video");
		Object.defineProperty(el, "duration", { get: () => 100 });
		act(() => result.current.attachMediaRef(el));
		act(() => result.current.seekTo(42));
		expect(el.currentTime).toBe(42);
		expect(result.current.currentTime).toBe(42);
		act(() => result.current.seekToPct(0.25));
		expect(el.currentTime).toBe(25);
	});
});
