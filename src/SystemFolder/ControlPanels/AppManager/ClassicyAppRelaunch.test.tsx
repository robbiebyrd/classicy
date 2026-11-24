// Story 0226-a6f, fix round 2 (R1, R2, N1): quitting an app closes its
// documents, and what a later launch shows. Whole-desktop tests: every window
// record left open must be a window on screen.
import "@/__tests__/withPlatinum";
import {
	act,
	fireEvent,
	render,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
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
import "@/SystemFolder/HyperCard/HyperCardContext";
import "@/SystemFolder/HyperCard/Editor/HyperCardEditorContext";
import type { HCStack } from "@/SystemFolder/HyperCard/HyperCardModel";

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

/**
 * A host that opens documents by its own action, as §11 tells it to
 * (`openApp(…, { document })`), into one window of its own: the launch names
 * no window the kernel can match (re-review 2, A3).
 */
registerApp({
	id: "DocHost.app",
	description: "Shows one document at a time.",
	prefix: "ClassicyAppDocHost",
	handler: (ds, action) => {
		if (
			action.type === "ClassicyAppDocHostShow" &&
			typeof action.path === "string"
		) {
			const app = ds.System.Manager.Applications.apps["DocHost.app"];
			if (app) app.data = { ...(app.data ?? {}), current: action.path };
			openApp(ds, "DocHost.app", "DocHost", "", { document: action.path });
		}
		return ds;
	},
	actions: {
		ClassicyAppDocHostShow: { description: "Show a document." },
	},
});

/** DocHost with a palette beside its own window (re-review 3, B1, T3). */
registerApp({
	id: "PalHost.app",
	description: "Shows one document at a time, with a palette.",
	prefix: "ClassicyAppPalHost",
	handler: (ds, action) => {
		if (
			action.type === "ClassicyAppPalHostShow" &&
			typeof action.path === "string"
		)
			openApp(ds, "PalHost.app", "PalHost", "", { document: action.path });
		return ds;
	},
	actions: {
		ClassicyAppPalHostShow: { description: "Show a document." },
	},
});

const PalHostApp = () => (
	<ClassicyApp id="PalHost.app" name="PalHost" icon="">
		<ClassicyWindow
			id="pal_main"
			title="PalHost"
			appId="PalHost.app"
			initialSize={[200, 100]}
			initialPosition={[60, 120]}
		>
			<span>current document</span>
		</ClassicyWindow>
		<ClassicyWindow
			id="pal_tools"
			title="Tools"
			appId="PalHost.app"
			windowType="utility"
			initialSize={[100, 100]}
			initialPosition={[300, 120]}
		>
			<span>tools</span>
		</ClassicyWindow>
	</ClassicyApp>
);

const DocHostApp = () => (
	<ClassicyApp id="DocHost.app" name="DocHost" icon="">
		<ClassicyWindow
			id="dochost_main"
			title="DocHost"
			appId="DocHost.app"
			initialSize={[200, 100]}
			initialPosition={[30, 80]}
		>
			<span>current document</span>
		</ClassicyWindow>
	</ClassicyApp>
);

/** A `handlesOwnFiles` host that follows the convention, with a main window too (re-review 2, X15). */
const ConvHostApp = () => {
	const files = useAppManager(
		(s) => s.System.Manager.Applications.apps["ConvHost.app"]?.data?.openFiles,
	);
	const queued: string[] = Array.isArray(files) ? files : [];
	return (
		<ClassicyApp
			id="ConvHost.app"
			name="ConvHost"
			icon=""
			handlesOwnFiles={true}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.TextFile]}
		>
			<ClassicyWindow
				id="conv_main"
				title="ConvHost"
				appId="ConvHost.app"
				initialSize={[200, 100]}
				initialPosition={[40, 90]}
			>
				<span>main</span>
			</ClassicyWindow>
			{queued.map((path) => (
				<ClassicyWindow
					key={path}
					id={`ConvHost.app_file_${path}`}
					title={path.split(":").pop()}
					appId="ConvHost.app"
					initialSize={[200, 100]}
					initialPosition={[50, 100]}
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
				<DocHostApp />
				<ConvHostApp />
				<PalHostApp />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const welcomeStack: HCStack = {
	name: "Welcome",
	stackScript: {
		onOpenStack: [{ do: "answer", message: "Welcome", buttons: ["Yes", "No"] }],
	},
	cards: [{ id: "c1", name: "One" }],
};
const plainStack: HCStack = {
	name: "Plain",
	cards: [{ id: "c1", name: "One" }],
};

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

	it("Movie Player: a Quit and a relaunch in one tick still load the sample (re-review 2, M2)", async () => {
		renderDesktop();
		launch("MoviePlayer.app", "Movie Player");
		await waitFor(() =>
			expect(
				listAppWindows(apps()["MoviePlayer.app"]).some((w) => !w.closed),
			).toBe(true),
		);
		act(() => {
			dispatch({ type: "ClassicyAppClose", app: { id: "MoviePlayer.app" } });
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "MoviePlayer.app", name: "Movie Player", icon: "" },
			});
		});
		await waitFor(() => {
			const open = listAppWindows(apps()["MoviePlayer.app"]).filter(
				(w) => !w.closed,
			);
			expect(open).toHaveLength(1);
			expect(onScreen("MoviePlayer.app", open[0].id)).toBe(true);
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

		it("holds for a handlesOwnFiles host's first launch by a document (X15)", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppConvHostOpenFile",
				app: { id: "ConvHost.app" },
				path: READ_ME,
			});
			await waitFor(() =>
				expect(onScreen("ConvHost.app", `ConvHost.app_file_${READ_ME}`)).toBe(
					true,
				),
			);
			expect(onScreen("ConvHost.app", "conv_main")).toBe(false);
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

	describe("a document launch never holds a dialog or a palette (re-review 2, A1)", () => {
		it("shows the answer dialog a stack's onOpenStack asks, HyperCard closed", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppHyperCardOpenStack",
				stackId: "welcome",
				stack: welcomeStack,
			});
			await waitFor(() => {
				expect(onScreen("HyperCard.app", "hypercard_main")).toBe(true);
				expect(onScreen("HyperCard.app", "hypercard_dialog")).toBe(true);
			});
			expect(phantomWindows()).toEqual([]);
		});

		it("shows the Tools and Info palettes of an edit session that survived Quit", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppHyperCardOpenStack",
				stackId: "plain",
				stack: plainStack,
			});
			send({ type: "ClassicyAppHCEditEnter", stackId: "plain" });
			await waitFor(() => {
				expect(onScreen("HyperCard.app", "hypercard_tools")).toBe(true);
				expect(onScreen("HyperCard.app", "hypercard_inspector")).toBe(true);
			});
			quit("HyperCard.app");
			const data = apps()["HyperCard.app"].data as {
				edits?: Record<string, unknown>;
			};
			expect(Object.keys(data.edits ?? {})).toEqual(["plain"]);
			expect(phantomWindows()).toEqual([]);

			send({
				type: "ClassicyAppHyperCardOpenStack",
				stackId: "plain",
				stack: plainStack,
			});
			await waitFor(() => {
				expect(onScreen("HyperCard.app", "hypercard_main")).toBe(true);
				expect(onScreen("HyperCard.app", "hypercard_tools")).toBe(true);
				expect(onScreen("HyperCard.app", "hypercard_inspector")).toBe(true);
			});
			expect(phantomWindows()).toEqual([]);
		});
	});

	describe("a document launch that opens no window fails open (re-review 2, A3)", () => {
		const show = (path: string) =>
			send({
				type: "ClassicyAppDocHostShow",
				app: { id: "DocHost.app" },
				path,
			});

		it("shows the host's own window on a first launch by a document", async () => {
			renderDesktop();
			show(READ_ME);
			await waitFor(() => {
				expect(onScreen("DocHost.app", "dochost_main")).toBe(true);
				expect(focusedWindow("DocHost.app")).toBe("dochost_main");
			});
			expect(apps()["DocHost.app"].launchedFor).toBeUndefined();
			expect(phantomWindows()).toEqual([]);
		});

		it("shows it on a relaunch by a document after Quit", async () => {
			renderDesktop();
			show(READ_ME);
			await waitFor(() =>
				expect(onScreen("DocHost.app", "dochost_main")).toBe(true),
			);
			quit("DocHost.app");
			expect(onScreen("DocHost.app", "dochost_main")).toBe(false);
			show(NOTES);
			await waitFor(() => {
				expect(onScreen("DocHost.app", "dochost_main")).toBe(true);
				expect(focusedWindow("DocHost.app")).toBe("dochost_main");
			});
			expect(phantomWindows()).toEqual([]);
		});

		// Re-review 3, B1: a palette (or a dialog) that opened with the launch
		// is not the app's window opening.
		it("shows the host's own window beside a palette, on a first launch and a relaunch", async () => {
			const showPal = (path: string) =>
				send({
					type: "ClassicyAppPalHostShow",
					app: { id: "PalHost.app" },
					path,
				});
			renderDesktop();
			showPal(READ_ME);
			await waitFor(() => {
				expect(onScreen("PalHost.app", "pal_main")).toBe(true);
				expect(onScreen("PalHost.app", "pal_tools")).toBe(true);
			});
			expect(phantomWindows()).toEqual([]);
			quit("PalHost.app");
			showPal(NOTES);
			await waitFor(() => {
				expect(onScreen("PalHost.app", "pal_main")).toBe(true);
				expect(onScreen("PalHost.app", "pal_tools")).toBe(true);
				expect(focusedWindow("PalHost.app")).toBe("pal_main");
			});
			expect(phantomWindows()).toEqual([]);
		});

		it("still holds a main window when the document's own window opened", async () => {
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
		});
	});

	// Story 0226-a6f quit PDF Viewer whenever it had no document (re-review
	// 2, A2), because an app with no window had no menu bar to quit it
	// from; with windowless menus (story 0233-c79) it keeps running, as a
	// Mac application with every window closed does (re-review 3, N4).
	describe("PDF Viewer with no document keeps running, its menus in the bar", () => {
		const PDF = "PDFViewer.app";
		const GUIDE = "Macintosh HD:Documents:Guide.pdf";
		const dialog = () =>
			document.getElementById(
				`${PDF}_${PDF}_open_dialog`,
			) as HTMLElement | null;
		const cancelDialog = () =>
			act(() => {
				fireEvent.click(within(dialog() as HTMLElement).getByText("Cancel"));
			});
		const savedOpen = () =>
			sanitizeStateForPersistence(useAppManager.getState()).System.Manager
				.Applications.apps[PDF]?.open;
		const barItem = (id: string) =>
			(useAppManager.getState().System.Manager.Desktop.appMenu ?? [])
				.flatMap((m) => m.menuChildren ?? [])
				.find((item) => item.id === id);

		it("keeps running on Cancel in its Open dialog, with File ▸ Open… and Quit, on a launch and a relaunch", async () => {
			renderDesktop();
			launch(PDF, "PDF Viewer");
			await waitFor(() => expect(dialog()).not.toBeNull());
			cancelDialog();
			await waitFor(() => expect(dialog()).toBeNull());
			expect(apps()[PDF].open).toBe(true);
			expect(savedOpen()).toBe(true);
			expect(phantomWindows()).toEqual([]);
			await waitFor(() => expect(barItem(`${PDF}_open`)).toBeDefined());
			expect(barItem(`${PDF}_quit`)).toBeDefined();

			// File ▸ Open… asks again.
			act(() => barItem(`${PDF}_open`)?.onClickFunc?.());
			await waitFor(() => expect(dialog()).not.toBeNull());
			cancelDialog();
			await waitFor(() => expect(dialog()).toBeNull());

			// Quit, and a relaunch asks again.
			quit(PDF);
			expect(apps()[PDF].open).toBe(false);
			launch(PDF, "PDF Viewer");
			await waitFor(() => expect(dialog()).not.toBeNull());
			cancelDialog();
			await waitFor(() => expect(dialog()).toBeNull());
			expect(apps()[PDF].open).toBe(true);
		});

		it("keeps running when its last document closes, and asks for one when opened again", async () => {
			renderDesktop();
			send({
				type: "ClassicyAppPDFViewerOpenFile",
				app: { id: PDF },
				path: GUIDE,
			});
			await waitFor(() =>
				expect(onScreen(PDF, `${PDF}_file_${GUIDE}`)).toBe(true),
			);
			send({
				type: "ClassicyWindowClose",
				app: { id: PDF },
				window: { id: `${PDF}_file_${GUIDE}` },
			});
			send({
				type: "ClassicyAppPDFViewerCloseFile",
				app: { id: PDF },
				path: GUIDE,
			});
			await waitFor(() => expect(barItem(`${PDF}_open`)).toBeDefined());
			expect(apps()[PDF].open).toBe(true);
			expect(dialog()).toBeNull();
			expect(phantomWindows()).toEqual([]);

			// Opened again with no window (Finder 8's reopen, TN1102): as a
			// launch, it asks for a document; the closed one stays closed.
			launch(PDF, "PDF Viewer");
			await waitFor(() => expect(dialog()).not.toBeNull());
			expect(getAppWindow(apps()[PDF], `${PDF}_file_${GUIDE}`)?.closed).toBe(
				true,
			);
			expect(phantomWindows()).toEqual([]);
		});

		it("stays running, asking nothing, when a saved session left it open with no document", async () => {
			useAppManager.setState((s) => {
				const next = structuredClone(s);
				next.System.Manager.Applications.apps[PDF] = {
					id: PDF,
					name: "PDF Viewer",
					icon: "",
					windows: {},
					open: true,
					data: { openFiles: [] },
				};
				return next;
			});
			renderDesktop();
			await act(async () => {
				await new Promise((r) => setTimeout(r, 50));
			});
			expect(apps()[PDF].open).toBe(true);
			expect(dialog()).toBeNull();
		});
	});
});
