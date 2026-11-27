import { produce } from "immer";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import "@/SystemFolder/Finder/FinderContext";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { hasShownStartupScreenThisSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import {
	ClassicyDesktop,
	type ClassicyDesktopProps,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { getClassicyRecentDocuments } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import {
	CLASSICY_RUN_FIELD_ID,
	classicyRunBrowsedCommand,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyShellDialogs.internal";
import {
	closeClassicySessionPrograms,
	startClassicyFreshSession,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Plan 0020-w98 E2, "Shut Down and Run": the Windows shell's Shut Down
// Windows, Run and Log Off Windows dialogs, as Windows 98 SE's shell32
// builds them, and the screens Stand by and Shut down leave. The reload a
// fresh session ends with is stubbed (jsdom cannot reload).

vi.mock(
	"@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal")
			>();
		return { ...actual, startClassicyFreshSession: vi.fn() };
	},
);

const APP_ID = "T.app";
const OTHER_ID = "U.app";
const freshSession = vi.mocked(startClassicyFreshSession);
const desktop = () => useAppManager.getState().System.Manager.Desktop;
const app = (id: string) =>
	useAppManager.getState().System.Manager.Applications.apps[id];
const dialog = (variant: string) =>
	document.querySelector<HTMLElement>(`.classicyShellDialog${variant}`);
const button = (root: Element | null, label: string) =>
	Array.from(root?.querySelectorAll("button") ?? []).find(
		(b) => b.textContent === label,
	) as HTMLButtonElement;
const show = (dialogName: string | null) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: dialogName }),
	);
const field = () =>
	document.getElementById(CLASSICY_RUN_FIELD_ID) as HTMLInputElement;
const type = (text: string) =>
	fireEvent.change(field(), { target: { value: text } });

const renderShell = (
	props: Partial<ClassicyDesktopProps> = {},
	children: ReactNode = null,
) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false} {...props}>
				<ClassicyApp id={APP_ID} name="Tee" icon="">
					<ClassicyWindow id="main" appId={APP_ID} title="Main">
						<p>main</p>
					</ClassicyWindow>
				</ClassicyApp>
				<ClassicyApp id={OTHER_ID} name="You" icon="" />
				{children}
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const usePackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

describe("the Windows shell's dialogs", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		freshSession.mockClear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		// T.app, open, so its window draws.
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Applications.apps[APP_ID] = {
					id: APP_ID,
					name: "Tee",
					icon: "",
					windows: {},
					open: true,
					data: {},
				};
			}),
		);
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		usePackage(TEST_MINIMIZE_PACKAGE_ID);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		vi.useRealTimers();
	});

	describe("Shut Down Windows", () => {
		it("asks what to do, over a dim of the whole screen, Shut down chosen the first time", () => {
			renderShell();
			show("shutDown");
			const root = dialog("ShutDown");
			expect(root).toHaveAttribute("role", "dialog");
			expect(root).toHaveAttribute("aria-label", "Shut Down Windows");
			expect(root).toHaveTextContent("What do you want the computer to do?");
			const radios = Array.from(
				root?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [],
			);
			expect(
				radios.map((radio) => [
					root?.querySelector(`label[for="${radio.id}"]`)?.textContent,
					radio.checked,
				]),
			).toEqual([
				["Stand by", false],
				["Shut down", true],
				["Restart", false],
			]);
			// No MS-DOS mode, no Help: Classicy has neither.
			expect(root).not.toHaveTextContent("MS-DOS");
			expect(button(root, "Help")).toBeUndefined();
			expect(
				document.querySelector(".classicyShellDialogDim"),
			).toBeInTheDocument();
			expect(document.querySelector(".classicyPowerScreen")).toBeNull();
		});

		it("closes on Cancel and on Escape, the dim with it, doing nothing", () => {
			renderShell();
			show("shutDown");
			fireEvent.click(button(dialog("ShutDown"), "Cancel"));
			expect(desktop().systemDialog).toBeNull();
			expect(dialog("ShutDown")).toBeNull();
			expect(document.querySelector(".classicyShellDialogDim")).toBeNull();
			show("shutDown");
			fireEvent.keyDown(dialog("ShutDown") as HTMLElement, { key: "Escape" });
			expect(desktop().systemDialog).toBeNull();
			expect(app(APP_ID).open).toBe(true);
			expect(freshSession).not.toHaveBeenCalled();
		});

		it("opens on the choice made last", () => {
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetShutDownChoice",
					choice: "restart",
				}),
			);
			renderShell();
			show("shutDown");
			expect(
				(
					document.getElementById(
						"classicy-shut-down-restart",
					) as HTMLInputElement
				).checked,
			).toBe(true);
		});

		it("restarts: closes every program but the Finder, writes the state, remembers the choice and starts a fresh session", () => {
			renderShell();
			show("shutDown");
			fireEvent.click(
				document.getElementById("classicy-shut-down-restart") as HTMLElement,
			);
			fireEvent.click(button(dialog("ShutDown"), "OK"));
			expect(app(APP_ID).open).toBe(false);
			expect(app("Finder.app").open).toBe(true);
			expect(desktop().taskbar?.shutDownChoice).toBe("restart");
			expect(desktop().systemDialog).toBeNull();
			expect(freshSession).toHaveBeenCalledWith("restart");
			// Written at once, not on the debounce, so the reload keeps it.
			const saved = JSON.parse(
				localStorage.getItem("classicyDesktopState") ?? "{}",
			);
			expect(saved.System.Manager.Applications.apps[APP_ID].open).toBe(false);
			expect(saved.System.Manager.Desktop.taskbar.shutDownChoice).toBe(
				"restart",
			);
		});

		it("shuts down: closes the programs, then shows It's now safe to turn off your computer. until a key powers on", () => {
			renderShell();
			show("shutDown");
			fireEvent.keyDown(dialog("ShutDown") as HTMLElement, { key: "Enter" });
			expect(app(APP_ID).open).toBe(false);
			const screen = document.querySelector(".classicyPowerScreen");
			expect(screen).toHaveClass("classicyPowerScreenOff");
			expect(screen).toHaveAttribute("role", "status");
			expect(
				screen?.querySelector(".classicyPowerScreenMessage")?.textContent,
			).toBe("It's now safe to turn offyour computer.");
			expect(freshSession).not.toHaveBeenCalled();
			const typed = vi.fn();
			document.addEventListener("keydown", typed);
			fireEvent.keyDown(document.body, { key: "a" });
			expect(typed).not.toHaveBeenCalled();
			document.removeEventListener("keydown", typed);
			expect(freshSession).toHaveBeenCalledWith("restart");
		});

		it("stands by: a dark screen until a press, which wakes the session as it was and goes nowhere else", () => {
			renderShell();
			show("shutDown");
			fireEvent.click(
				document.getElementById("classicy-shut-down-standBy") as HTMLElement,
			);
			fireEvent.click(button(dialog("ShutDown"), "OK"));
			const screen = document.querySelector(".classicyPowerScreen");
			expect(screen).toHaveClass("classicyPowerScreenStandBy");
			expect(screen?.textContent).toBe("");
			expect(app(APP_ID).open).toBe(true);
			const clicked = vi.fn();
			document.addEventListener("click", clicked);
			fireEvent.mouseDown(document.body);
			fireEvent.click(document.body);
			document.removeEventListener("click", clicked);
			expect(clicked).not.toHaveBeenCalled();
			expect(document.querySelector(".classicyPowerScreen")).toBeNull();
			expect(freshSession).not.toHaveBeenCalled();
			expect(desktop().taskbar?.shutDownChoice).toBe("standBy");
		});

		it("wakes a screen saver that started under Stand by with the same press", () => {
			renderShell();
			show("shutDown");
			fireEvent.click(
				document.getElementById("classicy-shut-down-standBy") as HTMLElement,
			);
			fireEvent.click(button(dialog("ShutDown"), "OK"));
			act(() => dispatch({ type: "ClassicyAppScreenSaverActivate" }));
			fireEvent.keyDown(document.body, { key: "Shift" });
			const saver = app("ScreenSaver.app")?.data as { active?: boolean };
			expect(saver?.active).not.toBe(true);
			expect(document.querySelector(".classicyPowerScreen")).toBeNull();
		});
	});

	describe("Log Off Windows", () => {
		it("asks to log off over the dim; Yes closes the programs and runs the host's log off", () => {
			const onLogOff = vi.fn();
			renderShell({ userName: "Ada", onLogOff });
			show("logOff");
			const root = dialog("LogOff");
			expect(root).toHaveAttribute("aria-label", "Log Off Windows");
			expect(root).toHaveTextContent("Are you sure you want to log off?");
			expect(
				document.querySelector(".classicyShellDialogDim"),
			).toBeInTheDocument();
			fireEvent.click(button(root, "Yes"));
			expect(app(APP_ID).open).toBe(false);
			expect(onLogOff).toHaveBeenCalledOnce();
			expect(freshSession).not.toHaveBeenCalled();
			expect(desktop().systemDialog).toBeNull();
		});

		it("starts a fresh session with no startup screen when the host has no log off, and No does nothing", () => {
			renderShell({ userName: "Ada" });
			show("logOff");
			fireEvent.click(button(dialog("LogOff"), "No"));
			expect(app(APP_ID).open).toBe(true);
			expect(freshSession).not.toHaveBeenCalled();
			show("logOff");
			fireEvent.click(button(dialog("LogOff"), "Yes"));
			expect(freshSession).toHaveBeenCalledWith("logOff");
		});
	});

	describe("Run", () => {
		it("asks for a program, folder, document or Internet resource, with no dim, its OK dimmed while the box is empty", () => {
			renderShell();
			show("run");
			const root = dialog("Run");
			expect(root).toHaveAttribute("aria-label", "Run");
			expect(root).toHaveTextContent(
				"Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.",
			);
			expect(root?.querySelector("label")?.textContent).toBe("Open:");
			expect(document.querySelector(".classicyShellDialogDim")).toBeNull();
			expect(button(root, "OK")).toBeDisabled();
			expect(button(root, "Browse...")).toBeEnabled();
			type("  ");
			expect(button(root, "OK")).toBeDisabled();
			type("You");
			expect(button(root, "OK")).toBeEnabled();
		});

		it("runs a program by its name, remembers the command and closes", () => {
			renderShell();
			show("run");
			type("you");
			fireEvent.click(button(dialog("Run"), "OK"));
			expect(app(OTHER_ID).open).toBe(true);
			expect(desktop().taskbar?.runHistory).toEqual(["you"]);
			expect(desktop().systemDialog).toBeNull();
		});

		it("opens with the last command, its text selected", () => {
			act(() =>
				dispatch({ type: "ClassicyDesktopTaskbarAddRunCommand", command: "a" }),
			);
			act(() =>
				dispatch({ type: "ClassicyDesktopTaskbarAddRunCommand", command: "b" }),
			);
			renderShell();
			show("run");
			expect(field().value).toBe("b");
			expect(document.activeElement).toBe(field());
			expect([field().selectionStart, field().selectionEnd]).toEqual([0, 1]);
		});

		it("opens a document through Finder, listing it under Start ▸ Documents, and a folder in a window", () => {
			renderShell();
			show("run");
			type('"macintosh hd:documents:read me.txt"');
			fireEvent.keyDown(field(), { key: "Enter" });
			expect(getClassicyRecentDocuments()).toEqual([
				"Macintosh HD:Documents:Read Me.txt",
			]);
			show("run");
			type("Macintosh HD\\Documents");
			fireEvent.click(button(dialog("Run"), "OK"));
			const finder = app("Finder.app").data as { openPaths?: string[] };
			expect(finder.openPaths).toContain("Macintosh HD:Documents");
		});

		it("opens an http(s) URL through ClassicyDesktopOpenUrl, in the desktop's browser", () => {
			renderShell();
			show("run");
			type("https://example.com/");
			fireEvent.click(button(dialog("Run"), "OK"));
			expect(app("WebViewer.app").open).toBe(true);
			expect(JSON.stringify(app("WebViewer.app").data)).toContain(
				"https://example.com/",
			);
		});

		it("names a command it cannot find in Windows' message, and stays open", () => {
			renderShell();
			show("run");
			type("winword");
			fireEvent.click(button(dialog("Run"), "OK"));
			const message = document.querySelector(".classicyAlert");
			expect(message).toHaveTextContent(
				"Cannot find the file 'winword' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.",
			);
			expect(desktop().systemDialog).toBe("run");
			expect(desktop().taskbar?.runHistory).toBeUndefined();
			fireEvent.click(button(message, "OK"));
			expect(document.querySelector(".classicyAlert")).toBeNull();
			expect(dialog("Run")).toBeInTheDocument();
		});

		it("closes on Cancel, running nothing", () => {
			renderShell();
			show("run");
			type("you");
			fireEvent.click(button(dialog("Run"), "Cancel"));
			expect(app(OTHER_ID).open).toBe(false);
			expect(desktop().systemDialog).toBeNull();
		});

		it("opens Browse, an Open dialog of programs and then all files", () => {
			renderShell();
			show("run");
			fireEvent.click(button(dialog("Run"), "Browse..."));
			const browse = document.querySelector('[aria-label="Browse"]');
			expect(browse).toBeInTheDocument();
			expect(browse).toHaveTextContent("Programs");
			fireEvent.click(button(browse, "Cancel"));
			expect(document.querySelector('[aria-label="Browse"]')).toBeNull();
			expect(dialog("Run")).toBeInTheDocument();
		});

		it("quotes a browsed path that holds a space, as Windows puts it in the box", () => {
			expect(classicyRunBrowsedCommand("Macintosh HD:Read Me.txt")).toBe(
				'"Macintosh HD:Read Me.txt"',
			);
			expect(classicyRunBrowsedCommand("HD:a.txt")).toBe("HD:a.txt");
		});
	});

	// B18 (audit 10.21): under an application modality (Windows 98's) Shut
	// Down and Log Off stay system modal, their scrim above the taskbar, and
	// Run, the taskbar's own dialog, takes no scrim and disables no window.
	it("keeps Shut Down's and Log Off's scrim and gives Run none under an application modality", () => {
		const packageId = "test-shell-application-modal";
		registerTestTaskbarPackage(
			{
				...TEST_MINIMIZE_LAYOUT,
				dialog: { caption: "titled", modality: "application" },
			},
			packageId,
		);
		usePackage(packageId);
		renderShell();
		const scrim = () => document.querySelector(".classicyWindowModalScrim");
		show("shutDown");
		expect(dialog("ShutDown")).not.toBeNull();
		expect(scrim()).not.toBeNull();
		show(null);
		show("logOff");
		expect(scrim()).not.toBeNull();
		show(null);
		show("run");
		expect(dialog("Run")).not.toBeNull();
		expect(scrim()).toBeNull();
		expect(document.querySelector(".classicyWindow[inert]")).toBeNull();
		show(null);
		usePackage(TEST_MINIMIZE_PACKAGE_ID);
		unregisterClassicyAppearancePackage(packageId);
	});

	it("draws Run over a scrim under the desktop modality (no dialog.modality), as before", () => {
		renderShell();
		show("run");
		expect(document.querySelector(".classicyWindowModalScrim")).not.toBeNull();
	});

	it("draws none of them under a layout with no taskbar, Platinum's", () => {
		renderShell();
		usePackage("platinum");
		for (const name of ["shutDown", "run", "logOff"]) {
			show(name);
			expect(desktop().systemDialog).toBeNull();
		}
		expect(document.querySelector(".classicyShellDialog")).toBeNull();
		expect(document.querySelector(".classicyShellDialogDim")).toBeNull();
	});
});

describe("closeClassicySessionPrograms and startClassicyFreshSession", () => {
	it("closes each open program but the Finder and extensions", () => {
		useAppManager.setState(
			produce(structuredClone(DefaultAppManagerState), (draft) => {
				const apps = draft.System.Manager.Applications.apps;
				apps["A.app"] = {
					id: "A.app",
					name: "A",
					icon: "",
					windows: {},
					open: true,
				};
				apps["Ext.app"] = {
					id: "Ext.app",
					name: "Ext",
					icon: "",
					windows: {},
					open: true,
					extension: true,
				};
				apps["Finder.app"].open = true;
			}),
			true,
		);
		const calls: unknown[] = [];
		closeClassicySessionPrograms((action) => calls.push(action));
		expect(calls).toEqual([{ type: "ClassicyAppClose", app: { id: "A.app" } }]);
	});

	it("replays the startup screen for a restart, not for a log off", async () => {
		const actual = await vi.importActual<
			typeof import("@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal")
		>("@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal");
		const reload = vi.fn();
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		actual.startClassicyFreshSession("logOff", reload);
		expect(hasShownStartupScreenThisSession()).toBe(true);
		actual.startClassicyFreshSession("restart", reload);
		expect(hasShownStartupScreenThisSession()).toBe(false);
		expect(reload).toHaveBeenCalledTimes(2);
	});
});
