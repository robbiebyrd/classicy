// Story 0226-a6f, fix round 2 (R1, R2, N1): quitting an app closes its
// documents, and what a later launch shows. Whole-desktop tests: every window
// record left open must be a window on screen.
import "@/__tests__/withPlatinum";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
// Side effects: the bundled apps' reducers, as the package barrel loads them.
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import "@/SystemFolder/PDFViewer/PDFViewerContext";

const READ_ME = "Macintosh HD:Documents:Read Me.txt";
const NOTES = "Macintosh HD:Documents:Notes.txt";

const apps = () => useAppManager.getState().System.Manager.Applications.apps;

/** Window records marked open with nothing on screen (`${appId}_${id}`). */
const phantomWindows = (): string[] =>
	Object.values(apps()).flatMap((app) =>
		listAppWindows(app)
			.filter((w) => !w.closed && !document.getElementById(`${app.id}_${w.id}`))
			.map((w) => `${app.id}:${w.id}`),
	);

const onScreen = (appId: string, windowId: string): boolean =>
	document.getElementById(`${appId}_${windowId}`) !== null;

const focusedWindow = (appId: string): string | undefined =>
	listAppWindows(apps()[appId]).find((w) => w.focused && !w.closed)?.id;

const send = (action: ActionMessage) =>
	act(() => {
		dispatch(action);
	});

const launch = (id: string, name = id) =>
	send({ type: "ClassicyAppOpen", app: { id, name, icon: "" } });

const quit = (id: string) => send({ type: "ClassicyAppClose", app: { id } });

/** A host app on the kernel's generic queue: a main window, and ClassicyApp's own window for each queued document. */
const HostApp = () => (
	<ClassicyApp
		id="Host.app"
		name="Host"
		icon=""
		handlesFileTypes={[ClassicyFileSystemEntryFileType.TextFile]}
	>
		<ClassicyWindow
			id="host_main"
			title="Host"
			appId="Host.app"
			initialSize={[200, 100]}
			initialPosition={[10, 40]}
		>
			<span>main</span>
		</ClassicyWindow>
	</ClassicyApp>
);

/**
 * A host app drawing its own document windows, under ids of its own (not
 * `${id}_file_${path}`, not ending with the path), that never dispatches
 * CloseFile: a closed document stays queued, its window mounted and closed.
 */
const OwnIdsApp = () => {
	const files = useAppManager(
		(s) => s.System.Manager.Applications.apps["OwnIds.app"]?.data?.openFiles,
	);
	const queued: string[] = Array.isArray(files) ? files : [];
	return (
		<ClassicyApp
			id="OwnIds.app"
			name="OwnIds"
			icon=""
			handlesOwnFiles={true}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.TextFile]}
		>
			{queued.map((path, index) => (
				<ClassicyWindow
					key={path}
					id={`own-doc-${index}`}
					title={path.split(":").pop()}
					appId="OwnIds.app"
					initialSize={[200, 100]}
					initialPosition={[20, 60]}
				>
					<span>{path}</span>
				</ClassicyWindow>
			))}
		</ClassicyApp>
	);
};

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false}>
				<HostApp />
				<OwnIdsApp />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const INTEGRATION_TIMEOUT_MS = 20_000;

describe("relaunching an app after Quit (story 0226-a6f)", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("Movie Player: a relaunch shows the demo again, and no record is open without its window", async () => {
		renderDesktop();
		launch("MoviePlayer.app", "Movie Player");
		await waitFor(() => {
			expect(
				listAppWindows(apps()["MoviePlayer.app"]).some((w) => !w.closed),
			).toBe(true);
		});
		send({
			type: "ClassicyAppMoviePlayerOpenDocument",
			document: { url: "https://example.com/clip.mp4", name: "Clip" },
		});
		await waitFor(() => {
			expect(
				listAppWindows(apps()["MoviePlayer.app"]).filter((w) => !w.closed),
			).toHaveLength(2);
		});

		quit("MoviePlayer.app");
		expect(phantomWindows()).toEqual([]);

		launch("MoviePlayer.app", "Movie Player");
		// At once, not only once things settle: no record open with nothing
		// on screen, none focused.
		expect(phantomWindows()).toEqual([]);
		await waitFor(() => {
			const open = listAppWindows(apps()["MoviePlayer.app"]).filter(
				(w) => !w.closed,
			);
			// The demo, alone: the clip the quit closed stays closed.
			expect(open).toHaveLength(1);
			expect(open[0].id).not.toContain("clip.mp4");
			expect(focusedWindow("MoviePlayer.app")).toBe(open[0].id);
		});
		expect(phantomWindows()).toEqual([]);
	});

	it("Picture Viewer: a relaunch shows the sample picture again", async () => {
		renderDesktop();
		launch("PictureViewer.app", "Picture Viewer");
		await waitFor(() => {
			expect(
				listAppWindows(apps()["PictureViewer.app"]).some((w) => !w.closed),
			).toBe(true);
		});
		quit("PictureViewer.app");
		expect(phantomWindows()).toEqual([]);

		launch("PictureViewer.app", "Picture Viewer");
		expect(phantomWindows()).toEqual([]);
		await waitFor(() => {
			const open = listAppWindows(apps()["PictureViewer.app"]).filter(
				(w) => !w.closed,
			);
			expect(open).toHaveLength(1);
			expect(focusedWindow("PictureViewer.app")).toBe(open[0].id);
		});
		expect(phantomWindows()).toEqual([]);
	});

	it("PDF Viewer: a relaunch with no document asks for one (its Open dialog)", async () => {
		renderDesktop();
		send({
			type: "ClassicyAppPDFViewerOpenFile",
			app: { id: "PDFViewer.app" },
			path: "Macintosh HD:Documents:Guide.pdf",
		});
		await waitFor(() => {
			expect(
				onScreen(
					"PDFViewer.app",
					"PDFViewer.app_file_Macintosh HD:Documents:Guide.pdf",
				),
			).toBe(true);
		});
		quit("PDFViewer.app");
		expect(phantomWindows()).toEqual([]);

		launch("PDFViewer.app", "PDF Viewer");
		expect(phantomWindows()).toEqual([]);
		await waitFor(() => {
			expect(onScreen("PDFViewer.app", "PDFViewer.app_open_dialog")).toBe(true);
		});
		expect(
			getAppWindow(
				apps()["PDFViewer.app"],
				"PDFViewer.app_file_Macintosh HD:Documents:Guide.pdf",
			)?.closed,
		).toBe(true);
		expect(phantomWindows()).toEqual([]);
	});

	it("a host app on the generic queue: a relaunch shows its main window, not the documents the quit closed", async () => {
		renderDesktop();
		launch("Host.app", "Host");
		send({
			type: "ClassicyAppHostOpenFile",
			app: { id: "Host.app" },
			path: READ_ME,
		});
		await waitFor(() => {
			expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true);
		});

		quit("Host.app");
		expect(phantomWindows()).toEqual([]);

		launch("Host.app", "Host");
		expect(phantomWindows()).toEqual([]);
		await waitFor(() => {
			expect(onScreen("Host.app", "host_main")).toBe(true);
			expect(focusedWindow("Host.app")).toBe("host_main");
		});
		expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(false);
		expect(phantomWindows()).toEqual([]);
	});

	describe("a document open after a quit shows only the document (N1)", () => {
		it("keeps the main window closed", async () => {
			renderDesktop();
			launch("Host.app", "Host");
			await waitFor(() => expect(onScreen("Host.app", "host_main")).toBe(true));
			quit("Host.app");

			send({
				type: "ClassicyAppHostOpenFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			await waitFor(() => {
				expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true);
				expect(focusedWindow("Host.app")).toBe(`Host.app_file_${READ_ME}`);
			});
			expect(onScreen("Host.app", "host_main")).toBe(false);
			expect(getAppWindow(apps()["Host.app"], "host_main")?.closed).toBe(true);
			expect(phantomWindows()).toEqual([]);
			// The launch is over: the next plain open brings the main window back.
			expect(apps()["Host.app"].launchedFor).toBeUndefined();
			launch("Host.app", "Host");
			await waitFor(() => expect(onScreen("Host.app", "host_main")).toBe(true));
		});

		it("keeps closed a main window the user closed before the quit", async () => {
			renderDesktop();
			launch("Host.app", "Host");
			await waitFor(() => expect(onScreen("Host.app", "host_main")).toBe(true));
			send({
				type: "ClassicyWindowClose",
				app: { id: "Host.app" },
				window: { id: "host_main" },
			});
			quit("Host.app");

			send({
				type: "ClassicyAppHostOpenFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true),
			);
			expect(onScreen("Host.app", "host_main")).toBe(false);
			expect(focusedWindow("Host.app")).toBe(`Host.app_file_${READ_ME}`);
		});

		it("holds for the first launch too, by a document", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppHostOpenFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true),
			);
			expect(onScreen("Host.app", "host_main")).toBe(false);
			expect(phantomWindows()).toEqual([]);
		});

		it("shows Movie Player's document alone, not the demo", async () => {
			renderDesktop();
			launch("MoviePlayer.app", "Movie Player");
			await waitFor(() =>
				expect(
					listAppWindows(apps()["MoviePlayer.app"]).some((w) => !w.closed),
				).toBe(true),
			);
			quit("MoviePlayer.app");
			send({
				type: "ClassicyAppMoviePlayerOpenDocument",
				document: { url: "https://example.com/clip.mp4", name: "Clip" },
			});
			await waitFor(() => {
				const open = listAppWindows(apps()["MoviePlayer.app"]).filter(
					(w) => !w.closed,
				);
				expect(open.map((w) => w.id)).toEqual([
					"MoviePlayer.app_MoviePlayer_https://example.com/clip.mp4",
				]);
			});
			expect(phantomWindows()).toEqual([]);
		});
	});

	describe("a host drawing its own document windows (R2)", () => {
		it("reopens a closed document whose window has an id of its own", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppOwnIdsOpenFile",
				app: { id: "OwnIds.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("OwnIds.app", "own-doc-0")).toBe(true),
			);
			send({
				type: "ClassicyWindowClose",
				app: { id: "OwnIds.app" },
				window: { id: "own-doc-0" },
			});
			expect(onScreen("OwnIds.app", "own-doc-0")).toBe(false);

			send({
				type: "ClassicyAppOwnIdsOpenFile",
				app: { id: "OwnIds.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("OwnIds.app", "own-doc-0")).toBe(true),
			);
			expect(phantomWindows()).toEqual([]);
		});

		it("shows its document after a quit, its window's id unknown to the kernel", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppOwnIdsOpenFile",
				app: { id: "OwnIds.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("OwnIds.app", "own-doc-0")).toBe(true),
			);
			quit("OwnIds.app");
			send({
				type: "ClassicyAppOwnIdsOpenFile",
				app: { id: "OwnIds.app" },
				path: NOTES,
			});
			await waitFor(() =>
				expect(onScreen("OwnIds.app", "own-doc-0")).toBe(true),
			);
			expect(phantomWindows()).toEqual([]);
		});

		it("reopens only that document's window under the documented id", async () => {
			renderDesktop();
			launch("Host.app", "Host");
			send({
				type: "ClassicyAppHostOpenFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true),
			);
			const user = userEvent.setup({ delay: null });
			// Close the main window, then the document (its CloseFile empties
			// the queue), then open the document again.
			send({
				type: "ClassicyWindowClose",
				app: { id: "Host.app" },
				window: { id: "host_main" },
			});
			send({
				type: "ClassicyWindowClose",
				app: { id: "Host.app" },
				window: { id: `Host.app_file_${READ_ME}` },
			});
			send({
				type: "ClassicyAppHostCloseFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(false);
			send({
				type: "ClassicyAppHostOpenFile",
				app: { id: "Host.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("Host.app", `Host.app_file_${READ_ME}`)).toBe(true),
			);
			expect(onScreen("Host.app", "host_main")).toBe(false);
			expect(focusedWindow("Host.app")).toBe(`Host.app_file_${READ_ME}`);
			void user;
		});
	});
});
