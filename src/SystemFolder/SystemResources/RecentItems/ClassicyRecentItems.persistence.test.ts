// Recent Items survive a reload (story 0226-a6f), as the Mac kept its Recent
// folders across restarts: each test boots a fresh module graph from what the
// last one saved to localStorage, as a page load does.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const KEY = "classicyDesktopState";

const boot = async (saved?: string) => {
	vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, saved);
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	return store;
};

const recentItems = (store: {
	useAppManager: { getState: () => ClassicyStore };
}) => store.useAppManager.getState().System.Manager.Desktop.recentItems;

afterEach(() => {
	localStorage.clear();
	vi.resetModules();
});

describe("Recent Items across a reload", () => {
	it("keeps the items, the counts and the switch", async () => {
		const first = await boot();
		first.useAppManager.setState((s: ClassicyStore) => {
			const next = structuredClone(s);
			next.System.Manager.Applications.apps["SimpleText.app"] = {
				id: "SimpleText.app",
				name: "SimpleText",
				icon: "",
				windows: {},
				open: false,
				data: {},
			};
			next.System.Manager.Applications.fileTypeHandlers.text_file =
				"SimpleText.app";
			return next;
		});
		// SimpleText really there, and the document a file (this graph's).
		const mounted = await import(
			"@/SystemFolder/SystemResources/App/ClassicyMountedApps"
		);
		const unmount = mounted.markClassicyAppMounted("SimpleText.app");
		const files = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystem"
		);
		new files.ClassicyFileSystem().writeFile("Macintosh HD:Notes:Plan.txt", "");
		first.dispatch({
			type: "ClassicyDesktopRecentItemsSetCount",
			kind: "application",
			count: 4,
		});
		first.dispatch({
			type: "ClassicyAppSimpleTextOpenFile",
			app: { id: "SimpleText.app" },
			path: "Macintosh HD:Notes:Plan.txt",
		});
		unmount();
		const before = recentItems(first);
		expect(before?.items.map((i: { name: string }) => i.name)).toEqual([
			"Plan.txt",
			"SimpleText",
		]);
		// What the persistence subscription writes.
		const saved = JSON.stringify(
			first.sanitizeStateForPersistence(first.useAppManager.getState()),
		);

		const second = await boot(saved);
		expect(recentItems(second)).toEqual(before);
		expect(recentItems(second)?.counts.application).toBe(4);
	});

	it("gives a state saved before Recent Items existed the defaults", async () => {
		const first = await boot();
		const old = JSON.parse(
			JSON.stringify(
				first.sanitizeStateForPersistence(first.useAppManager.getState()),
			),
		);
		delete old.System.Manager.Desktop.recentItems;
		const second = await boot(JSON.stringify(old));
		expect(recentItems(second)).toEqual({
			enabled: true,
			counts: { application: 10, document: 10 },
			items: [],
		});
	});
});
