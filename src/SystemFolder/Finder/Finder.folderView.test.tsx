import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

// Captures the `display` prop each open folder window's ClassicyFileBrowser
// actually receives, keyed by path — the one point in the render tree where
// a stored folderViews entry either does or does not reach the screen.
const capturedDisplayByPath: Record<string, string | undefined> = {};

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({
		path,
		display,
	}: {
		path: string;
		display?: string;
	}) => {
		capturedDisplayByPath[path] = display;
		return <div data-testid={`classicy-file-browser-${path}`} />;
	},
}));

import { Finder } from "./Finder";

const DOCUMENTS_PATH = "Macintosh HD:Documents";

afterEach(() => {
	cleanup();
	for (const key of Object.keys(capturedDisplayByPath)) {
		delete capturedDisplayByPath[key];
	}
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS_PATH });
});

describe("Finder folder view persistence (store to screen)", () => {
	it("opens a folder with a stored icons preference already in icons mode", async () => {
		// Seed the store exactly as a reload would restore it: the folder is
		// open, and folderViews already has an explicit "icons" entry for it —
		// before Finder ever mounts.
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS_PATH });
		dispatch({
			type: "ClassicyAppFinderSetFolderView",
			path: DOCUMENTS_PATH,
			viewType: "icons",
		});

		render(<Finder />);

		await waitFor(() => {
			expect(capturedDisplayByPath[DOCUMENTS_PATH]).toBe("icons");
		});
	});
});
