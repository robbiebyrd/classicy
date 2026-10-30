import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
// Side-effect imports: register the Movie Player and Finder reducers, as the
// package barrel does in the real app.
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import "@/SystemFolder/Finder/FinderContext";

// Every action a component dispatches, recorded on its way into the real
// store: the wrapper calls straight through, so the reducers still run.
const dispatched = vi.hoisted((): ActionMessage[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const { recordingAppManagerUtils } = await import(
			"@/__tests__/recordingAppManagerUtils"
		);
		return recordingAppManagerUtils(await importOriginal(), dispatched);
	},
);

// The action types Finder hands straight to the generic app handler. Finder's
// OpenFile builds its type inside the reducer and calls
// `classicyAppEventHandler` directly, so the dispatch recorder never sees it;
// the generic handler routes on `app.id` alone, so a display-name type would
// open the file just the same. Only the type it received can tell. (The
// kernel's own calls use its local binding and are not recorded.)
const appHandlerTypes = vi.hoisted((): string[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager")
			>();
		const classicyAppEventHandler: typeof actual.classicyAppEventHandler = (
			ds,
			action,
		) => {
			appHandlerTypes.push(action.type);
			return actual.classicyAppEventHandler(ds, action);
		};
		return { ...actual, classicyAppEventHandler };
	},
);

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const TV_ICON = "/icons/tv.png";

const apps = () => useAppManager.getState().System.Manager.Applications.apps;

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
};

const TV = (props: { listed?: boolean }) => (
	<ClassicyApp
		id="TV.app"
		name="TV"
		icon={TV_ICON}
		handlesFileTypes={[ClassicyFileSystemEntryFileType.TextFile]}
		{...(props.listed === false
			? { showDesktopIcon: false, showInApplicationsFolder: false }
			: {})}
	/>
);

const renderBoth = () =>
	render(
		<>
			<MoviePlayer />
			<TV />
		</>,
	);

const waitForRecords = () =>
	waitFor(() => {
		expect(apps()[MoviePlayerAppInfo.id]).toBeDefined();
		expect(apps()["TV.app"]).toBeDefined();
	});

beforeEach(() => {
	resetToPlatinum();
	dispatched.length = 0;
	registerTestRenamePackage();
	act(() =>
		dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: TEST_RENAME_PACKAGE_ID,
		}),
	);
});

afterEach(() => {
	resetToPlatinum();
});

describe("app identity under a renaming package", () => {
	it("keeps each record's internal name", async () => {
		renderBoth();
		await waitForRecords();

		expect(useAppManager.getState().System.Manager.Appearance.packageId).toBe(
			TEST_RENAME_PACKAGE_ID,
		);
		expect(apps()[MoviePlayerAppInfo.id].name).toBe("Movie Player");
		expect(apps()["TV.app"].name).toBe("TV");
	});

	it("closes a Movie Player path document with the literal action type", async () => {
		const { container } = renderBoth();
		await waitForRecords();

		const path = "Macintosh HD:Videos:clip.mp4";
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					const app =
						draft.System.Manager.Applications.apps[MoviePlayerAppInfo.id];
					app.open = true;
					app.data = { openFiles: [path] };
				}),
			);
		});

		const closeBox = await waitFor(() => {
			const box = container.querySelector(".classicyWindowCloseBox");
			expect(box).not.toBeNull();
			return box as Element;
		});
		dispatched.length = 0;
		fireEvent.click(closeBox);

		const closeFiles = dispatched.filter((a) => a.type.endsWith("CloseFile"));
		expect(closeFiles).toEqual([
			{
				type: "ClassicyAppMoviePlayerCloseFile",
				app: { id: MoviePlayerAppInfo.id },
				path,
			},
		]);
		expect(apps()[MoviePlayerAppInfo.id].data?.openFiles).toEqual([]);
	});

	it("routes a Finder OpenFile to the host app through its record name", async () => {
		renderBoth();
		await waitForRecords();
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Applications.fileTypeHandlers[
					ClassicyFileSystemEntryFileType.TextFile
				],
			).toBe("TV.app"),
		);

		const path = "Macintosh HD:Documents:Notes.txt";
		appHandlerTypes.length = 0;
		act(() =>
			dispatch({
				type: "ClassicyAppFinderOpenFile",
				file: { _type: ClassicyFileSystemEntryFileType.TextFile },
				path,
			}),
		);

		// Finder handed the generic handler `ClassicyAppTVOpenFile`, built from
		// the record's internal name, while the package shows "Television"; and
		// the file reached TV's queue.
		expect(appHandlerTypes.filter((type) => type.endsWith("OpenFile"))).toEqual(
			["ClassicyAppTVOpenFile"],
		);
		expect(apps()["TV.app"].data?.openFiles).toEqual([path]);
		expect(apps()["TV.app"].open).toBe(true);
	});

	it("closes a host app's file window with its internal-name action type", async () => {
		const { container } = render(<TV />);
		await waitFor(() => expect(apps()["TV.app"]).toBeDefined());

		const path = "Macintosh HD:Documents:Notes.txt";
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					const app = draft.System.Manager.Applications.apps["TV.app"];
					app.open = true;
					app.data = { openFiles: [path] };
				}),
			);
		});

		const closeBox = await waitFor(() => {
			const box = container.querySelector(".classicyWindowCloseBox");
			expect(box).not.toBeNull();
			return box as Element;
		});
		dispatched.length = 0;
		fireEvent.click(closeBox);

		// `ClassicyApp`'s generic file window: `ClassicyApp${name}CloseFile`
		// with the internal "TV", never the package's "Television".
		expect(dispatched.filter((a) => a.type.endsWith("CloseFile"))).toEqual([
			{ type: "ClassicyAppTVCloseFile", app: { id: "TV.app" }, path },
		]);
		expect(apps()["TV.app"].data?.openFiles).toEqual([]);
	});

	it("removes the host app's icon record by its internal name", async () => {
		const { rerender } = renderBoth();
		await waitForRecords();
		const tvIcons = () =>
			useAppManager
				.getState()
				.System.Manager.Desktop.icons.filter((i) => i.appId === "TV.app");
		await waitFor(() => expect(tvIcons()).toHaveLength(1));
		expect(tvIcons()[0].appName).toBe("TV");

		dispatched.length = 0;
		rerender(
			<>
				<MoviePlayer />
				<TV listed={false} />
			</>,
		);

		await waitFor(() => expect(tvIcons()).toHaveLength(0));
		expect(
			dispatched.filter((a) => a.type === "ClassicyDesktopIconRemove"),
		).toEqual([
			{ type: "ClassicyDesktopIconRemove", app: { id: "TV.app", name: "TV" } },
		]);
	});
});

describe("persisted identity under a renaming package", () => {
	// Everything `test-rename` shows in place of the apps' own identity.
	const DISPLAY_ONLY = [
		"Media Player",
		"Television",
		"Plays movies and sound.",
		TEST_RENAMED_ICON,
	];

	it("refreshes stale records from code and never stores display data", async () => {
		// A record left by an earlier session, holding an older name and icon.
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps["TV.app"] = {
						id: "TV.app",
						name: "Old TV",
						icon: "/icons/old-tv.png",
						windows: {},
						open: false,
						data: {},
					};
				}),
			);
		});

		render(
			<>
				<MoviePlayer />
				<ClassicyApp
					id="TV.app"
					name="TV"
					icon={TV_ICON}
					addSystemMenu
					bootIcon
					desktopIconBalloonHelp="Watch TV."
				/>
			</>,
		);
		await waitForRecords();
		await waitFor(() =>
			expect(
				useAppManager
					.getState()
					.System.Manager.Boot.paradeIcons.some((p) => p.id === "TV.app"),
			).toBe(true),
		);

		expect(apps()["TV.app"]).toMatchObject({ name: "TV", icon: TV_ICON });
		expect(apps()[MoviePlayerAppInfo.id]).toMatchObject({
			name: MoviePlayerAppInfo.name,
			icon: MoviePlayerAppInfo.icon,
		});

		const state = useAppManager.getState();
		const stored = JSON.stringify(state);
		const persisted = JSON.stringify(sanitizeStateForPersistence(state));
		for (const text of DISPLAY_ONLY) {
			expect(stored).not.toContain(text);
			expect(persisted).not.toContain(text);
		}
	});
});
