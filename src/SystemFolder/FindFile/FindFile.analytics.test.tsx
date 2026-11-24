// What a user searches for is theirs (story 0227-815): the words typed in
// Find File's fields, and what it finds, never reach an analytics payload.
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
import {
	listClassicyFindSources,
	registerClassicyFindSource,
	unregisterClassicyFindSource,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

const analytics = vi.hoisted(() => ({
	track: [] as unknown[][],
	page: [] as unknown[][],
}));
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({
			track: (...args: unknown[]) => analytics.track.push(args),
			page: (...args: unknown[]) => analytics.page.push(args),
		}),
	}),
);

const SECRET = "Quarterly Secret";

describe("Find File and analytics", { timeout: 30_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		analytics.track.length = 0;
		analytics.page.length = 0;
		new ClassicyFileSystem().writeFile(
			`Macintosh HD:Documents:${SECRET}.txt`,
			"x",
			{ _type: ClassicyFileSystemEntryFileType.TextFile },
		);
	});

	afterEach(() => {
		cleanup();
		for (const s of listClassicyFindSources())
			unregisterClassicyFindSource(s.id);
	});

	it("sends no search words, and no name found, in a track or pageview payload", async () => {
		registerClassicyFindSource({
			id: "archive",
			name: "Archive",
			search: async () => [
				{ name: `${SECRET} memo`, kind: "page", open: () => {} },
			],
		});
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		await screen.findByText("Find items");
		fireEvent.change(
			document.getElementById("classicy-find-file-row-0-value") as HTMLElement,
			{ target: { value: SECRET } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Find" }));
		await waitFor(() =>
			expect(screen.getByText("Items Found")).toBeInTheDocument(),
		);
		const tab = screen.getByRole("tab", { name: "Search Internet" });
		fireEvent.mouseDown(tab);
		fireEvent.mouseUp(tab);
		fireEvent.change(
			document.getElementById("classicy-find-file-words") as HTMLElement,
			{ target: { value: SECRET } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		const results = screen
			.getByText("Items Found")
			.closest(".classicyWindow") as HTMLElement;
		await waitFor(() =>
			expect(
				within(results).getAllByText(`${SECRET} memo`).length,
			).toBeGreaterThan(0),
		);
		// The fields' changes were tracked, without their text.
		expect(
			analytics.track.some(
				([event, payload]) =>
					event === "selected" &&
					(payload as { id?: string }).id === "classicy-find-file-words",
			),
		).toBe(true);
		const sent = JSON.stringify([analytics.track, analytics.page]);
		expect(sent).not.toContain("Quarterly");
	});

	it("names no item or disk from Open Item, Open Enclosing Folder, the refusal alert, the Label menu or the location pop-up", async () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir("Macintosh HD:Hidden Place");
		fs.setMetadata("Macintosh HD:Hidden Place", { _invisible: true });
		fs.writeFile(`Macintosh HD:Hidden Place:${SECRET} draft.txt`, "x", {
			_type: ClassicyFileSystemEntryFileType.TextFile,
		});
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		await screen.findByText("Find items");
		// The location pop-up: its choices name the disks.
		fireEvent.click(
			document.getElementById("classicy-find-file-location") as HTMLElement,
		);
		fireEvent.click(
			within(await screen.findByRole("listbox")).getByText("on “Macintosh HD”"),
		);
		fireEvent.change(
			document.getElementById("classicy-find-file-row-0-value") as HTMLElement,
			{ target: { value: SECRET } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Find" }));
		await waitFor(() =>
			expect(screen.getByText("Items Found")).toBeInTheDocument(),
		);
		const menu = (title: string) => {
			const walk = (
				items: { title?: string; menuChildren?: unknown[] }[] = [],
			): { onClickFunc?: () => void } | undefined => {
				for (const item of items) {
					if (item.title === title) return item as { onClickFunc?: () => void };
					const found = walk(
						item.menuChildren as { title?: string; menuChildren?: unknown[] }[],
					);
					if (found) return found;
				}
				return undefined;
			};
			return walk(
				useAppManager.getState().System.Manager.Desktop.appMenu as {
					title?: string;
				}[],
			);
		};
		const choose = (title: string) =>
			act(() => {
				menu(title)?.onClickFunc?.();
			});
		// The first result, by name: "Quarterly Secret draft.txt", the
		// invisible one; the Label menu labels it, the refusal names it.
		choose("Hot");
		choose("Open Enclosing Folder");
		await screen.findByText(/Unable to open enclosing folder for/);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		// The second: opened, then shown in its folder.
		const front = () =>
			act(() => {
				dispatch({
					type: "ClassicyWindowFocus",
					app: { id: "FindFile.app" },
					window: { id: "FindFile.app_results" },
				});
			});
		front();
		const results = screen
			.getByText("Items Found")
			.closest(".classicyWindow") as HTMLElement;
		fireEvent.click(within(results).getAllByText(`${SECRET}.txt`)[0]);
		choose("Open Item");
		const apps = () =>
			useAppManager.getState().System.Manager.Applications.apps;
		await waitFor(() => expect(apps()["SimpleText.app"]?.open).toBe(true));
		front();
		choose("Open Enclosing Folder");
		await waitFor(() =>
			expect(
				(apps()["Finder.app"]?.data as { openPaths?: string[] }).openPaths,
			).toContain("Macintosh HD:Documents"),
		);
		// No track payload, and no pageview path, names the item; the
		// location's event names no disk.
		expect(JSON.stringify(analytics.track)).not.toContain("Quarterly");
		expect(analytics.page.map(([path]) => path).join("\n")).not.toContain(
			"Quarterly",
		);
		const location = analytics.track.filter(
			([event, payload]) =>
				event === "selected" &&
				(payload as { id?: string }).id === "classicy-find-file-location",
		);
		expect(location).toEqual([
			[
				"selected",
				{
					type: "ClassicyPopUpMenu",
					id: "classicy-find-file-location",
					label: undefined,
				},
			],
		]);
		// A window's title reaches its pageview (the repo-wide trade-off,
		// CLAUDE.md "Analytics"): only the opened document's, which a Finder
		// double-click sends the same way, never one of Find File's own.
		const titled = analytics.page.filter(([, title]) =>
			String(title).includes("Quarterly"),
		);
		expect(titled.map(([path]) => path)).toEqual(["/simpletext/file"]);
	});

	it("keeps an analyticsPrivate field's text out, and a plain field's in", () => {
		render(
			<>
				<ClassicyInput id="private" analyticsPrivate prefillValue="hidden" />
				<ClassicyInput id="plain" />
			</>,
		);
		fireEvent.change(document.getElementById("private") as HTMLElement, {
			target: { value: "my words" },
		});
		fireEvent.change(document.getElementById("plain") as HTMLElement, {
			target: { value: "shown" },
		});
		const sent = JSON.stringify(analytics.track);
		expect(sent).not.toContain("my words");
		expect(sent).not.toContain("hidden");
		expect(sent).toContain("shown");
	});
});
