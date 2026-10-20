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
});
