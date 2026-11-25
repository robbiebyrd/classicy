// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { Calculator } from "@/SystemFolder/Calculator/Calculator";
import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	CLASSICY_DEFAULT_APP_IDS,
	classicyDisabledDefaultAppIds,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDisabledDefaultApps";
import { CLASSICY_SYSTEM_MENU_APP_PREFIX } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopItemIconAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	ClassicyFileSystem,
	resetClassicyFileSystemSharedTrees,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// C4's window activation, watched through the module's own function.
const activateDropWindow = vi.hoisted(() => vi.fn());
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileMove",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/SystemResources/File/ClassicyFileMove")
			>();
		return {
			...actual,
			activateClassicyDropWindow: (
				...args: Parameters<typeof actual.activateClassicyDropWindow>
			) => {
				activateDropWindow(...args);
				return actual.activateClassicyDropWindow(...args);
			},
		};
	},
);

// The bundled apps pass showDesktopIcon={false}, so they register HIDDEN
// app-shortcut icons: present in the store (which is what the derived
// Applications folder is built from) but never drawn on the desktop. These
// tests therefore assert on the icon records rather than on rendered icons —
// the record is what proves the app mounted, independent of whether its
// desktop icon is drawn.
const iconFor = (appId: string) =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === appId);

describe("ClassicyDesktop default apps", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("mounts all four default apps when no disableX props are set", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(iconFor("SimpleText.app")).toBeDefined();
		expect(iconFor("PDFViewer.app")).toBeDefined();
		expect(iconFor("MoviePlayer.app")).toBeDefined();
		expect(iconFor("PictureViewer.app")).toBeDefined();
	});

	it("registers Drive Setup as a hidden app-shortcut icon: in the store (for Applications) but not rendered on the desktop", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		const driveSetupIcon = iconFor("DriveSetup.app");
		// Registered as an app-shortcut so the derived Applications folder lists it…
		expect(driveSetupIcon?.kind).toBe("app_shortcut");
		expect(driveSetupIcon?.hidden).toBe(true);
		// …but no desktop icon is drawn for it (desktop icons render with
		// id "<appId>.shortcut"). Trash is the contrast case: an icon that is
		// registered AND drawn, proving the desktop draws icons at all here.
		expect(container.querySelector("#DriveSetup\\.app\\.shortcut")).toBeNull();
		expect(container.querySelector("#Trash\\.shortcut")).not.toBeNull();
	});

	it("does not mount an app at all when its disableX prop is set, leaving the others", () => {
		render(
			<ClassicyAppManagerProvider disableMoviePlayer disablePictureViewer>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(iconFor("SimpleText.app")).toBeDefined();
		expect(iconFor("PDFViewer.app")).toBeDefined();
		expect(iconFor("MoviePlayer.app")).toBeUndefined();
		expect(iconFor("PictureViewer.app")).toBeUndefined();
	});

	const appleMenuHas = (appId: string) =>
		useAppManager
			.getState()
			.System.Manager.Desktop.systemMenu.some(
				(item) => item?.id === `${CLASSICY_SYSTEM_MENU_APP_PREFIX}${appId}`,
			);

	it("clears what a disabled app saved on an earlier visit", () => {
		// First visit: every app mounts and saves its records; the Calculator
		// is left open.
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: CALCULATOR_APP_ID, name: "Calculator", icon: "" },
			});
		});
		expect(appleMenuHas(CALCULATOR_APP_ID)).toBe(true);
		expect(iconFor(CALCULATOR_APP_ID)).toBeDefined();
		cleanup();

		// Next visit, with the saved state: the host has disabled two apps.
		render(
			<ClassicyAppManagerProvider disableCalculator disableMoviePlayer>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		const apps = useAppManager.getState().System.Manager.Applications.apps;
		expect(appleMenuHas(CALCULATOR_APP_ID)).toBe(false);
		expect(iconFor(CALCULATOR_APP_ID)).toBeUndefined();
		expect(apps[CALCULATOR_APP_ID]?.open).not.toBe(true);
		expect(iconFor("MoviePlayer.app")).toBeUndefined();
		// The others are untouched.
		expect(iconFor("SimpleText.app")).toBeDefined();
		expect(appleMenuHas("AppearanceManager.app")).toBe(true);
	});

	it("keeps a disabled app the host renders itself", () => {
		render(
			<ClassicyAppManagerProvider disableCalculator>
				<ClassicyDesktop>
					<Calculator />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		expect(appleMenuHas(CALCULATOR_APP_ID)).toBe(true);
		expect(iconFor(CALCULATOR_APP_ID)).toBeDefined();
	});

	it("maps every disableX flag to its app", () => {
		expect(
			classicyDisabledDefaultAppIds({
				disableSimpleText: true,
				disablePDFViewer: false,
				disableMoviePlayer: false,
				disablePictureViewer: false,
				disableHyperCard: false,
				disableWebViewer: false,
				disableCalculator: true,
			}),
		).toEqual(["SimpleText.app", CALCULATOR_APP_ID]);
		expect(new Set(Object.values(CLASSICY_DEFAULT_APP_IDS)).size).toBe(7);
	});

	it("shows the Sad Mac crash screen when a child app throws during render", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const Bomb = () => {
			throw new Error("boom");
		};
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop>
					<Bomb />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyCrashScreen")).toBeInTheDocument();
		// The desktop itself is gone — the boundary replaced it entirely.
		expect(container.querySelector("#classicyDesktop")).toBeNull();
		consoleError.mockRestore();
	});
});

// The "classicy" disposition only works because ClassicyDesktop imports
// WebViewer STATICALLY: WebViewer.tsx pulls in WebViewerContext, whose module
// body self-registers the "ClassicyAppWebViewer" plugin handler that the
// ClassicyDesktopOpenUrl reducer routes through. That registration is a
// module-graph side effect, not a mount side effect — so this is the only test
// that can prove the production wiring. Swap the import for lazy()/import() and
// nothing registers, the reducer's dispatchToPlugin falls through, and this
// test fails while the reducer's own unit test (which imports WebViewerContext
// itself) keeps passing.
describe("ClassicyDesktop open-URL wiring", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("opens a Web Viewer window for the classicy disposition", async () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "classicy",
			title: "Press Room",
		});

		await waitFor(() =>
			expect(
				container
					.querySelector<HTMLIFrameElement>(".classicyWebViewerFrame")
					?.getAttribute("src"),
			).toBe("/press"),
		);
		expect(screen.getByTitle("Press Room")).toBeInTheDocument();
	});
});

// ClassicyDesktopIconEventHandler's own unit tests cover the noLaunch field
// in isolation. Nothing rendered ClassicyDesktop itself to prove it actually
// reads that field: ClassicyDesktop passes
// noLaunch={i.noLaunch ?? i.appId === "Trash"} down to ClassicyDesktopIcon,
// whose launchIcon only skips the ClassicyDesktopIconOpen dispatch when that
// prop is truthy. A regression in that wiring (e.g. the prop being dropped or
// mistyped) would slip past every reducer-level test.
describe("ClassicyDesktop shortcut icon noLaunch wiring", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("does not create an app entry when a noLaunch shortcut icon is double-clicked", async () => {
		// jsdom doesn't implement window.open; unstubbed, the real click
		// (disposition: "browser-new") reaches it and jsdom logs
		// "Not implemented: Window's open() method" to stderr on every run.
		// Stubbing it also lets the test assert the navigation attempt
		// directly instead of inferring it happened from openUrlRequestId
		// having incremented.
		const windowOpen = vi.spyOn(window, "open").mockReturnValue(null);

		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: {
				id: "shortcut_example",
				name: "Example Site",
				icon: "icon.png",
			},
			kind: "shortcut",
			noLaunch: true,
			event: "ClassicyDesktopOpenUrl",
			eventData: {
				url: "https://example.com/",
				disposition: "browser-new",
			},
		});

		fireEvent.doubleClick(await screen.findByAltText("Example Site"));

		expect(iconFor("shortcut_example")).toBeDefined();
		expect(
			useAppManager.getState().System.Manager.Applications.apps
				.shortcut_example,
		).toBeUndefined();
		// The double-click was still handled — its wired event/eventData fired,
		// reaching ClassicyOpenUrlController and actually navigating — which
		// rules out the icon simply not being reachable by the click.
		expect(windowOpen).toHaveBeenCalledWith(
			"https://example.com/",
			"_blank",
			"noopener,noreferrer",
		);

		windowOpen.mockRestore();
	});
});

describe("ClassicyDesktop startup screen", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("renders the startup splash by default on a fresh session", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		// The desktop is mounted underneath while the splash is up
		expect(container.querySelector("#classicyDesktop")).not.toBeNull();
	});

	it("suppresses the splash when startupScreen is false", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("does not show the splash again within the same session", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("forwards a custom bootScreen down to the boot sequence", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop
					bootScreen={<div data-testid="custom-boot">Custom</div>}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByTestId("custom-boot")).toBeInTheDocument();
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("clears the session key on Reset PRAM, so the splash replays after reload", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "resetPram",
			});
		});
		// The reset confirmation is a caution ClassicyAlert; its confirm
		// button is the HIG-specific verb "Reset" (Cancel is the safe default).
		fireEvent.click(screen.getByText("Reset"));
		expect(sessionStorage.getItem("classicyStartupScreenShown")).toBeNull();
		expect(reload).toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});

describe("ClassicyDesktop default parade icons", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("registers the classic extension icons in the boot parade on mount", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		const paradeIcons =
			useAppManager.getState().System.Manager.Boot.paradeIcons;
		expect(paradeIcons.map((entry) => entry.name)).toEqual([
			"Apple Guide",
			"AppleShare",
			"Apple Vision",
			"Ethernet",
			"FM Radio",
			"Date and Time",
			"Contextual Menus",
			"QuickDraw",
			"QuickTime",
			"QuickTime MPEG",
			"Sound Manager",
		]);
		for (const entry of paradeIcons) {
			expect(entry.icon).toBeTruthy();
		}
	});

	it("does not duplicate parade entries when the desktop remounts", () => {
		const { unmount } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		unmount();
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(
			useAppManager.getState().System.Manager.Boot.paradeIcons,
		).toHaveLength(11);
	});
});

describe("ClassicyDesktop Control Strip", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("mounts the Control Strip with the built-in Sound module by default", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const strip = screen.getByRole("toolbar", { name: "Control Strip" });
		expect(strip).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sound" })).toBeInTheDocument();
	});

	it("shows the Screen Saver extension's module, and drops host-disabled ones", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop
					startupScreen={false}
					controlStrip={{ disabledModules: ["classicy-sound"] }}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(
			screen.getByRole("button", { name: "Screen Saver" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Sound" })).toBeNull();
	});

	it("passes its props through, and hides it with controlStrip={false}", () => {
		const { unmount } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop
					startupScreen={false}
					controlStrip={{ defaultCollapsed: true }}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(
			screen.getByRole("button", { name: "Expand Control Strip" }),
		).toBeInTheDocument();
		unmount();

		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.queryByRole("toolbar", { name: "Control Strip" })).toBeNull();
	});
});

// Hand-off C4 (the remaining chapters' audit's 5.31, 5.34, A.8): a desktop
// file icon let go on a folder is moved, copied or linked by the drop's
// effect (`transferClassicyFileSystemItems`), and once something went the
// Finder window the folder is drawn in comes forward
// (`activateClassicyDropWindow`, inert without `transfer.activateDropWindow`).
describe("ClassicyDesktop drops on a folder (C4)", () => {
	const DESKTOP_FOLDER = "Macintosh HD:Desktop Folder";
	// Each test its own names: a tree saved by an earlier test's desktop
	// may still be read back.
	let run = 0;
	let FILE = "";
	let ARCHIVE = "";
	let restore: (() => void) | null = null;
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		resetClassicyFileSystemSharedTrees();
		run += 1;
		FILE = `${DESKTOP_FOLDER}:Plan ${run}.txt`;
		ARCHIVE = `Macintosh HD:Archive ${run}`;
		useAppManager.setState(DefaultAppManagerState, true);
		activateDropWindow.mockClear();
	});
	afterEach(() => {
		restore?.();
		restore = null;
		cleanup();
	});
	const renderWithFile = () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const fs = new ClassicyFileSystem();
		fs.mkDir(DESKTOP_FOLDER);
		fs.mkDir(ARCHIVE);
		fs.writeFile(FILE, "plan");
		const action = classicyDesktopItemIconAction(fs, FILE, [100, 100]);
		if (action) act(() => dispatch(action));
		const icon = document.getElementById(
			`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${FILE}.shortcut`,
		) as HTMLElement;
		return { fs, icon };
	};
	const dropOn = (icon: Element, folderPath: string, ctrlKey: boolean) => {
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", folderPath);
		document.body.append(folder);
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [folder];
		try {
			fireEvent.mouseDown(icon, { button: 0, clientX: 110, clientY: 110 });
			fireEvent.mouseMove(document, { clientX: 200, clientY: 200, ctrlKey });
			fireEvent.mouseUp(document, { clientX: 200, clientY: 200, ctrlKey });
		} finally {
			document.elementsFromPoint = original;
			folder.remove();
		}
		return folder;
	};

	it("copies with the copy modifier and brings the folder's window forward under the Windows transfer keys", () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { copyModifier: "ctrl", activateDropWindow: true },
		});
		const { fs, icon } = renderWithFile();
		const folder = dropOn(icon, ARCHIVE, true);
		expect(fs.resolve(`${ARCHIVE}:Plan ${run}.txt`)?._data).toBe("plan");
		expect(fs.resolve(FILE)).toBeDefined();
		expect(activateDropWindow).toHaveBeenCalledTimes(1);
		expect(activateDropWindow.mock.calls[0][0]).toMatchObject({
			element: folder,
			destination: { kind: "folder", path: ARCHIVE },
		});
	});

	it("brings no window forward when nothing went", () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { copyModifier: "ctrl", activateDropWindow: true },
		});
		const { icon } = renderWithFile();
		dropOn(icon, "Macintosh HD:Nowhere", false);
		expect(activateDropWindow).not.toHaveBeenCalled();
	});

	it("moves, Control held or not, under Platinum", () => {
		const { fs, icon } = renderWithFile();
		dropOn(icon, ARCHIVE, true);
		expect(fs.resolve(`${ARCHIVE}:Plan ${run}.txt`)?._data).toBe("plan");
		expect(fs.resolve(FILE)).toBeUndefined();
	});
});
