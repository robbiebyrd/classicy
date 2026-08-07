import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

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

	it("clears the session key when the trash is emptied, so the splash replays after reload", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		fireEvent.doubleClick(screen.getByAltText("Trash"));
		// The reset confirmation is now a caution ClassicyAlert; its confirm
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
