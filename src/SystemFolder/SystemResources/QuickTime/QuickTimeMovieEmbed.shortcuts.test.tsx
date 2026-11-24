import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";

const APP_ID = "MoviePlayer.app";
// Movie Player names a file's window after its path (the document key)…
const FILE_WINDOW = `${APP_ID}_MoviePlayer_Macintosh HD:Movies:clip.mov`;
// …while the embed plays the resolved source, an object URL for file data.
const RESOLVED_SRC = "blob:http://localhost/1234";

const focusWindow = (windowId: string) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Applications.apps[APP_ID] = {
					id: APP_ID,
					name: "Movie Player",
					icon: "",
					open: true,
					focused: true,
					data: {},
					windows: windowsRecord({
						id: windowId,
						closed: false,
						focused: true,
						size: [400, 300] as [number, number],
						position: [0, 0] as [number, number],
						minimumSize: [0, 0] as [number, number],
					}),
				};
			}),
		);
	});

afterEach(() => {
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("QuickTimeVideoEmbed keyboard shortcuts (#306)", () => {
	it("work for a file-system movie when given its window id", () => {
		focusWindow(FILE_WINDOW);
		const onPlayingChange = vi.fn();
		render(
			<QuickTimeVideoEmbed
				appId={APP_ID}
				windowId={FILE_WINDOW}
				name="clip.mov"
				url={RESOLVED_SRC}
				type="video"
				onPlayingChange={onPlayingChange}
			/>,
		);
		fireEvent.keyDown(window, { key: " " });
		expect(onPlayingChange).toHaveBeenCalledWith(true);
	});

	it("stay off while another window of the app is focused", () => {
		focusWindow(`${APP_ID}_MoviePlayer_Macintosh HD:Movies:other.mov`);
		const onPlayingChange = vi.fn();
		render(
			<QuickTimeVideoEmbed
				appId={APP_ID}
				windowId={FILE_WINDOW}
				name="clip.mov"
				url={RESOLVED_SRC}
				type="video"
				onPlayingChange={onPlayingChange}
			/>,
		);
		fireEvent.keyDown(window, { key: " " });
		expect(onPlayingChange).not.toHaveBeenCalled();
	});

	it("default to the window named after the URL, for movies opened by URL", () => {
		const url = "https://example.com/clip.mp4";
		focusWindow(`${APP_ID}_MoviePlayer_${url}`);
		const onPlayingChange = vi.fn();
		render(
			<QuickTimeVideoEmbed
				appId={APP_ID}
				name="clip"
				url={url}
				type="video"
				onPlayingChange={onPlayingChange}
			/>,
		);
		fireEvent.keyDown(window, { key: " " });
		expect(onPlayingChange).toHaveBeenCalledWith(true);
	});

	// A floating Apple Guide window sits over the front app's window: keys a
	// focused control of the guide handles itself (Space on a button, arrows in
	// its pager) are not the movie's (story 0233-c79, m10).
	describe("with a floating guide's control focused", () => {
		const seeks: number[] = [];
		const renderMovie = (windowDomId: string) => {
			focusWindow(FILE_WINDOW);
			const onPlayingChange = vi.fn();
			const view = render(
				<>
					<div className="classicyWindow" id={windowDomId}>
						<QuickTimeVideoEmbed
							appId={APP_ID}
							windowId={FILE_WINDOW}
							name="clip.mov"
							url={RESOLVED_SRC}
							type="video"
							onPlayingChange={onPlayingChange}
						/>
					</div>
					<div className="classicyWindow" id="AppleGuide.app_apple_guide_x">
						<button type="button" id="guide-button" />
					</div>
				</>,
			);
			const video = view.container.querySelector("video") as HTMLVideoElement;
			seeks.length = 0;
			Object.defineProperty(video, "duration", {
				configurable: true,
				get: () => 600,
			});
			Object.defineProperty(video, "currentTime", {
				configurable: true,
				get: () => 100,
				set: (v: number) => {
					seeks.push(v);
				},
			});
			return { onPlayingChange, view };
		};
		const key = (target: Element, k: string) =>
			fireEvent.keyDown(target, { key: k });

		it("Space aimed at a guide control, and a key the guide consumed, are not the movie's", () => {
			const { onPlayingChange, view } = renderMovie(`${APP_ID}_${FILE_WINDOW}`);
			const button = view.container.querySelector("#guide-button") as Element;
			key(button, " ");
			expect(onPlayingChange).not.toHaveBeenCalled();
			// The Assistant consumes the arrows with preventDefault.
			button.addEventListener("keydown", (e) => e.preventDefault());
			key(button, "ArrowRight");
			key(button, "ArrowLeft");
			expect(seeks).toEqual([]);
		});

		it("plain typing and unconsumed arrows aimed at the guide still reach the movie", () => {
			const { view } = renderMovie(`${APP_ID}_${FILE_WINDOW}`);
			const button = view.container.querySelector("#guide-button") as Element;
			key(button, "ArrowRight");
			expect(seeks.length).toBe(1);
		});

		it("the same keys with the movie's own window in front still act on it", () => {
			const { onPlayingChange, view } = renderMovie(`${APP_ID}_${FILE_WINDOW}`);
			const video = view.container.querySelector("video") as Element;
			key(video, " ");
			key(video, "ArrowRight");
			expect(onPlayingChange).toHaveBeenCalledWith(true);
			expect(seeks.length).toBe(1);
			// And from the page itself (no window aimed at), as before.
			key(document.body, "ArrowLeft");
			expect(seeks.length).toBe(2);
		});
	});
});
