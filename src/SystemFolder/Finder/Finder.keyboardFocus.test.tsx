import { act, cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "./Finder";

// #270 end to end, against the real store, window and list view: opening a
// Finder folder must leave its list box focused, so the keyboard works without
// clicking into the list first.

const DOCUMENTS_PATH = "Macintosh HD:Documents";

const listBox = (container: HTMLElement) =>
	container.querySelector<HTMLElement>(".classicyTableContainer");

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	cleanup();
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS_PATH });
});

const openDocumentsAsList = () => {
	dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS_PATH });
	dispatch({
		type: "ClassicyAppFinderSetFolderView",
		path: DOCUMENTS_PATH,
		viewType: "list",
	});
	return render(<Finder />);
};

describe("Finder folder window keyboard focus (#270)", () => {
	it("focuses the list of a newly opened folder so Down Arrow selects at once", async () => {
		const user = userEvent.setup();
		const { container } = openDocumentsAsList();

		await waitFor(() => {
			expect(listBox(container)).not.toBeNull();
			expect(document.activeElement).toBe(listBox(container));
		});

		await user.keyboard("{ArrowDown}");

		await waitFor(() => {
			expect(
				container.querySelectorAll("tr.classicyTableRow.selected"),
			).toHaveLength(1);
		});
		// The first row in the list's visual order.
		const firstRow = container.querySelector("tbody tr");
		expect(firstRow).toHaveClass("selected");
	});

	it("re-focuses the list after switching the focused window back to list view", async () => {
		const { container } = openDocumentsAsList();
		await waitFor(() => {
			expect(document.activeElement).toBe(listBox(container));
		});

		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "icons",
			});
		});
		await waitFor(() => expect(listBox(container)).toBeNull());

		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: DOCUMENTS_PATH,
				viewType: "list",
			});
		});
		await waitFor(() => {
			expect(listBox(container)).not.toBeNull();
			expect(document.activeElement).toBe(listBox(container));
		});
	});
});
