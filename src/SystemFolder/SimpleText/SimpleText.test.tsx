import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

const READ_ME = "Macintosh HD:Documents:Read Me.txt";

const SIMPLE_TEXT = { id: "SimpleText.app", name: "SimpleText", icon: "" };

// These are whole-desktop integration tests, so keep each one cheap: no Control
// Strip (SimpleText never touches it, and it triples the desktop's DOM, which
// every React commit and query then walks) and no artificial keystroke delay.
const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

const setupUser = () => userEvent.setup({ delay: null });

const openSimpleText = () =>
	act(() => {
		dispatch({ type: "ClassicyAppOpen", app: SIMPLE_TEXT });
	});

const openFileInSimpleText = (path: string) =>
	act(() => {
		dispatch({
			type: "ClassicyAppSimpleTextOpenFile",
			app: { id: SIMPLE_TEXT.id },
			path,
		});
	});

// Whole-desktop integration tests: each boots ClassicyDesktop, opens a real
// window and drives it through the store, costing up to ~1.5 s of CPU on an
// idle machine (mostly React dev-mode rendering and jsdom style computation,
// much of it one-off warm-up in each fresh test worker). A full parallel
// `pnpm test` run on a loaded or small CI machine stretches that several
// times over, past vitest's 5 s default, so this suite gets more headroom.
const INTEGRATION_TIMEOUT_MS = 15_000;

describe("SimpleText", { timeout: INTEGRATION_TIMEOUT_MS }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	// Regression test for a dispatch loop (7687143): the default window passes an
	// inline appMenu literal and SimpleText selects its whole app slice, so a
	// menuBar-write re-render used to re-fire the focused-menu effect forever.
	it("opens its default Untitled window without an infinite menuBar dispatch loop", async () => {
		renderDesktop();
		openSimpleText();
		await waitFor(() => {
			expect(screen.getByText("Untitled")).toBeInTheDocument();
		});
	});

	it("opens a plain-text document from the file system showing its content", async () => {
		renderDesktop();
		openFileInSimpleText("Macintosh HD:Documents:Read Me.txt");

		// Window title is the file name…
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});
		// …and the editor is seeded with the file's complete contents.
		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		expect(textbox.value).toBe(
			"Welcome to Classicy!\n\nThis is a plain text file opened in SimpleText.",
		);
	});

	it("keeps a reopened document's edited content as a working copy", async () => {
		const user = setupUser();
		renderDesktop();
		openFileInSimpleText("Macintosh HD:Documents:Read Me.txt");
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});

		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		await user.clear(textbox);
		await user.type(textbox, "edited body");
		expect(textbox.value).toBe("edited body");
	});

	// Finding #8: prove the full save round-trip, not just the editor state.
	// Edit the document, drive File → Save through the real menu, then read the
	// file back from the file system and confirm the edit was written to disk.
	// Every ClassicyFileSystem for a storage key shares one in-memory tree, so a
	// fresh instance here observes exactly what SimpleText's Save wrote.
	it("writes an edited document back to the file system on File → Save", async () => {
		const user = setupUser();
		renderDesktop();
		openFileInSimpleText(READ_ME);
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});

		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		// Paste the edit: each typed key re-renders the whole desktop, and this
		// test is about the save, not the keystrokes (the working-copy test above
		// types).
		await user.clear(textbox);
		await user.paste("ROUNDTRIP EDIT");
		expect(textbox.value).toBe("ROUNDTRIP EDIT");

		// The file still holds its original contents until Save runs.
		const probe = new ClassicyFileSystem();
		expect(probe.resolve(READ_ME)?._data).toBe(
			"Welcome to Classicy!\n\nThis is a plain text file opened in SimpleText.",
		);

		// Click the File → Save menu item. Its action runs when the flash
		// finishes; jsdom never animates, so the menu's fallback timer fires it.
		await user.click(screen.getByText("Save", { exact: true }));

		await waitFor(
			() => {
				expect(new ClassicyFileSystem().resolve(READ_ME)?._data).toBe(
					"ROUNDTRIP EDIT",
				);
			},
			{ timeout: 2000 },
		);
	});

	// A reopened document re-seeds its editor from the file system, so after a
	// Save the edit survives closing and reopening the window — the behavior a
	// user relies on when they double-click the file again in the Finder.
	it("shows the saved edit again after the document is closed and reopened", async () => {
		const user = setupUser();
		renderDesktop();
		openFileInSimpleText(READ_ME);
		await waitFor(() => {
			expect(screen.getByText("Read Me.txt")).toBeInTheDocument();
		});

		const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
		await user.clear(textbox);
		await user.paste("PERSISTED EDIT");
		await user.click(screen.getByText("Save", { exact: true }));
		await waitFor(
			() => {
				expect(new ClassicyFileSystem().resolve(READ_ME)?._data).toBe(
					"PERSISTED EDIT",
				);
			},
			{ timeout: 2000 },
		);

		// Close the document, dropping its in-memory working copy. (Closing the
		// last document re-seeds an empty Untitled window, so assert on the
		// document's own window going away rather than on textbox count.)
		act(() => {
			dispatch({
				type: "ClassicyAppSimpleTextCloseFile",
				app: { id: SIMPLE_TEXT.id },
				path: READ_ME,
			});
		});
		await waitFor(() => {
			expect(screen.queryByText("Read Me.txt")).not.toBeInTheDocument();
		});

		// Reopen it: the editor seeds from the file system and shows the edit.
		// getByDisplayValue targets the reopened document's textarea specifically,
		// ignoring the empty Untitled editor.
		openFileInSimpleText(READ_ME);
		await waitFor(() => {
			expect(screen.getByDisplayValue("PERSISTED EDIT")).toBeInTheDocument();
		});
	});
});
