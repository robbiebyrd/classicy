// The Apple menu's Recent Applications and Recent Documents (story 0226-a6f):
// where they sit, what they list, what choosing an item does, host sources,
// and that no item's name reaches analytics.
import "@/__tests__/withPlatinum";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyStoreRecentItems } from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
import {
	classicyRecentMenuEntries,
	withClassicyRecentItemsMenuItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItemsMenu";
import {
	readClassicyRecentItemsSourceEntries,
	registerClassicyRecentItemsSource,
	resetClassicyRecentItemsSourcesForTests,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItemsSources";
import "@/SystemFolder/Finder/FinderContext";

// Every analytics call the menu bar makes, to look for names in.
const analytics = vi.hoisted(() => ({
	track: [] as unknown[][],
	page: [] as unknown[][],
}));
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({
			track: (...args: unknown[]) => analytics.track.push(args),
			page: (...args: unknown[]) => analytics.page.push(args),
		}),
	}),
);

const SECRET_DOC = "Secret Plan.txt";
const SECRET_PATH = `Macintosh HD:Documents:${SECRET_DOC}`;
const GONE_PATH = "Macintosh HD:Documents:Gone Memo.txt";

const recent = (
	items: ClassicyStoreRecentItems["items"],
	extra: Partial<ClassicyStoreRecentItems> = {},
): ClassicyStoreRecentItems => ({
	enabled: true,
	counts: { application: 10, document: 10 },
	items,
	...extra,
});

const seed = (recentItems: ClassicyStoreRecentItems) => {
	const state = structuredClone(DefaultAppManagerState);
	const apps = state.System.Manager.Applications.apps;
	for (const [id, name] of [
		["SimpleText.app", "SimpleText"],
		["Calculator.app", "Calculator"],
	]) {
		apps[id] = {
			id,
			name,
			icon: `${id}.png`,
			windows: {},
			open: false,
			data: {},
		};
	}
	state.System.Manager.Applications.fileTypeHandlers[
		ClassicyFileSystemEntryFileType.TextFile
	] = "SimpleText.app";
	state.System.Manager.Desktop.systemMenu.push(
		{
			id: "system_menu_Calculator.app",
			title: "Calculator",
			event: "x",
			eventData: {},
		},
		{
			id: "system_menu_Scrapbook.app",
			title: "Scrapbook",
			event: "x",
			eventData: {},
		},
	);
	state.System.Manager.Desktop.recentItems = recentItems;
	useAppManager.setState(state, true);
};

const appleMenuTitles = () =>
	[
		...document.querySelectorAll<HTMLElement>(
			"#apple-menu > .classicyMenuWrapper > ul > li",
		),
	].map((li) => li.id);

const childTitles = (id: string) =>
	[
		...document.querySelectorAll<HTMLElement>(
			`#${id} > .classicyMenuWrapper > ul > li`,
		),
	].map((li) => li.querySelector("p")?.textContent?.trim());

/** Choose a leaf item: click, finish its flash, then the frame the action
 * waits for. */
const choose = async (id: string) => {
	const item = document.getElementById(id) as HTMLElement;
	fireEvent.mouseOver(item);
	fireEvent.click(item);
	dispatchAnimationEnd(item);
	await act(
		() =>
			new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
	);
};

/** The id of the `listId` submenu's item titled `name`. */
const itemNamed = (listId: string, name: string): string =>
	[
		...document.querySelectorAll<HTMLElement>(
			`#${listId} > .classicyMenuWrapper > ul > li`,
		),
	].find((li) => li.querySelector("p")?.textContent?.trim() === name)?.id ?? "";

const desktop = () => useAppManager.getState().System.Manager.Desktop;

const releases: (() => void)[] = [];

beforeEach(() => {
	analytics.track.length = 0;
	analytics.page.length = 0;
	new ClassicyFileSystem().writeFile(SECRET_PATH, "plans", {
		_type: ClassicyFileSystemEntryFileType.TextFile,
	});
	releases.push(markClassicyAppMounted("Calculator.app"));
});

afterEach(() => {
	cleanup();
	resetClassicyRecentItemsSourcesForTests();
	for (const release of releases.splice(0)) release();
});

describe("the Apple menu's Recent entries", () => {
	it("sit among the Apple menu's items in alphabetical order", () => {
		seed(recent([]));
		render(<ClassicyDesktopMenuBar />);
		expect(appleMenuTitles()).toEqual([
			"about",
			"system_menu_Calculator.app",
			"apple-recent-applications",
			"apple-recent-documents",
			"system_menu_Scrapbook.app",
		]);
	});

	it("are dimmed with no submenu while empty, and gone while tracking is off", () => {
		seed(recent([]));
		render(<ClassicyDesktopMenuBar />);
		const docs = document.getElementById("apple-recent-documents");
		expect(docs).toHaveClass("disabled");
		expect(childTitles("apple-recent-documents")).toEqual([]);
		act(() =>
			dispatch({
				type: "ClassicyDesktopRecentItemsSetEnabled",
				enabled: false,
			}),
		);
		expect(document.getElementById("apple-recent-documents")).toBeNull();
		expect(document.getElementById("apple-recent-applications")).toBeNull();
	});

	it("list the items by name, alphabetically, the newest up to the count", () => {
		seed(
			recent(
				[
					{
						kind: "document",
						path: "Macintosh HD:Zebra.txt",
						name: "Zebra.txt",
						at: 5,
					},
					{
						kind: "document",
						path: "Macintosh HD:apple.txt",
						name: "apple.txt",
						at: 4,
					},
					{
						kind: "document",
						path: "Macintosh HD:Mango.txt",
						name: "Mango.txt",
						at: 3,
					},
					{
						kind: "application",
						appId: "SimpleText.app",
						name: "SimpleText",
						at: 2,
					},
					{
						kind: "application",
						appId: "Calculator.app",
						name: "Calculator",
						at: 1,
					},
				],
				{ counts: { application: 10, document: 10 } },
			),
		);
		render(<ClassicyDesktopMenuBar />);
		expect(childTitles("apple-recent-documents")).toEqual([
			"apple.txt",
			"Mango.txt",
			"Zebra.txt",
		]);
		expect(childTitles("apple-recent-applications")).toEqual([
			"Calculator",
			"SimpleText",
		]);
	});

	it("reopen a document through the Finder's routing", async () => {
		seed(
			recent([
				{ kind: "document", path: SECRET_PATH, name: SECRET_DOC, at: 1 },
			]),
		);
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-documents-0");
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				"SimpleText.app"
			].data?.openFiles,
		).toEqual([SECRET_PATH]);
		expect(desktop().errorDialog).toBeNull();
	});

	it("reopen an application", async () => {
		seed(
			recent([
				{
					kind: "application",
					appId: "Calculator.app",
					name: "Calculator",
					at: 1,
				},
			]),
		);
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-applications-0");
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				"Calculator.app"
			].open,
		).toBe(true);
	});

	it("drop a missing document, with the Finder's alias alert", async () => {
		seed(
			recent([
				{ kind: "document", path: GONE_PATH, name: "Gone Memo.txt", at: 2 },
				{ kind: "document", path: SECRET_PATH, name: SECRET_DOC, at: 1 },
			]),
		);
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-documents-0");
		expect(desktop().errorDialog?.message).toBe(
			"The alias “Gone Memo.txt” could not be opened, because the original item could not be found.",
		);
		expect(desktop().recentItems?.items.map((i) => i.path)).toEqual([
			SECRET_PATH,
		]);
		expect(childTitles("apple-recent-documents")).toEqual([SECRET_DOC]);
	});

	it("drop an application that is no longer installed (not mounted)", async () => {
		seed(
			recent([
				{
					kind: "application",
					appId: "SimpleText.app",
					name: "SimpleText",
					at: 1,
				},
			]),
		);
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-applications-0");
		expect(desktop().errorDialog?.message).toContain("“SimpleText”");
		expect(desktop().recentItems?.items).toEqual([]);
	});
});

describe("host sources", () => {
	it("merge their items with the remembered ones by time, under the same count", async () => {
		seed(
			recent(
				[
					{
						kind: "document",
						path: "Macintosh HD:Old.txt",
						name: "Old.txt",
						at: 10,
					},
					{
						kind: "document",
						path: "Macintosh HD:New.txt",
						name: "New.txt",
						at: 40,
					},
				],
				{ counts: { application: 10, document: 3 } },
			),
		);
		const opened: string[] = [];
		registerClassicyRecentItemsSource({
			id: "pages",
			kind: "document",
			list: () => [
				{ name: "Page C", at: 50, open: () => opened.push("C") },
				{ name: "Page B", at: 30, open: () => opened.push("B") },
				{ name: "Page A", at: new Date(5), open: () => opened.push("A") },
			],
		});
		render(<ClassicyDesktopMenuBar />);
		// The newest three: Page C (50), New.txt (40), Page B (30).
		expect(childTitles("apple-recent-documents")).toEqual([
			"New.txt",
			"Page B",
			"Page C",
		]);
		await choose("apple-recent-documents-2");
		expect(opened).toEqual(["C"]);
	});

	it("follow a source's change and unregistration", () => {
		seed(recent([]));
		let names = ["First"];
		let notify = () => {};
		const unregister = registerClassicyRecentItemsSource({
			id: "live",
			kind: "application",
			list: () => names.map((name, i) => ({ name, at: i, open: () => {} })),
			subscribe: (onChange) => {
				notify = onChange;
				return () => {
					notify = () => {};
				};
			},
		});
		render(<ClassicyDesktopMenuBar />);
		expect(childTitles("apple-recent-applications")).toEqual(["First"]);
		names = ["First", "Second"];
		act(() => notify());
		expect(childTitles("apple-recent-applications")).toEqual([
			"First",
			"Second",
		]);
		act(() => unregister());
		expect(childTitles("apple-recent-applications")).toEqual([]);
	});

	it("a source's item naming a remembered document meets it: the newer use wins", () => {
		const entries = classicyRecentMenuEntries(
			"document",
			recent([
				{ kind: "document", path: "Macintosh HD:A.txt", name: "A.txt", at: 1 },
			]),
			[
				{
					kind: "document",
					sourceId: "s",
					key: "a",
					name: "A (host)",
					at: 9,
					path: "Macintosh HD:A.txt",
				},
			],
		);
		expect(entries.map((e) => e.name)).toEqual(["A (host)"]);
	});

	it("skip bad items and a throwing source, warning once", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		registerClassicyRecentItemsSource({
			id: "bad",
			kind: "document",
			list: () => [
				{ name: "", at: 1, open: () => {} },
				{ name: "No opener", at: 1 },
				{ name: "Fine", at: 2, path: "Macintosh HD:Fine" },
			],
		});
		registerClassicyRecentItemsSource({
			id: "throws",
			kind: "document",
			list: () => {
				throw new Error("nope");
			},
		});
		expect(readClassicyRecentItemsSourceEntries("document")).toEqual([
			expect.objectContaining({ name: "Fine", key: "Macintosh HD:Fine" }),
		]);
		readClassicyRecentItemsSourceEntries("document");
		expect(warn).toHaveBeenCalledTimes(2);
		warn.mockRestore();
	});
});

describe("edge cases (review M4, M7, M8)", () => {
	it("show a remembered app by the name its record holds now", () => {
		seed(
			recent([
				{
					kind: "application",
					appId: "Calculator.app",
					name: "Calculator",
					at: 1,
				},
			]),
		);
		act(() =>
			useAppManager.setState((s) => {
				const next = structuredClone(s);
				next.System.Manager.Applications.apps["Calculator.app"].name =
					"Calculator II";
				return next;
			}),
		);
		render(<ClassicyDesktopMenuBar />);
		expect(childTitles("apple-recent-applications")).toEqual(["Calculator II"]);
	});

	it("show a host's application item by the host's name, even for a known app", () => {
		seed(recent([]));
		registerClassicyRecentItemsSource({
			id: "launcher",
			kind: "application",
			list: () => [{ name: "My Calculator", at: 5, appId: "Calculator.app" }],
		});
		render(<ClassicyDesktopMenuBar />);
		expect(childTitles("apple-recent-applications")).toEqual(["My Calculator"]);
	});

	it("report a host's missing application item as an application, with the alert", async () => {
		const toolPath = "Macintosh HD:Applications:Old Tool";
		// A remembered document at the same path: the application item's
		// miss must not forget it.
		seed(
			recent([{ kind: "document", path: toolPath, name: "Old Tool", at: 1 }]),
		);
		registerClassicyRecentItemsSource({
			id: "launcher",
			kind: "application",
			list: () => [{ name: "Old Tool", at: 5, path: toolPath }],
		});
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-applications-0");
		expect(desktop().errorDialog?.message).toBe(
			"The alias “Old Tool” could not be opened, because the original item could not be found.",
		);
		expect(desktop().recentItems?.items.map((i) => i.path)).toEqual([toolPath]);
	});

	it("survive a host item whose open throws, warning once per throw", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		seed(recent([]));
		registerClassicyRecentItemsSource({
			id: "fragile",
			kind: "document",
			list: () => [
				{
					name: "Fragile Page",
					at: 1,
					open: () => {
						throw new Error("nope");
					},
				},
			],
		});
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-documents-0");
		expect(
			warn.mock.calls.some((call) =>
				String(call[0]).includes("A recent items source's open threw"),
			),
		).toBe(true);
		expect(desktop().errorDialog).toBeNull();
		expect(childTitles("apple-recent-documents")).toEqual(["Fragile Page"]);
		warn.mockRestore();
	});

	it("keep two sources' items that share a key apart", async () => {
		seed(recent([]));
		const opened: string[] = [];
		for (const id of ["one", "two"])
			registerClassicyRecentItemsSource({
				id,
				kind: "document",
				list: () => [
					{
						key: "home",
						name: `Home ${id}`,
						at: 1,
						open: () => opened.push(id),
					},
				],
			});
		render(<ClassicyDesktopMenuBar />);
		expect(childTitles("apple-recent-documents")).toEqual([
			"Home one",
			"Home two",
		]);
		await choose(itemNamed("apple-recent-documents", "Home two"));
		expect(opened).toEqual(["two"]);
	});

	it("refuse a trashed document with the Finder's in-the-trash alert, and keep it (Mac OS 8.1)", async () => {
		new ClassicyFileSystem().writeFile("Trash:Trashed Plan.txt", "x", {
			_type: ClassicyFileSystemEntryFileType.TextFile,
		});
		seed(
			recent([
				{
					kind: "document",
					path: "Trash:Trashed Plan.txt",
					name: "Trashed Plan.txt",
					at: 1,
				},
			]),
		);
		render(<ClassicyDesktopMenuBar />);
		await choose("apple-recent-documents-0");
		expect(desktop().errorDialog?.message).toBe(
			"The alias “Trashed Plan.txt” could not be opened, because the original item is in the trash.",
		);
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				"SimpleText.app"
			].data?.openFiles,
		).toBeUndefined();
		expect(desktop().recentItems?.items.map((i) => i.path)).toEqual([
			"Trash:Trashed Plan.txt",
		]);
		expect(childTitles("apple-recent-documents")).toEqual(["Trashed Plan.txt"]);
	});
});

describe("placement helper", () => {
	it("sorts each group after the About section, the Recent entries in the first", () => {
		const items: ClassicyMenuItem[] = [
			{ id: "about", title: "About This Computer" },
			{ id: "spacer" },
			{ id: "s", title: "Sound Manager" },
			{ id: "a", title: "Alarm Clock" },
			{ id: "spacer" },
			{ id: "z", title: "Zoo" },
			{ id: "h", title: "Host Tool" },
		];
		expect(
			withClassicyRecentItemsMenuItems(items, [
				{ id: "r1", title: "Recent Applications" },
				{ id: "r2", title: "Recent Documents" },
			]).map((i) => i.id),
		).toEqual(["about", "spacer", "a", "r1", "r2", "s", "spacer", "h", "z"]);
	});

	it("keeps a menu with no divider as it is, the entries after it", () => {
		expect(
			withClassicyRecentItemsMenuItems(
				[
					{ id: "b", title: "B" },
					{ id: "a", title: "A" },
				],
				[{ id: "r", title: "Recent Documents" }],
			).map((i) => i.id),
		).toEqual(["b", "a", "r"]);
	});
});

describe("analytics", () => {
	it("no recent item's name reaches a track or pageview payload", async () => {
		seed(
			recent([
				{ kind: "document", path: GONE_PATH, name: "Gone Memo.txt", at: 3 },
				{ kind: "document", path: SECRET_PATH, name: SECRET_DOC, at: 2 },
				{
					kind: "application",
					appId: "Calculator.app",
					name: "Calculator",
					at: 1,
				},
			]),
		);
		registerClassicyRecentItemsSource({
			id: "pages",
			kind: "document",
			list: () => [{ name: "Host Diary", at: 4, open: () => {} }],
		});
		render(<ClassicyDesktopMenuBar />);
		const apple = document.querySelector<HTMLElement>(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.click(apple.querySelector("p") ?? apple);
		for (const id of ["apple-recent-documents", "apple-recent-applications"]) {
			const parent = document.getElementById(id) as HTMLElement;
			fireEvent.mouseEnter(parent);
			fireEvent.mouseOver(parent);
		}
		for (const li of document.querySelectorAll<HTMLElement>(
			"[id^='apple-recent-'] > .classicyMenuWrapper li",
		)) {
			fireEvent.mouseOver(li);
			fireEvent.focus(li);
		}
		// Choose each: the host page, the document, the missing document.
		for (const name of ["Host Diary", SECRET_DOC, "Gone Memo.txt"]) {
			await choose(itemNamed("apple-recent-documents", name));
		}
		await choose(itemNamed("apple-recent-applications", "Calculator"));
		// The hover events did run, so the payloads were there to inspect.
		expect(
			analytics.track.some(
				([, payload]) =>
					(payload as { id?: string })?.id === "apple-recent-documents-1",
			),
		).toBe(true);
		const sent = JSON.stringify([analytics.track, analytics.page]);
		for (const name of [
			SECRET_DOC,
			"Secret Plan",
			"Gone Memo",
			"Host Diary",
			"Documents:",
		]) {
			expect(sent).not.toContain(name);
		}
		// The parents' own titles are not user data.
		expect(sent).toContain("Recent Documents");
	});
});
