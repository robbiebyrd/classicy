// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { requestClassicyAppQuit } from "@/SystemFolder/SystemResources/App/ClassicyAppQuit";
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

// A window's title bar showing `name`. (The Apple menu's Recent Documents
// lists an opened file by the same name, so a bare text query finds both.)
const windowTitled = (name: string): HTMLElement | null =>
	[
		...document.querySelectorAll<HTMLElement>(
			".classicyWindow .classicyWindowTitleText",
		),
	].find((el) => el.textContent?.trim() === name) ?? null;

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

	// System 7 keeps a document's bars while it fits (layout.scrollBar.fitsBars):
	// the plain-text editor fills the window and draws them itself.
	it("keeps its text area's bars while the text fits under System 7", async () => {
		await import("@classicy/appearance-system7");
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Appearance.packageId = "system7";
			}),
			true,
		);
		renderDesktop();
		openSimpleText();
		await waitFor(() => {
			expect(screen.getByText("untitled")).toBeInTheDocument();
		});
		const editor = document.querySelector(
			".classicyTextEditorArea",
		) as HTMLElement;
		const bars = editor.querySelectorAll('[data-classicy-part="scrollbar"]');
		expect(bars).toHaveLength(2);
	});

	// Regression test for a dispatch loop (7687143): the default window passes an
	// inline appMenu literal and SimpleText selects its whole app slice, so a
	// menuBar-write re-render used to re-fire the focused-menu effect forever.
	it("opens its default untitled window without an infinite menuBar dispatch loop", async () => {
		renderDesktop();
		openSimpleText();
		await waitFor(() => {
			expect(screen.getByText("untitled")).toBeInTheDocument();
		});
	});

	it("opens a plain-text document from the file system showing its content", async () => {
		renderDesktop();
		openFileInSimpleText("Macintosh HD:Documents:Read Me.txt");

		// Window title is the file name…
		await waitFor(() => {
			expect(windowTitled("Read Me.txt")).toBeInTheDocument();
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
			expect(windowTitled("Read Me.txt")).toBeInTheDocument();
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
			expect(windowTitled("Read Me.txt")).toBeInTheDocument();
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
			expect(windowTitled("Read Me.txt")).toBeInTheDocument();
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

		// Close the document, dropping its in-memory working copy.
		act(() => {
			dispatch({
				type: "ClassicyAppSimpleTextCloseFile",
				app: { id: SIMPLE_TEXT.id },
				path: READ_ME,
			});
		});
		await waitFor(() => {
			expect(windowTitled("Read Me.txt")).not.toBeInTheDocument();
		});

		// Reopen it: the editor seeds from the file system and shows the edit.
		openFileInSimpleText(READ_ME);
		await waitFor(() => {
			expect(screen.getByDisplayValue("PERSISTED EDIT")).toBeInTheDocument();
		});
	});

	// Mac OS 8.1: closing a document's last window leaves SimpleText open with
	// no window, and its File, Edit and Help menus stay in the bar (the front
	// app keeps its menu bar); it opens an Untitled window only on launch.
	it("leaves no window after its last one closes, and keeps its menus", async () => {
		renderDesktop();
		openFileInSimpleText(READ_ME);
		await waitFor(() => {
			expect(windowTitled("Read Me.txt")).toBeInTheDocument();
		});
		act(() => {
			dispatch({
				type: "ClassicyAppSimpleTextCloseFile",
				app: { id: SIMPLE_TEXT.id },
				path: READ_ME,
			});
		});
		await waitFor(() => {
			expect(windowTitled("Read Me.txt")).not.toBeInTheDocument();
		});
		// Give an (unwanted) re-seed effect the chance it used to take.
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});
		expect(windowTitled("untitled")).not.toBeInTheDocument();
		const st = useAppManager.getState().System.Manager;
		expect(st.Applications.apps[SIMPLE_TEXT.id].open).toBe(true);
		expect(st.Applications.focusedAppId).toBe(SIMPLE_TEXT.id);
		const titles = st.Desktop.appMenu.map((m) => m.title);
		expect(titles).toEqual(expect.arrayContaining(["File", "Edit", "Help"]));
		const file = st.Desktop.appMenu.find((m) => m.title === "File");
		expect(file?.menuChildren?.map((m) => m.title)).toEqual(
			expect.arrayContaining(["New", "Open…"]),
		);
	});

	// Found during story 0226-a6f: opening a document into SimpleText reopened
	// every window it had closed, its untitled window too. Mac OS 8.1
	// (Infinite Mac) shows only the document's window when a document opens
	// SimpleText, and a document opened into SimpleText comes to the front.
	describe("a document open (openApp's document mode)", () => {
		const simpleText = () =>
			useAppManager.getState().System.Manager.Applications.apps[SIMPLE_TEXT.id];
		const docWindowId = `${SIMPLE_TEXT.id}_file_${READ_ME}`;

		it("leaves the untitled window the user closed closed", async () => {
			renderDesktop();
			openSimpleText();
			await waitFor(() => {
				expect(windowTitled("untitled")).toBeInTheDocument();
			});
			const untitledId = listAppWindows(simpleText()).find((w) => !w.closed)
				?.id as string;
			// Quit SimpleText: every window closes, the app stays mounted.
			act(() => {
				dispatch({ type: "ClassicyAppClose", app: { id: SIMPLE_TEXT.id } });
			});
			expect(getAppWindow(simpleText(), untitledId)?.closed).toBe(true);
			openFileInSimpleText(READ_ME);
			await waitFor(() => {
				expect(windowTitled("Read Me.txt")).toBeInTheDocument();
			});
			expect(getAppWindow(simpleText(), untitledId)?.closed).toBe(true);
			expect(getAppWindow(simpleText(), docWindowId)?.closed).toBe(false);
		});

		it("brings the document's window in front of the untitled window", async () => {
			renderDesktop();
			// A plain launch: SimpleText opens an untitled window.
			openSimpleText();
			await waitFor(() => {
				expect(windowTitled("untitled")).toBeInTheDocument();
			});
			openFileInSimpleText(READ_ME);
			await waitFor(() => {
				expect(windowTitled("Read Me.txt")).toBeInTheDocument();
			});
			// Close the document: the untitled window is in front again.
			act(() => {
				dispatch({
					type: "ClassicyWindowClose",
					app: { id: SIMPLE_TEXT.id },
					window: { id: docWindowId },
				});
				dispatch({
					type: "ClassicyAppSimpleTextCloseFile",
					app: { id: SIMPLE_TEXT.id },
					path: READ_ME,
				});
			});
			await waitFor(() => {
				expect(windowTitled("Read Me.txt")).not.toBeInTheDocument();
			});
			expect(windowTitled("untitled")).toBeInTheDocument();
			// Reopening the document brings its window in front of it.
			openFileInSimpleText(READ_ME);
			await waitFor(() => {
				expect(windowTitled("Read Me.txt")).toBeInTheDocument();
			});
			const front = listAppWindows(simpleText())
				.filter((w) => !w.closed)
				.sort((a, b) => (b.zOrder ?? 0) - (a.zOrder ?? 0))[0];
			expect(front?.id).toBe(docWindowId);
			expect(simpleText().lastAccessedWindowId).toBe(docWindowId);
		});
	});

	// Mac OS 8.1's SimpleText (Infinite Mac, 2026-11-24): closing a window,
	// or quitting, with unsaved text shows a caution alert, "Save changes to
	// the document “untitled” before closing?", buttons Don’t Save, Cancel and
	// Save (the default), for a close and for a Quit alike; Cancel keeps the
	// window, and keeps SimpleText running (story 0226-a6f, N2).
	describe("Save changes before closing", () => {
		const simpleText = () =>
			useAppManager.getState().System.Manager.Applications.apps[SIMPLE_TEXT.id];
		const SAVE_PROMPT =
			"Save changes to the document “untitled” before closing?";
		const alert = () => screen.queryByRole("alertdialog");
		const closeBoxOf = (title: string) => {
			const win = windowTitled(title)?.closest(".classicyWindow");
			const box = win?.querySelector(".classicyWindowCloseBox");
			if (!box) throw new Error(`no close box on ${title}`);
			return box;
		};
		const typeIntoUntitled = async () => {
			renderDesktop();
			openSimpleText();
			await waitFor(() => expect(windowTitled("untitled")).toBeInTheDocument());
			const textbox = screen.getByRole("textbox") as HTMLTextAreaElement;
			fireEvent.change(textbox, { target: { value: "unsaved words" } });
			expect(textbox.value).toBe("unsaved words");
		};
		const quitFromFileMenu = () => {
			const quitItem = (
				useAppManager.getState().System.Manager.Desktop.appMenu ?? []
			)
				.flatMap((menu) => menu.menuChildren ?? [])
				.find((item) => item.id === `${SIMPLE_TEXT.id}_quit`);
			if (!quitItem?.onClickFunc) throw new Error("no Quit item");
			act(() => quitItem.onClickFunc?.());
		};

		it("asks on closing a window with unsaved text, in Mac OS 8.1's words and order", async () => {
			await typeIntoUntitled();
			fireEvent.click(closeBoxOf("untitled"));
			await waitFor(() => expect(alert()).toBeInTheDocument());
			expect(
				within(alert() as HTMLElement).getByText(SAVE_PROMPT),
			).toBeInTheDocument();
			const buttons = within(alert() as HTMLElement).getAllByRole("button");
			expect(buttons.map((b) => b.textContent?.trim())).toEqual([
				"Don’t Save",
				"Cancel",
				"Save",
			]);
			expect(buttons[2].getAttribute("data-classicy-role")).toBe("default");
			expect(buttons[1].getAttribute("data-classicy-role")).toBe("cancel");

			// Cancel keeps the window and its text.
			fireEvent.click(buttons[1]);
			await waitFor(() => expect(alert()).not.toBeInTheDocument());
			expect(screen.getByDisplayValue("unsaved words")).toBeInTheDocument();

			// Don’t Save closes it, the text with it.
			fireEvent.click(closeBoxOf("untitled"));
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Don’t Save"));
			await waitFor(() =>
				expect(
					screen.queryByDisplayValue("unsaved words"),
				).not.toBeInTheDocument(),
			);
		});

		it("closes a window with nothing unsaved without asking", async () => {
			renderDesktop();
			openSimpleText();
			await waitFor(() => expect(windowTitled("untitled")).toBeInTheDocument());
			const untitledId = listAppWindows(simpleText()).find((w) => !w.closed)
				?.id as string;
			fireEvent.click(closeBoxOf("untitled"));
			await waitFor(() =>
				expect(getAppWindow(simpleText(), untitledId)?.closed).toBe(true),
			);
			expect(alert()).not.toBeInTheDocument();
		});

		it("saves an edited file and closes it on Save", async () => {
			renderDesktop();
			openFileInSimpleText(READ_ME);
			await waitFor(() =>
				expect(windowTitled("Read Me.txt")).toBeInTheDocument(),
			);
			fireEvent.change(screen.getByRole("textbox"), {
				target: { value: "SAVED ON CLOSE" },
			});
			fireEvent.click(closeBoxOf("Read Me.txt"));
			await waitFor(() => expect(alert()).toBeInTheDocument());
			expect(
				within(alert() as HTMLElement).getByText(
					"Save changes to the document “Read Me.txt” before closing?",
				),
			).toBeInTheDocument();
			fireEvent.click(within(alert() as HTMLElement).getByText("Save"));
			await waitFor(() =>
				expect(windowTitled("Read Me.txt")).not.toBeInTheDocument(),
			);
			expect(new ClassicyFileSystem().resolve(READ_ME)?._data).toBe(
				"SAVED ON CLOSE",
			);
		});

		it("asks before quitting; Cancel keeps SimpleText running", async () => {
			await typeIntoUntitled();
			quitFromFileMenu();
			await waitFor(() => expect(alert()).toBeInTheDocument());
			expect(
				within(alert() as HTMLElement).getByText(SAVE_PROMPT),
			).toBeInTheDocument();
			fireEvent.click(within(alert() as HTMLElement).getByText("Cancel"));
			await waitFor(() => expect(alert()).not.toBeInTheDocument());
			expect(simpleText().open).toBe(true);
			expect(screen.getByDisplayValue("unsaved words")).toBeInTheDocument();

			// Quit again, Don’t Save: SimpleText quits.
			quitFromFileMenu();
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Don’t Save"));
			await waitFor(() => expect(simpleText().open).toBe(false));
		});

		const menuItem = (suffix: string) => {
			const item = (
				useAppManager.getState().System.Manager.Desktop.appMenu ?? []
			)
				.flatMap((menu) => menu.menuChildren ?? [])
				.find((i) => typeof i.id === "string" && i.id.endsWith(suffix));
			if (!item?.onClickFunc) throw new Error(`no ${suffix} item`);
			return item;
		};

		// Re-review 2, A4: what SimpleText cannot ask about itself.
		it("has the browser confirm leaving the page while text is unsaved", async () => {
			const leave = () => {
				const event = new Event("beforeunload", { cancelable: true });
				window.dispatchEvent(event);
				return event.defaultPrevented;
			};
			renderDesktop();
			openSimpleText();
			await waitFor(() => expect(windowTitled("untitled")).toBeInTheDocument());
			expect(leave()).toBe(false);
			fireEvent.change(screen.getByRole("textbox"), {
				target: { value: "unsaved words" },
			});
			await waitFor(() => expect(leave()).toBe(true));
			fireEvent.click(closeBoxOf("untitled"));
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Don’t Save"));
			await waitFor(() => expect(leave()).toBe(false));
		});

		it("asks when a host quits it with requestClassicyAppQuit; a direct ClassicyAppClose quits at once", async () => {
			await typeIntoUntitled();
			let quit: Promise<boolean> | undefined;
			act(() => {
				quit = requestClassicyAppQuit(SIMPLE_TEXT.id);
			});
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Cancel"));
			await expect(quit).resolves.toBe(false);
			expect(simpleText().open).toBe(true);

			// ClassicyAppClose from code is the immediate quit (documented):
			// it discards what SimpleText has not saved, without asking.
			act(() => {
				dispatch({ type: "ClassicyAppClose", app: { id: SIMPLE_TEXT.id } });
			});
			expect(simpleText().open).toBe(false);
			expect(alert()).not.toBeInTheDocument();
		});

		// Re-review 3, N1: a quit from code while the alert is up answers it
		// Cancel and removes it, so it cannot come back and quit a later
		// SimpleText.
		it("drops its alert when quit from code, and asks afresh after a relaunch", async () => {
			await typeIntoUntitled();
			let first: Promise<boolean> | undefined;
			act(() => {
				first = requestClassicyAppQuit(SIMPLE_TEXT.id);
			});
			await waitFor(() => expect(alert()).toBeInTheDocument());
			act(() => {
				dispatch({ type: "ClassicyAppClose", app: { id: SIMPLE_TEXT.id } });
			});
			await expect(first).resolves.toBe(false);
			await waitFor(() => expect(alert()).not.toBeInTheDocument());
			expect(simpleText().open).toBe(false);

			openSimpleText();
			await waitFor(() => expect(windowTitled("untitled")).toBeInTheDocument());
			expect(alert()).not.toBeInTheDocument();
			expect(simpleText().open).toBe(true);
			fireEvent.change(screen.getByRole("textbox"), {
				target: { value: "fresh words" },
			});
			let second: Promise<boolean> | undefined;
			act(() => {
				second = requestClassicyAppQuit(SIMPLE_TEXT.id);
			});
			expect(second).not.toBe(first);
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Cancel"));
			await expect(second).resolves.toBe(false);
			expect(simpleText().open).toBe(true);
			expect(screen.getByDisplayValue("fresh words")).toBeInTheDocument();
		});

		// Re-review 2, M1: each document closes as it is answered.
		it("closes each answered document during a Quit; Cancel keeps the rest", async () => {
			await typeIntoUntitled();
			act(() => menuItem("_new").onClickFunc?.());
			await waitFor(() =>
				expect(screen.getAllByRole("textbox")).toHaveLength(2),
			);
			const second = screen
				.getAllByRole("textbox")
				.find((t) => (t as HTMLTextAreaElement).value === "") as HTMLElement;
			fireEvent.change(second, { target: { value: "second words" } });

			quitFromFileMenu();
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Don’t Save"));
			// The front document (the second) closed; the first is asked next.
			await waitFor(() =>
				expect(
					screen.queryByDisplayValue("second words"),
				).not.toBeInTheDocument(),
			);
			await waitFor(() => expect(alert()).toBeInTheDocument());
			fireEvent.click(within(alert() as HTMLElement).getByText("Cancel"));
			await waitFor(() => expect(alert()).not.toBeInTheDocument());
			expect(simpleText().open).toBe(true);
			expect(screen.getByDisplayValue("unsaved words")).toBeInTheDocument();
		});

		// Re-review 2, M8: a Save As… chosen while the alert is up is a Save
		// As (the document becomes its file), and answers the alert.
		it("treats a Save As… chosen during the alert as a Save As", async () => {
			const user = setupUser();
			await typeIntoUntitled();
			const saveAs = menuItem("_save_as");
			fireEvent.click(closeBoxOf("untitled"));
			await waitFor(() => expect(alert()).toBeInTheDocument());
			act(() => saveAs.onClickFunc?.());
			const nameField = await screen.findByLabelText("Save As:");
			await user.clear(nameField);
			await user.type(nameField, "Plan");
			const dialog = nameField.closest(".classicyWindow") as HTMLElement;
			await user.click(within(dialog).getByRole("button", { name: "Save" }));
			await waitFor(() => expect(windowTitled("Plan.txt")).toBeInTheDocument());
			await waitFor(() => expect(alert()).not.toBeInTheDocument());
			expect(screen.getByDisplayValue("unsaved words")).toBeInTheDocument();
		});

		it("quits at once with nothing unsaved", async () => {
			renderDesktop();
			openSimpleText();
			await waitFor(() => expect(windowTitled("untitled")).toBeInTheDocument());
			quitFromFileMenu();
			await waitFor(() => expect(simpleText().open).toBe(false));
			expect(alert()).not.toBeInTheDocument();
		});
	});
});
