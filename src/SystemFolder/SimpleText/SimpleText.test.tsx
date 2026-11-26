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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import windows98 from "../../../packages/appearance/windows98/src/windows98.json";

// MDXEditor does not run under jsdom: a stand-in that, as MDXEditor does,
// reports its own rewrite of the loaded Markdown once (the second argument,
// `initialMarkdownNormalize`), then each edit.
vi.mock(
	"@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor",
	async () => {
		const { useEffect } = await import("react");
		return {
			ClassicyRichTextEditor: ({
				content,
				onChangeFunc,
			}: {
				content: string;
				onChangeFunc?: (markdown: string, normalized?: boolean) => void;
			}) => {
				// Once, at mount, as MDXEditor normalizes its initial markdown.
				useEffect(() => {
					onChangeFunc?.(`${content}\n`, true);
				}, []);
				return (
					<textarea
						data-testid="rich-text"
						defaultValue={content}
						onChange={(e) => onChangeFunc?.(e.target.value)}
					/>
				);
			},
		};
	},
);

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
			expect(screen.getByText("Untitled")).toBeInTheDocument();
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

// Notepad's ways, under the Windows 98 layout's `document`,
// `window.restoreViewState` and `menu.standardShortcuts` (read from
// windows98.json, over the default layout so the menus keep their plain
// titles): a changed document asks before it closes (the WIG audit's 1.17 /
// 5.25; WIG Ch.1 "Forgiveness", pp.2-3; Ch.5 "View Operations", p.46,
// "Transactions", p.49), with notepad.exe's message box; File ▸ Open… and
// Save take CTRL+O and CTRL+S (B.4; App. B Table B.2, p.358); and a
// document's caret comes back with its window (2.1; Ch.2 "Persistence",
// p.12). Platinum's SimpleText keeps none of them.
const NOTEPAD = "notepad-probe";
// Documents of the tests' own, so no other test's save can reach them.
const LETTER = "Macintosh HD:Documents:Letter.txt";
const NOTES = "Macintosh HD:Documents:Notes.txt";
const LETTER_TEXT = "Dear reader,\n\nThis is a letter.";
const STYLED = "Macintosh HD:Documents:Styled.md";

const useNotepadLayout = (
	documentLayout: Record<string, unknown> = {
		...windows98.layout.document,
		// Its own test below: the others find windows by the document's name.
		titleAppName: false,
	},
) => {
	registerClassicyAppearancePackage({
		id: NOTEPAD,
		name: "Notepad Probe",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${NOTEPAD}-default`,
			package: NOTEPAD,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			window: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT.window,
				restoreViewState: windows98.layout.window.restoreViewState,
			},
			menu: { standardShortcuts: windows98.layout.menu.standardShortcuts },
			document: documentLayout,
		} as never,
	});
	useAppManager.setState(
		produce(DefaultAppManagerState, (draft) => {
			draft.System.Manager.Appearance.packageId = NOTEPAD;
		}),
		true,
	);
};

const writeDocuments = () => {
	const fs = new ClassicyFileSystem();
	fs.writeFile(LETTER, LETTER_TEXT);
	fs.writeFile(NOTES, "notes");
};

const windowOf = (title: string) => {
	const win = screen
		.getAllByText(title)
		.map((el) => el.closest(".classicyWindow"))
		.find((el): el is HTMLElement => el !== null);
	if (!win) throw new Error(`no window titled ${title}`);
	return win;
};

const clickCloseBox = (title: string) => {
	const box = windowOf(title).querySelector(".classicyWindowCloseBox");
	if (!box) throw new Error("close box not found");
	fireEvent.click(box);
};

const promptOf = () =>
	document.querySelector(".classicyAlert") as HTMLElement | null;

const answer = (label: "Yes" | "No" | "Cancel") => {
	const prompt = promptOf();
	if (!prompt) throw new Error("no unsaved-changes prompt");
	fireEvent.click(within(prompt).getByRole("button", { name: label }));
};

const dialogOf = (id: string) =>
	document.getElementById(`${SIMPLE_TEXT.id}_${SIMPLE_TEXT.id}_${id}`);

const textOf = (path: string) => new ClassicyFileSystem().resolve(path)?._data;

const editDocument = async (
	user: ReturnType<typeof setupUser>,
	title: string,
	text: string,
) => {
	const field = windowOf(title).querySelector(
		"textarea",
	) as HTMLTextAreaElement;
	await user.clear(field);
	await user.paste(text);
	return field;
};

const simpleTextOpen = () =>
	useAppManager.getState().System.Manager.Applications.apps[SIMPLE_TEXT.id]
		?.open;

const openLetter = async () => {
	openFileInSimpleText(LETTER);
	await waitFor(() =>
		expect(screen.getByText("Letter.txt")).toBeInTheDocument(),
	);
};

describe("SimpleText under Notepad's keys", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useNotepadLayout();
		writeDocuments();
	});
	afterEach(() => {
		unregisterClassicyAppearancePackage(NOTEPAD);
	});

	it("asks before the close box closes a changed document, and Cancel keeps it open", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		await editDocument(user, "Letter.txt", "CHANGED");

		clickCloseBox("Letter.txt");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		const prompt = promptOf() as HTMLElement;
		expect(prompt.textContent).toContain(
			"The text in the Letter.txt file has changed.",
		);
		expect(prompt.textContent).toContain("Do you want to save the changes?");
		expect(
			within(prompt)
				.getAllByRole("button")
				.map((b) => b.textContent),
		).toEqual(["Yes", "No", "Cancel"]);
		// Titled with the app's name, as Notepad's message box is.
		expect(
			(prompt.closest(".classicyWindow") as HTMLElement).textContent,
		).toContain("SimpleText");

		answer("Cancel");
		await waitFor(() => expect(promptOf()).toBeNull());
		expect(screen.getByDisplayValue("CHANGED")).toBeInTheDocument();
		expect(textOf(LETTER)).toBe(LETTER_TEXT);
	});

	it("saves on Yes and closes", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		await editDocument(user, "Letter.txt", "SAVED ON CLOSE");

		clickCloseBox("Letter.txt");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		answer("Yes");
		await waitFor(() =>
			expect(screen.queryByText("Letter.txt")).not.toBeInTheDocument(),
		);
		expect(textOf(LETTER)).toBe("SAVED ON CLOSE");
	});

	it("discards on No and closes, so a reopen shows the file's text", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		await editDocument(user, "Letter.txt", "THROWN AWAY");

		clickCloseBox("Letter.txt");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		answer("No");
		await waitFor(() =>
			expect(screen.queryByText("Letter.txt")).not.toBeInTheDocument(),
		);
		expect(textOf(LETTER)).toBe(LETTER_TEXT);
		await openLetter();
		expect(screen.getByDisplayValue(/This is a letter/)).toBeInTheDocument();
	});

	it("routes File ▸ Close through the same question", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		await editDocument(user, "Letter.txt", "MENU CLOSE");
		await user.click(screen.getByText("Close", { exact: true }));
		await waitFor(() => expect(promptOf()).not.toBeNull(), { timeout: 2000 });
		answer("Cancel");
		await waitFor(() => expect(promptOf()).toBeNull());
		expect(screen.getByText("Letter.txt")).toBeInTheDocument();
	});

	it("takes the Markdown editor's rewrite of a file for no change, and asks after an edit", async () => {
		new ClassicyFileSystem().writeFile(STYLED, "# Title", {
			_type: ClassicyFileSystemEntryFileType.Markdown,
		});
		renderDesktop();
		openFileInSimpleText(STYLED);
		await waitFor(() =>
			expect(screen.getByText("Styled.md")).toBeInTheDocument(),
		);
		clickCloseBox("Styled.md");
		await waitFor(() =>
			expect(screen.queryByText("Styled.md")).not.toBeInTheDocument(),
		);
		expect(promptOf()).toBeNull();

		openFileInSimpleText(STYLED);
		await waitFor(() =>
			expect(screen.getByText("Styled.md")).toBeInTheDocument(),
		);
		fireEvent.change(screen.getByTestId("rich-text"), {
			target: { value: "# Retitled" },
		});
		clickCloseBox("Styled.md");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		expect(promptOf()?.textContent).toContain(
			"The text in the Styled.md file has changed.",
		);
	});

	it("closes an unchanged document at once", async () => {
		renderDesktop();
		await openLetter();
		clickCloseBox("Letter.txt");
		await waitFor(() =>
			expect(screen.queryByText("Letter.txt")).not.toBeInTheDocument(),
		);
		expect(promptOf()).toBeNull();
	});

	it("titles a document window '<document> - <application>' under document.titleAppName", async () => {
		unregisterClassicyAppearancePackage(NOTEPAD);
		useNotepadLayout(windows98.layout.document);
		renderDesktop();
		openSimpleText();
		await waitFor(() =>
			expect(screen.getByText("Untitled - SimpleText")).toBeInTheDocument(),
		);
	});

	it("asks about an untitled document holding text, and its Yes goes through Save As…", async () => {
		const user = setupUser();
		renderDesktop();
		openSimpleText();
		await waitFor(() =>
			expect(screen.getByText("Untitled")).toBeInTheDocument(),
		);
		await editDocument(user, "Untitled", "a new note");

		clickCloseBox("Untitled");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		expect(promptOf()?.textContent).toContain(
			"The text in the Untitled file has changed.",
		);
		answer("Yes");
		// The Save dialog opens; cancelling it keeps the document open.
		await waitFor(() => expect(dialogOf("save_dialog")).not.toBeNull());
		fireEvent.click(
			within(dialogOf("save_dialog") as HTMLElement).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => expect(dialogOf("save_dialog")).toBeNull());
		expect(screen.getByDisplayValue("a new note")).toBeInTheDocument();
	});

	it("closes an untitled document once Save As… has saved it, opening no new window", async () => {
		const user = setupUser();
		renderDesktop();
		openSimpleText();
		await waitFor(() =>
			expect(screen.getByText("Untitled")).toBeInTheDocument(),
		);
		await editDocument(user, "Untitled", "kept for later");

		clickCloseBox("Untitled");
		await waitFor(() => expect(promptOf()).not.toBeNull());
		answer("Yes");
		await waitFor(() => expect(dialogOf("save_dialog")).not.toBeNull());
		const dialog = dialogOf("save_dialog") as HTMLElement;
		const name = dialog.querySelector(
			".classicyFileDialogNameRow input",
		) as HTMLInputElement;
		await user.clear(name);
		await user.type(name, "Kept");
		fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
		await waitFor(() => expect(dialogOf("save_dialog")).toBeNull());
		await waitFor(() =>
			expect(
				screen.queryByDisplayValue("kept for later"),
			).not.toBeInTheDocument(),
		);
		// Saved where the dialog put it, and not reopened as a document.
		const holds = (node: unknown, name: string): boolean =>
			typeof node === "object" &&
			node !== null &&
			Object.entries(node).some(
				([key, child]) =>
					(key === name &&
						(child as { _data?: unknown })._data === "kept for later") ||
					(!key.startsWith("_") && holds(child, name)),
			);
		expect(holds(new ClassicyFileSystem().fs, "Kept.txt")).toBe(true);
		expect(screen.queryByText("Kept.txt")).not.toBeInTheDocument();
		const openFiles =
			useAppManager.getState().System.Manager.Applications.apps[SIMPLE_TEXT.id]
				?.data?.openFiles;
		expect(openFiles ?? []).toEqual([]);
	});

	it("walks every changed document on Quit, one at a time, then quits", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		openFileInSimpleText(NOTES);
		await waitFor(() =>
			expect(screen.getByText("Notes.txt")).toBeInTheDocument(),
		);
		await editDocument(user, "Letter.txt", "LETTER CHANGED");
		await editDocument(user, "Notes.txt", "NOTES CHANGED");

		await user.click(screen.getByText("Quit", { exact: true }));
		await waitFor(() => expect(promptOf()).not.toBeNull(), { timeout: 2000 });
		expect(promptOf()?.textContent).toContain(
			"The text in the Letter.txt file",
		);
		answer("Yes");
		await waitFor(() =>
			expect(promptOf()?.textContent).toContain(
				"The text in the Notes.txt file",
			),
		);
		expect(textOf(LETTER)).toBe("LETTER CHANGED");
		answer("No");
		await waitFor(() => expect(simpleTextOpen()).toBe(false));
		expect(textOf(NOTES)).toBe("notes");
	});

	it("stops the Quit on Cancel, leaving the app open", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		await editDocument(user, "Letter.txt", "KEEP ME");
		await user.click(screen.getByText("Quit", { exact: true }));
		await waitFor(() => expect(promptOf()).not.toBeNull(), { timeout: 2000 });
		answer("Cancel");
		await waitFor(() => expect(promptOf()).toBeNull());
		expect(simpleTextOpen()).toBe(true);
		expect(screen.getByDisplayValue("KEEP ME")).toBeInTheDocument();
	});

	it("runs Save on Control-S and Open… on Control-O, keeping the browser's own", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		const field = await editDocument(user, "Letter.txt", "CTRL S");
		const key = (k: string) => {
			const event = new KeyboardEvent("keydown", {
				key: k,
				code: `Key${k.toUpperCase()}`,
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});
			act(() => {
				field.dispatchEvent(event);
			});
			return event;
		};
		expect(key("s").defaultPrevented).toBe(true);
		await waitFor(() => expect(textOf(LETTER)).toBe("CTRL S"));
		expect(key("o").defaultPrevented).toBe(true);
		await waitFor(() => expect(dialogOf("open_dialog")).not.toBeNull());
	});

	it("puts a document's caret back when its window opens again", async () => {
		renderDesktop();
		await openLetter();
		const field = windowOf("Letter.txt").querySelector(
			"textarea",
		) as HTMLTextAreaElement;
		field.setSelectionRange(8, 8);
		fireEvent.select(field);
		const record = () =>
			getAppWindow(
				useAppManager.getState().System.Manager.Applications.apps[
					SIMPLE_TEXT.id
				],
				`${SIMPLE_TEXT.id}_file_${LETTER}`,
			);
		await waitFor(() => expect(record()?.caret).toBe(8), { timeout: 2000 });

		clickCloseBox("Letter.txt");
		await waitFor(() =>
			expect(screen.queryByText("Letter.txt")).not.toBeInTheDocument(),
		);
		await openLetter();
		const reopened = windowOf("Letter.txt").querySelector(
			"textarea",
		) as HTMLTextAreaElement;
		expect(reopened.selectionStart).toBe(8);
	});
});

describe("SimpleText without Notepad's keys", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		writeDocuments();
	});

	it("closes a changed document without asking, takes no Control-S, and keeps no caret", async () => {
		const user = setupUser();
		renderDesktop();
		await openLetter();
		const field = await editDocument(user, "Letter.txt", "UNSAVED");
		const save = new KeyboardEvent("keydown", {
			key: "s",
			code: "KeyS",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			field.dispatchEvent(save);
		});
		expect(save.defaultPrevented).toBe(false);
		field.setSelectionRange(3, 3);
		fireEvent.select(field);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(textOf(LETTER)).toBe(LETTER_TEXT);
		const record = getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[SIMPLE_TEXT.id],
			`${SIMPLE_TEXT.id}_file_${LETTER}`,
		);
		expect(record).not.toHaveProperty("caret");

		clickCloseBox("Letter.txt");
		await waitFor(() =>
			expect(screen.queryByText("Letter.txt")).not.toBeInTheDocument(),
		);
		expect(promptOf()).toBeNull();
	});
});

// Shell addendum B1 (WIG Ch.7 "The File Menu", p.98): under Windows 98's own
// layout (a taskbar, each window its own bar), SimpleText's File menu ends
// with a divider and Exit, its Quit retitled, as Notepad's ends.
describe("SimpleText's window bar under Windows 98's layout", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	const SHELL = "simpletext-shell-probe";
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		registerClassicyAppearancePackage({
			id: SHELL,
			name: "Shell Probe",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: `${SHELL}-default`,
				package: SHELL,
			},
			layout: windows98.layout as never,
		});
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Appearance.packageId = SHELL;
			}),
			true,
		);
	});
	afterEach(() => {
		unregisterClassicyAppearancePackage(SHELL);
	});

	it("ends File with a divider and Exit", async () => {
		renderDesktop();
		openSimpleText();
		// Titled as Notepad titles a window ("Untitled - SimpleText").
		await waitFor(() => {
			expect(
				document.querySelector(
					`[id^="${SIMPLE_TEXT.id}_"] .classicyWindowMenuBar`,
				),
			).not.toBeNull();
		});
		const bar = document.querySelector(
			`[id^="${SIMPLE_TEXT.id}_"] .classicyWindowMenuBar`,
		) as HTMLElement;
		expect(bar).not.toBeNull();
		// Its first title, File (its text split by the access key's span).
		const file = bar.querySelector(
			":scope > .classicyMenuWrapper > ul > li",
		) as HTMLElement;
		expect(file.querySelector(":scope > p")?.textContent).toBe("File");
		const rows = Array.from(
			file.querySelectorAll(":scope > .classicyMenuWrapper > ul > *"),
		).map((row) =>
			row.tagName === "HR"
				? "—"
				: (row.querySelector(":scope > p")?.textContent ?? "").trim(),
		);
		expect(rows.slice(-2)).toEqual(["—", "Exit"]);
		expect(rows).not.toContain("Quit");
	});
});
