import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop default apps", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("mounts all four default apps' desktop icons when no disableX props are set", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDF Viewer")).toBeInTheDocument();
		expect(screen.getByAltText("Movie Player")).toBeInTheDocument();
		expect(screen.getByAltText("Picture Viewer")).toBeInTheDocument();
	});

	it("registers Drive Setup as a hidden app-shortcut icon: in the store (for Applications) but not rendered on the desktop", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		const driveSetupIcon = useAppManager
			.getState()
			.System.Manager.Desktop.icons.find((i) => i.appId === "DriveSetup.app");
		// Registered as an app-shortcut so the derived Applications folder lists it…
		expect(driveSetupIcon?.kind).toBe("app_shortcut");
		expect(driveSetupIcon?.hidden).toBe(true);
		// …but no desktop icon is drawn for it (desktop icons render with
		// id "<appId>.shortcut"). A visible app like SimpleText still gets one.
		expect(
			container.querySelector("#DriveSetup\\.app\\.shortcut"),
		).toBeNull();
		expect(
			container.querySelector("#SimpleText\\.app\\.shortcut"),
		).not.toBeNull();
	});

	it("omits an app's desktop icon when its disableX prop is set, leaving the others", () => {
		render(
			<ClassicyAppManagerProvider disableMoviePlayer disablePictureViewer>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
		expect(screen.getByAltText("PDF Viewer")).toBeInTheDocument();
		expect(screen.queryByAltText("Movie Player")).not.toBeInTheDocument();
		expect(screen.queryByAltText("Picture Viewer")).not.toBeInTheDocument();
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
		expect(screen.queryByAltText("SimpleText")).not.toBeInTheDocument();
		consoleError.mockRestore();
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
		expect(screen.getByAltText("SimpleText")).toBeInTheDocument();
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
