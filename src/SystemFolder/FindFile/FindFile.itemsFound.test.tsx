// Items Found under load (story 0227-815, fix round 1): it draws the rows in
// view only, reads a file's size as its row is drawn (a few at a time, under
// the search's signal), and draws nothing again for a keystroke in the Find
// window or a write elsewhere in the tree; its rows follow the live tree.
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
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { CLASSICY_FIND_LOOKUPS } from "@/SystemFolder/FindFile/ClassicyFindLookups.internal";
import {
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
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType as T,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type * as TableModule from "@/SystemFolder/SystemResources/Table/ClassicyTable";

// How many times Items Found's list renders.
const renders = vi.hoisted(() => ({ results: 0 }));
vi.mock(
	"@/SystemFolder/SystemResources/Table/ClassicyTable",
	async (importOriginal) => {
		const actual = await importOriginal<typeof TableModule>();
		return {
			...actual,
			ClassicyTable: (
				props: ComponentProps<typeof actual.ClassicyTable<unknown>>,
			) => {
				if (props.className === "classicyFindFileResultsList") {
					renders.results += 1;
				}
				return actual.ClassicyTable(props);
			},
		};
	},
);

const apps = () => useAppManager.getState().System.Manager.Applications.apps;
const findFile = () => apps()[FIND_FILE_APP_ID];

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

const renderDesktop = (storageKey?: string) =>
	render(
		<ClassicyAppManagerProvider
			{...(storageKey ? { fileSystemStorageKey: storageKey } : {})}
		>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

const findWindow = () =>
	screen
		.queryAllByText("Find items")[0]
		?.closest<HTMLElement>(".classicyWindow");
const resultsWindow = () =>
	screen.queryByText("Items Found")?.closest<HTMLElement>(".classicyWindow");

const openFindFile = async () => {
	act(() => {
		dispatch({ type: "ClassicyAppFindFileShowFind" });
	});
	await waitFor(() => expect(findWindow()).toBeTruthy());
};
const typeName = (text: string) =>
	fireEvent.change(
		document.getElementById("classicy-find-file-row-0-value") as HTMLElement,
		{ target: { value: text } },
	);
const clickFind = () =>
	fireEvent.click(
		within(findWindow() as HTMLElement).getByRole("button", { name: "Find" }),
	);
const drawnRows = () =>
	Array.from(
		resultsWindow()?.querySelectorAll<HTMLElement>("tbody tr[data-row-id]") ??
			[],
	);

/** Put `count` files behind URLs, with no data and no recorded size. */
const seedArchive = (fs: ClassicyFileSystem, count: number) => {
	fs.mkDir("Macintosh HD:Archive");
	const folder = fs.resolve("Macintosh HD:Archive") as ClassicyFileSystemEntry;
	for (let i = 0; i < count; i += 1) {
		folder[`clip ${String(i).padStart(4, "0")}.mov`] = {
			_type: T.Video,
			_url: `https://archive.example/clip-${i}.mov`,
		};
	}
};

/** A fetch whose HEAD requests wait to be answered, counted. */
const heldHeads = () => {
	const held: {
		url: string;
		signal?: AbortSignal;
		answer: (length: number) => void;
	}[] = [];
	let inFlight = 0;
	let most = 0;
	const fetchMock = vi.fn((url: unknown, init?: RequestInit) => {
		if (init?.method !== "HEAD") return Promise.reject(new Error("no"));
		inFlight += 1;
		most = Math.max(most, inFlight);
		return new Promise<Response>((resolve, reject) => {
			const done = () => {
				inFlight -= 1;
			};
			held.push({
				url: String(url),
				signal: init.signal ?? undefined,
				answer: (length) => {
					done();
					resolve({
						ok: true,
						headers: new Headers({ "Content-Length": String(length) }),
					} as Response);
				},
			});
			init.signal?.addEventListener("abort", () => {
				done();
				reject(new DOMException("aborted", "AbortError"));
			});
		});
	});
	vi.stubGlobal("fetch", fetchMock);
	return { held, fetchMock, most: () => most };
};

describe("Items Found", { timeout: 60_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		renders.results = 0;
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
	});

	it("opens at once on files behind URLs, reading sizes only for the rows drawn, a few at a time", async () => {
		const heads = heldHeads();
		seedArchive(new ClassicyFileSystem(), 300);
		renderDesktop();
		await openFindFile();
		typeName("clip");
		clickFind();
		// No size held the search back: the window is up before any answer.
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		expect(
			within(resultsWindow() as HTMLElement).getByText("Found 300 Items"),
		).toBeInTheDocument();
		const drawn = drawnRows().length;
		expect(drawn).toBeGreaterThan(0);
		expect(drawn).toBeLessThan(300);
		await waitFor(() => expect(heads.held.length).toBe(CLASSICY_FIND_LOOKUPS));
		// Answer each read as it comes: every drawn row, and only those.
		for (let round = 0; round < 40 && heads.held.length < drawn; round += 1) {
			await act(async () => {
				for (const h of heads.held) h.answer(4096);
				await new Promise((resolve) => setTimeout(resolve, 0));
			});
		}
		await act(async () => {
			for (const h of heads.held) h.answer(4096);
			await new Promise((resolve) => setTimeout(resolve, 10));
		});
		expect(heads.fetchMock.mock.calls.length).toBe(drawn);
		expect(heads.most()).toBeLessThanOrEqual(CLASSICY_FIND_LOOKUPS);
		expect(
			within(drawnRows()[0]).getByText(
				new ClassicyFileSystem().formatSize(4096),
			),
		).toBeInTheDocument();
	});

	it("stops reading sizes when Items Found closes", async () => {
		const heads = heldHeads();
		seedArchive(new ClassicyFileSystem(), 100);
		renderDesktop();
		await openFindFile();
		typeName("clip");
		clickFind();
		await waitFor(() => expect(heads.held.length).toBe(CLASSICY_FIND_LOOKUPS));
		act(() => {
			menuItem("Close Window").onClickFunc?.();
		});
		await waitFor(() => expect(resultsWindow()).toBeFalsy());
		expect(heads.held.every((h) => h.signal?.aborted)).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(heads.fetchMock).toHaveBeenCalledTimes(CLASSICY_FIND_LOOKUPS);
	});

	it("spins the asynchronous arrows and counts what it found while it searches", async () => {
		const heads = heldHeads();
		seedArchive(new ClassicyFileSystem(), 6);
		renderDesktop();
		await openFindFile();
		typeName("clip");
		fireEvent.click(screen.getByRole("button", { name: "More Choices" }));
		clickFind();
		await waitFor(() => expect(heads.held.length).toBe(CLASSICY_FIND_LOOKUPS));
		const find = findWindow() as HTMLElement;
		expect(
			find.querySelector(
				".classicyFindFileBusy .classicyProgressChasingArrows",
			),
		).toBeTruthy();
		expect(find.querySelector(".classicyFindFileProgress")?.textContent).toBe(
			"Items Found:0",
		);
		await act(async () => {
			for (const h of heads.held) h.answer(1024);
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		await waitFor(() =>
			expect(find.querySelector(".classicyFindFileProgress")?.textContent).toBe(
				"Items Found:4",
			),
		);
		await act(async () => {
			for (const h of heads.held) h.answer(1024);
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		expect(find.querySelector(".classicyFindFileBusy")).toBeNull();
		expect(find.querySelector(".classicyFindFileProgress")).toBeNull();
	});

	it("sorted by size, reads every row's size", async () => {
		const heads = heldHeads();
		seedArchive(new ClassicyFileSystem(), 90);
		renderDesktop();
		await openFindFile();
		typeName("clip");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		act(() => {
			menuItem("by Size").onClickFunc?.();
		});
		for (
			let round = 0;
			round < 60 && heads.fetchMock.mock.calls.length < 90;
			round += 1
		) {
			await act(async () => {
				for (const h of heads.held) h.answer(1000);
				await new Promise((resolve) => setTimeout(resolve, 0));
			});
		}
		expect(heads.fetchMock).toHaveBeenCalledTimes(90);
		expect(heads.most()).toBeLessThanOrEqual(CLASSICY_FIND_LOOKUPS);
	});

	it("draws a window of 2,000 results, and nothing again for a keystroke or an unrelated write", async () => {
		const fs = new ClassicyFileSystem();
		for (let d = 0; d < 20; d += 1) {
			for (let i = 0; i < 100; i += 1) {
				fs.writeFile(`Macintosh HD:Many:dir${d}:alpha ${d}-${i}.txt`, "x", {
					_type: T.TextFile,
				});
			}
		}
		renderDesktop();
		await openFindFile();
		typeName("alpha");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		expect(
			within(resultsWindow() as HTMLElement).getByText("Found 2000 Items"),
		).toBeInTheDocument();
		expect(drawnRows().length).toBeLessThanOrEqual(60);
		await new Promise((resolve) => setTimeout(resolve, 20));
		const before = renders.results;
		// A keystroke in the Find window.
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		typeName("alph");
		typeName("alpha beta");
		// A write elsewhere in the tree.
		act(() => {
			fs.writeFile("Macintosh HD:Elsewhere.txt", "x", { _type: T.TextFile });
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(renders.results).toBe(before);
	});

	it("follows the live tree: a found item that goes leaves, one that changes is drawn anew", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile("Macintosh HD:Notes:zz one.txt", "1", { _type: T.TextFile });
		fs.writeFile("Macintosh HD:Notes:zz two.txt", "2", { _type: T.TextFile });
		renderDesktop();
		await openFindFile();
		typeName("zz");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		const kindOf = (name: string) =>
			within(resultsWindow() as HTMLElement)
				.getAllByText(name)[0]
				.closest("tr")
				?.querySelectorAll("td")[2]?.textContent;
		expect(kindOf("zz one.txt")).toBe("Text file");
		act(() => {
			fs.rmDir("Macintosh HD:Notes:zz two.txt");
		});
		await waitFor(() =>
			expect(
				within(resultsWindow() as HTMLElement).getByText("Found 1 Item"),
			).toBeInTheDocument(),
		);
		// Another item takes the path: its row is drawn from it (M3).
		act(() => {
			fs.rmDir("Macintosh HD:Notes:zz one.txt");
			fs.mkDir("Macintosh HD:Notes:zz one.txt");
		});
		await waitFor(() => expect(kindOf("zz one.txt")).toBe("folder"));
	});

	it("draws no title-bar icon, puts a Trash item under its disk, and drops the selection on a column title's click", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile("Macintosh HD:Junk:zebra trashed.txt", "z", {
			_type: T.TextFile,
		});
		fs.mkDir("Trash");
		fs.move("Macintosh HD:Junk:zebra trashed.txt", "Trash", {
			metadata: { _trashed: true, _trashedFrom: "Macintosh HD:Junk" },
		});
		renderDesktop();
		await openFindFile();
		typeName("zebra");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		for (const win of [findWindow(), resultsWindow()]) {
			expect(win?.querySelector(".classicyWindowTitleBar img")).toBeNull();
		}
		const pane = (resultsWindow() as HTMLElement).querySelector(
			".classicyFindFilePath",
		) as HTMLElement;
		expect(
			Array.from(
				pane.querySelectorAll('[role="option"]'),
				(o) => o.textContent,
			),
		).toEqual(["Macintosh HD", "Trash", "zebra trashed.txt"]);
		fireEvent.click(
			within(resultsWindow() as HTMLElement).getByRole("columnheader", {
				name: /Kind/,
			}),
		);
		await waitFor(() =>
			expect(pane.querySelectorAll('[role="option"]')).toHaveLength(0),
		);
		expect(menuItem("Open Item").disabled).toBe(true);
	});

	it("shows Last Modified on Classicy's clock, as the date rows compare", async () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile("Macintosh HD:Late.txt", "x", {
			_type: T.TextFile,
			_modifiedOn: new Date("2026-11-20T23:30:00.000Z"),
		});
		renderDesktop();
		act(() => {
			dispatch({ type: "ClassicyManagerDateTimeTZSet", tzOffset: "2" });
		});
		await openFindFile();
		typeName("late");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		const row = within(resultsWindow() as HTMLElement)
			.getAllByText("Late.txt")[0]
			.closest("tr") as HTMLElement;
		// 23:30 UTC is 1:30 AM the next day two hours east.
		expect(row.textContent).toContain("1:30");
		expect(row.textContent).toMatch(/Nov 21|11\/21/);
	});
});

describe("Find File's keys, its storage key, its labels", {
	timeout: 60_000,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => {
		cleanup();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
	});

	const press = (code: string) =>
		fireEvent.keyDown(document.body, {
			key: code.slice(-1).toLowerCase(),
			code,
			altKey: true,
		});

	it("answers its Option keys", async () => {
		new ClassicyFileSystem().writeFile("Macintosh HD:Docs:Plan.txt", "p", {
			_type: T.TextFile,
		});
		renderDesktop();
		// ⌥F on the desktop opens it.
		await waitFor(() => expect(menuItem("Find…")).toBeTruthy());
		press("KeyF");
		await waitFor(() => expect(findWindow()).toBeTruthy());
		const rows = () =>
			document.querySelectorAll(".classicyFindFileCriterion").length;
		press("KeyM");
		await waitFor(() => expect(rows()).toBe(2));
		press("KeyR");
		await waitFor(() => expect(rows()).toBe(1));
		typeName("plan.txt");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		// ⌥E with Items Found in front: the Finder shows the folder.
		(document.activeElement as HTMLElement | null)?.blur();
		press("KeyE");
		await waitFor(() =>
			expect(
				getAppWindow(apps()["Finder.app"], "Macintosh HD:Docs")?.focused,
			).toBe(true),
		);
		// ⌥O with Items Found in front opens the result.
		const front = (windowId: string) =>
			act(() => {
				dispatch({
					type: "ClassicyWindowFocus",
					app: { id: FIND_FILE_APP_ID },
					window: { id: windowId },
				});
			});
		front(FIND_FILE_RESULTS_WINDOW_ID);
		press("KeyO");
		await waitFor(() => expect(apps()["SimpleText.app"]?.open).toBe(true));
		// ⌥W closes the Find window, leaving Items Found; ⌥Q quits.
		front(FIND_FILE_WINDOW_ID);
		press("KeyW");
		await waitFor(() =>
			expect(getAppWindow(findFile(), FIND_FILE_WINDOW_ID)?.closed).toBe(true),
		);
		expect(findFile()?.open).toBe(true);
		front(FIND_FILE_RESULTS_WINDOW_ID);
		press("KeyQ");
		await waitFor(() => expect(findFile()?.open).toBe(false));
	});

	it("searches the desktop's own file system, under a storage key of the host's", async () => {
		new ClassicyFileSystem().writeFile("Macintosh HD:Default only.txt", "d", {
			_type: T.TextFile,
		});
		new ClassicyFileSystem("find-file-other-key", {
			"Archive HD": {
				_type: T.Drive,
				"Reel only.txt": { _type: T.TextFile, _data: "r" },
			},
		});
		renderDesktop("find-file-other-key");
		await openFindFile();
		typeName("only");
		clickFind();
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		const results = resultsWindow() as HTMLElement;
		expect(within(results).getByText("Found 1 Item")).toBeInTheDocument();
		expect(
			within(results).getAllByText("Reel only.txt").length,
		).toBeGreaterThan(0);
	});

	it("names the sources' tab, list and column in a host's words", async () => {
		registerClassicyFindSource(
			{
				id: "reels",
				name: "The Reels",
				search: async () => [
					{ name: "Noon news", kind: "reel", open: () => {} },
				],
			},
			{
				labels: {
					tab: "Search Archive",
					sites: "Collections",
					site: "Collection",
				},
			},
		);
		renderDesktop();
		await openFindFile();
		const tab = await screen.findByRole("tab", { name: "Search Archive" });
		fireEvent.mouseDown(tab);
		fireEvent.mouseUp(tab);
		expect(
			within(findWindow() as HTMLElement).getByText("Collections"),
		).toBeInTheDocument();
		fireEvent.change(
			document.getElementById("classicy-find-file-words") as HTMLElement,
			{ target: { value: "news" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		await waitFor(() => expect(resultsWindow()).toBeTruthy());
		expect(
			within(resultsWindow() as HTMLElement).getByRole("columnheader", {
				name: /Collection/,
			}),
		).toBeInTheDocument();
	});

	it("keeps the Find File tab usable while a source is still searching", async () => {
		registerClassicyFindSource({
			id: "hang",
			name: "Hang",
			search: () => new Promise(() => {}),
		});
		renderDesktop();
		await openFindFile();
		const sources = await screen.findByRole("tab", { name: "Search Internet" });
		fireEvent.mouseDown(sources);
		fireEvent.mouseUp(sources);
		fireEvent.change(
			document.getElementById("classicy-find-file-words") as HTMLElement,
			{ target: { value: "x" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		await screen.findByRole("button", { name: "Stop" });
		const files = screen.getByRole("tab", { name: "Find File" });
		fireEvent.mouseDown(files);
		fireEvent.mouseUp(files);
		const field = document.getElementById(
			"classicy-find-file-row-0-value",
		) as HTMLInputElement;
		expect(field.disabled).toBe(false);
		expect(
			within(findWindow() as HTMLElement).getByRole("button", { name: "Find" }),
		).toBeInTheDocument();
	});
});
