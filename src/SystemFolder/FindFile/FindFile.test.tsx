// Find File on a whole desktop (story 0227-815): opened from the Finder's
// File ▸ Find…, it searches the desktop's live file system, lists Items
// Found with the path pane, opens a result through the Finder's routing,
// reveals one in its Finder window, and searches host sources as channels.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	type ClassicyFindResult,
	listClassicyFindSources,
	registerClassicyFindSource,
	unregisterClassicyFindSource,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import {
	FIND_FILE_APP_ID,
	FIND_FILE_RESULTS_WINDOW_ID,
	FIND_FILE_WINDOW_ID,
} from "@/SystemFolder/FindFile/FindFileContext";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const READ_ME = "Macintosh HD:Documents:Read Me.txt";

const apps = () => useAppManager.getState().System.Manager.Applications.apps;
const findFile = () => apps()[FIND_FILE_APP_ID];
const finderData = () =>
	apps()["Finder.app"]?.data as {
		openPaths?: string[];
		reveal?: { path: string; seq: number };
	};

/** The item titled `title` in the menu bar's current app menu. */
const menuItem = (title: string): ClassicyMenuItem => {
	const walk = (
		items: ClassicyMenuItem[] = [],
	): ClassicyMenuItem | undefined => {
		for (const item of items) {
			if (item.title === title) return item;
			const found = walk(item.menuChildren);
			if (found) return found;
		}
		return undefined;
	};
	const item = walk(useAppManager.getState().System.Manager.Desktop.appMenu);
	if (!item) throw new Error(`No menu item ${title}`);
	return item;
};
const choose = (title: string) =>
	act(() => {
		menuItem(title).onClickFunc?.();
	});

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

const openFindFile = async () => {
	act(() => {
		dispatch({ type: "ClassicyAppFindFileShowFind" });
	});
	await waitFor(() => expect(findWindow()).toBeTruthy());
};

const findWindow = () =>
	document
		.querySelector<HTMLElement>(`[id$="${FIND_FILE_WINDOW_ID}"]`)
		?.closest<HTMLElement>(".classicyWindow") ??
	screen
		.queryAllByText("Find items")[0]
		?.closest<HTMLElement>(".classicyWindow");

const resultsWindow = () =>
	screen.queryByText("Items Found")?.closest<HTMLElement>(".classicyWindow");

const typeName = (text: string) => {
	const field = document.getElementById(
		"classicy-find-file-row-0-value",
	) as HTMLInputElement;
	fireEvent.change(field, { target: { value: text } });
};

const clickFind = () => {
	const win = findWindow();
	if (!win) throw new Error("no Find window");
	fireEvent.click(within(win).getByRole("button", { name: "Find" }));
};

/**
 * Return in a text field, as a browser handles it (HTML's implicit
 * submission): the form's submit button is clicked; with none, the form is
 * submitted when that field is the only one that blocks it (text-like
 * inputs; checkboxes do not).
 */
const pressReturn = (field: HTMLInputElement) => {
	const allowed = fireEvent.keyDown(field, { key: "Enter", code: "Enter" });
	const form = field.form;
	if (!allowed || !form) return;
	const submit = form.querySelector<HTMLElement>(
		'button[type="submit"], input[type="submit"]',
	);
	if (submit) {
		fireEvent.click(submit);
		return;
	}
	const blocking = Array.from(form.querySelectorAll("input")).filter((i) =>
		[
			"text",
			"search",
			"tel",
			"url",
			"email",
			"password",
			"date",
			"month",
			"week",
			"time",
			"datetime-local",
			"number",
		].includes(i.type),
	);
	if (blocking.length === 1) fireEvent.submit(form);
};

const logs: ClassicyLogEntry[] = [];

describe("Find File", { timeout: 30_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		const fs = new ClassicyFileSystem();
		fs.writeFile("Macintosh HD:Documents:Projects:Plan.txt", "plan", {
			_type: ClassicyFileSystemEntryFileType.TextFile,
		});
		registerClassicyLogSink({
			id: "find-file-test",
			onLog: (e) => logs.push(e),
		});
	});

	afterEach(() => {
		cleanup();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
		unregisterClassicyLogSink("find-file-test");
		logs.length = 0;
	});

	it("is on the Finder's File menu as Find… (⌥F), and opens there", async () => {
		renderDesktop();
		// The desktop's own menu: the Finder in front with no window.
		await waitFor(() => expect(menuItem("Find…")).toBeTruthy());
		expect(menuItem("Find…").keyboardShortcut).toBe("⌥F");
		choose("Find…");
		await waitFor(() => expect(findWindow()).toBeTruthy());
		expect(findFile()?.open).toBe(true);
		expect(getAppWindow(findFile(), FIND_FILE_WINDOW_ID)?.focused).toBe(true);
		// Its own File menu, with 8.1's commands on Option.
		const shortcuts = Object.fromEntries(
			[
				"Find…",
				"Close Window",
				"More Choices",
				"Fewer Choices",
				"Open Item",
				"Open Enclosing Folder",
				"Quit",
			].map((t) => [t, menuItem(t).keyboardShortcut]),
		);
		expect(shortcuts).toEqual({
			"Find…": "⌥F",
			"Close Window": "⌥W",
			"More Choices": "⌥M",
			"Fewer Choices": "⌥R",
			"Open Item": "⌥O",
			"Open Enclosing Folder": "⌥E",
			Quit: "⌥Q",
		});
	});

	it("finds a document by part of its name, with its path", async () => {
		renderDesktop();
		await openFindFile();
		typeName("read m");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		const results = resultsWindow() as HTMLElement;
		expect(within(results).getByText("Found 1 Item")).toBeInTheDocument();
		expect(within(results).getAllByText("Read Me.txt").length).toBeGreaterThan(
			0,
		);
		// The path pane: the disk, the folder, the item, the first result
		// selected (8.1).
		const pane = results.querySelector(".classicyFindFilePath") as HTMLElement;
		expect(
			Array.from(
				pane.querySelectorAll('[role="option"]'),
				(o) => o.textContent,
			),
		).toEqual(["Macintosh HD", "Documents", "Read Me.txt"]);
		expect(getAppWindow(findFile(), FIND_FILE_RESULTS_WINDOW_ID)?.focused).toBe(
			true,
		);
	});

	it("opens a result through the Finder's routing, as a recent document", async () => {
		renderDesktop();
		await openFindFile();
		typeName("read me");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		choose("Open Item");
		await waitFor(() => expect(apps()["SimpleText.app"]?.open).toBe(true));
		const recent = useAppManager
			.getState()
			.System.Manager.Desktop.recentItems?.items.filter(
				(i) => i.kind === "document",
			)
			.map((i) => i.path);
		expect(recent).toEqual([READ_ME]);
	});

	it("reveals a result: its folder in front, with it selected", async () => {
		renderDesktop();
		await openFindFile();
		typeName("plan.txt");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		choose("Open Enclosing Folder");
		const folder = "Macintosh HD:Documents:Projects";
		await waitFor(() =>
			expect(getAppWindow(apps()["Finder.app"], folder)?.focused).toBe(true),
		);
		expect(finderData().openPaths).toContain(folder);
		expect(
			useAppManager.getState().System.Manager.Applications.focusedAppId,
		).toBe("Finder.app");
		// The Finder window's list shows the item selected.
		const selectedRow = () =>
			document
				.querySelector(`[data-classicy-file-path="${folder}:Plan.txt"]`)
				?.closest("tr");
		await waitFor(() =>
			expect(selectedRow()?.getAttribute("data-selected")).toBe("true"),
		);
		// Once shown, the reveal is spent (fix round 1, M1): closing the
		// window and opening the folder by hand selects nothing.
		await waitFor(() => expect(finderData().reveal).toBeUndefined());
		act(() => {
			dispatch({ type: "ClassicyAppFinderCloseFolder", path: folder });
		});
		await waitFor(() => expect(finderData().openPaths).not.toContain(folder));
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: folder });
		});
		await waitFor(() => expect(selectedRow()).toBeTruthy());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(selectedRow()?.getAttribute("data-selected")).toBeNull();
	});

	it("refuses to reveal an item inside an invisible folder, in 8.1's words", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir("Macintosh HD:Hidden Stuff");
		fs.setMetadata("Macintosh HD:Hidden Stuff", { _invisible: true });
		fs.writeFile("Macintosh HD:Hidden Stuff:Zebra.txt", "z", {
			_type: ClassicyFileSystemEntryFileType.TextFile,
		});
		renderDesktop();
		await openFindFile();
		typeName("zebra");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		choose("Open Enclosing Folder");
		expect(
			await screen.findByText(
				"Unable to open enclosing folder for “Zebra.txt” because it is invisible (or is inside an invisible folder).",
			),
		).toBeInTheDocument();
		expect(finderData().reveal).toBeUndefined();
	});

	it("says when nothing was found, and asks for a name first", async () => {
		renderDesktop();
		await openFindFile();
		clickFind();
		expect(
			await screen.findByText("Please enter a name before searching."),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		typeName("qqzzx");
		clickFind();
		expect(await screen.findByText("No items were found.")).toBeInTheDocument();
		expect(resultsWindow()).toBeFalsy();
	});

	it("adds and removes rows: the next unused criterion, at most ten", async () => {
		renderDesktop();
		await openFindFile();
		const rowsShown = () =>
			document.querySelectorAll(".classicyFindFileCriterion").length;
		expect(rowsShown()).toBe(1);
		expect(screen.queryByRole("button", { name: "Fewer Choices" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "More Choices" }));
		expect(rowsShown()).toBe(2);
		// The second row is size, its operator and 128 K (8.1).
		expect(
			document.getElementById("classicy-find-file-row-1-criterion")
				?.textContent,
		).toContain("size");
		expect(
			(
				document.getElementById(
					"classicy-find-file-row-1-value",
				) as HTMLInputElement
			).value,
		).toBe("128");
		for (let i = 0; i < 12; i += 1) choose("More Choices");
		expect(rowsShown()).toBe(10);
		expect(screen.getByRole("button", { name: "More Choices" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Fewer Choices" }));
		expect(rowsShown()).toBe(9);
	});

	it("remembers the location chosen", async () => {
		renderDesktop();
		await openFindFile();
		fireEvent.click(
			document.getElementById("classicy-find-file-location") as HTMLElement,
		);
		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((o) => o.textContent),
		).toEqual([
			"on all disks",
			"on local disks",
			"on the desktop",
			"on “Macintosh HD”",
		]);
		// Dividers between 8.1's groups.
		expect(listbox.querySelectorAll('[role="separator"], hr')).toHaveLength(2);
		fireEvent.click(within(listbox).getByText("on “Macintosh HD”"));
		expect((findFile()?.data as { location?: string }).location).toBe(
			"disk:Macintosh HD",
		);
	});

	it("quits when its last window closes", async () => {
		renderDesktop();
		await openFindFile();
		typeName("read me");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		choose("Close Window");
		await waitFor(() => expect(resultsWindow()).toBeFalsy());
		expect(findFile()?.open).toBe(true);
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		choose("Close Window");
		await waitFor(() => expect(findFile()?.open).toBe(false));
	});
});

describe("Find File's channels", { timeout: 30_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		registerClassicyLogSink({
			id: "find-file-test",
			onLog: (e) => logs.push(e),
		});
	});

	afterEach(() => {
		cleanup();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
		unregisterClassicyLogSink("find-file-test");
		logs.length = 0;
	});

	const searchFor = async (words: string) => {
		const tab = screen.getByRole("tab", { name: "Search Internet" });
		fireEvent.mouseDown(tab);
		fireEvent.mouseUp(tab);
		const field = document.getElementById(
			"classicy-find-file-words",
		) as HTMLInputElement;
		fireEvent.change(field, { target: { value: words } });
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
	};

	it("shows no channels until a source registers", async () => {
		renderDesktop();
		await openFindFile();
		expect(screen.queryByRole("tab", { name: "Search Internet" })).toBeNull();
		act(() => {
			registerClassicyFindSource({
				id: "archive",
				name: "The Archive",
				search: async () => [],
			});
		});
		expect(
			await screen.findByRole("tab", { name: "Search Internet" }),
		).toBeInTheDocument();
	});

	it("lists each source's results in its own place, opens one, and survives a failing source", async () => {
		const open = vi.fn();
		registerClassicyFindSource({
			id: "archive",
			name: "The Archive",
			search: async (query) => [
				{ name: `${query} at noon`, kind: "broadcast", open },
				{ name: `${query} at one`, kind: "broadcast", open: () => {} },
			],
		});
		registerClassicyFindSource({
			id: "broken",
			name: "Broken",
			search: async () => {
				throw new Error("offline");
			},
		});
		registerClassicyFindSource({
			id: "photos",
			name: "Photos",
			search: async () => [{ name: "Skyline", kind: "photo", open: () => {} }],
		});
		renderDesktop();
		await openFindFile();
		await searchFor("news");
		await waitFor(() =>
			expect(
				within(resultsWindow() as HTMLElement).getByText("Found 3 Items"),
			).toBeInTheDocument(),
		);
		const results = resultsWindow() as HTMLElement;
		expect(within(results).getAllByText("The Archive").length).toBeGreaterThan(
			0,
		);
		expect(within(results).getByText("Skyline")).toBeInTheDocument();
		expect(
			logs.some(
				(l) =>
					l.level === "error" && l.message === 'Search source "broken" failed',
			),
		).toBe(true);
		// The first result is selected; Open Item opens it.
		choose("Open Item");
		expect(open).toHaveBeenCalledTimes(1);
		expect(menuItem("Open Enclosing Folder").disabled).toBe(true);
	});

	it("aborts the last search when a new one starts, and shows only the new results", async () => {
		const signals: AbortSignal[] = [];
		const answers: ((r: ClassicyFindResult[]) => void)[] = [];
		registerClassicyFindSource({
			id: "slow",
			name: "Slow",
			search: (_query, { signal }) => {
				signals.push(signal);
				return new Promise((resolve) => answers.push(resolve));
			},
		});
		renderDesktop();
		await openFindFile();
		await searchFor("first");
		await waitFor(() => expect(signals).toHaveLength(1));
		// Still running (the button reads Stop): new words, then Return.
		expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
		const field = document.getElementById(
			"classicy-find-file-words",
		) as HTMLInputElement;
		// Return in the Words field, with Stop the form's only button: the
		// browser's implicit submission (jsdom has none; `pressReturn` follows
		// the HTML rule, and the browser check presses Return for real).
		fireEvent.change(field, { target: { value: "second" } });
		expect(
			within(field.form as HTMLFormElement).queryByRole("button", {
				name: "Search",
			}),
		).toBeNull();
		pressReturn(field);
		await waitFor(() => expect(signals).toHaveLength(2));
		expect(signals[0].aborted).toBe(true);
		// The first answers late, after it was aborted: ignored.
		act(() => {
			answers[0]([{ name: "Old answer", kind: "page", open: () => {} }]);
			answers[1]([{ name: "New answer", kind: "page", open: () => {} }]);
		});
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		const results = resultsWindow() as HTMLElement;
		expect(within(results).getAllByText("New answer").length).toBeGreaterThan(
			0,
		);
		expect(within(results).queryAllByText("Old answer")).toEqual([]);
		expect(signals[1].aborted).toBe(false);
		// Stop aborts the search running.
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		fireEvent.submit(field.form as HTMLFormElement);
		await waitFor(() => expect(signals).toHaveLength(3));
		fireEvent.click(screen.getByRole("button", { name: "Stop" }));
		expect(signals[2].aborted).toBe(true);
		expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
	});
});
