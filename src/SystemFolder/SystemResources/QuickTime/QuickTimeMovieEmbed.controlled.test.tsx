import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";

afterEach(cleanup);

describe("QuickTimeVideoEmbed — controlled mode & ref exposure", () => {
	it("renders no control chrome when hideControls is set", async () => {
		const { container } = render(
			<QuickTimeVideoEmbed
				appId="TestApp.app"
				name="Test"
				url="test.mp4"
				type="video"
				hideControls
				playing={true}
				volume={0.7}
				muted={true}
			/>,
		);
		await waitFor(() =>
			expect(container.querySelector("video")).not.toBeNull(),
		);
		expect(
			container.querySelector(".quickTimePlayerVideoControlsHolder"),
		).toBeNull();
	});

	it("calls onMediaElement with the underlying media element", async () => {
		const onMediaElement = vi.fn();
		const { container } = render(
			<QuickTimeVideoEmbed
				appId="TestApp.app"
				name="Test"
				url="test.mp4"
				type="video"
				hideControls
				onMediaElement={onMediaElement}
			/>,
		);
		await waitFor(() =>
			expect(container.querySelector("video")).not.toBeNull(),
		);
		await waitFor(() => expect(onMediaElement).toHaveBeenCalled());
		expect(onMediaElement.mock.calls[0][0]).not.toBeNull();
	});

	it("does not register keyboard shortcuts when hideControls is set", async () => {
		const onPlayingChange = vi.fn();
		const { container } = render(
			<QuickTimeVideoEmbed
				appId="TestApp.app"
				name="Test"
				url="test.mp4"
				type="video"
				hideControls
				playing={false}
				onPlayingChange={onPlayingChange}
			/>,
		);
		await waitFor(() =>
			expect(container.querySelector("video")).not.toBeNull(),
		);
		window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
		expect(onPlayingChange).not.toHaveBeenCalled();
	});

	it("renders caption cues when captionsEnabled is controlled on", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: () =>
					Promise.resolve(
						"WEBVTT\n\n1\n00:00:00.000 --> 01:00:00.000\nAlways on\n",
					),
			}),
		);
		const { container } = render(
			<QuickTimeVideoEmbed
				appId="TestApp.app"
				name="Test"
				url="test.mp4"
				type="video"
				hideControls
				captionsEnabled={true}
				subtitlesUrl="https://example.com/subs.vtt"
			/>,
		);
		const video = await waitFor(() => {
			const el = container.querySelector("video");
			if (!el) throw new Error("video element not yet rendered");
			return el as HTMLVideoElement;
		});
		Object.defineProperty(video, "currentTime", {
			configurable: true,
			get: () => 5,
		});
		video.dispatchEvent(new Event("timeupdate"));
		await waitFor(() =>
			expect(
				container.querySelector(".quickTimePlayerCaptions")?.textContent,
			).toBe("Always on"),
		);
		vi.unstubAllGlobals();
	});
});
