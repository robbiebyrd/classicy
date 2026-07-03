import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";

function setMediaProperty(video: HTMLVideoElement, prop: "currentTime" | "duration", value: number) {
	Object.defineProperty(video, prop, {
		configurable: true,
		get: () => value,
	});
}

describe("QuickTimeVideoEmbed — playback progress", () => {
	it("updates the time label as the video plays, not just on pause/seek", async () => {
		const { container } = render(
			<QuickTimeVideoEmbed appId="TestApp.app" name="Test" url="test.mp4" type="video" />,
		);

		const video = await waitFor(() => {
			const el = container.querySelector("video");
			if (!el) throw new Error("video element not yet rendered");
			return el as HTMLVideoElement;
		});

		expect(screen.getByText("0:00:00")).toBeInTheDocument();

		setMediaProperty(video, "duration", 120);
		setMediaProperty(video, "currentTime", 42);
		video.dispatchEvent(new Event("timeupdate"));

		await waitFor(() => expect(screen.getByText("0:00:42")).toBeInTheDocument());
	});

	it("keeps the progress bar in sync with playback position", async () => {
		const { container } = render(
			<QuickTimeVideoEmbed appId="TestApp.app" name="Test" url="test.mp4" type="video" />,
		);

		const video = await waitFor(() => {
			const el = container.querySelector("video");
			if (!el) throw new Error("video element not yet rendered");
			return el as HTMLVideoElement;
		});

		setMediaProperty(video, "duration", 100);
		setMediaProperty(video, "currentTime", 25);
		video.dispatchEvent(new Event("timeupdate"));

		const progressBar = await waitFor(() => {
			const el = container.querySelector(
				".quickTimePlayerVideoControlsProgressBar",
			) as HTMLInputElement;
			if (!el) throw new Error("progress bar not yet rendered");
			return el;
		});

		await waitFor(() => expect(progressBar.value).toBe("0.25"));
	});
});
