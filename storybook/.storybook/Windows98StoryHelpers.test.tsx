// The Windows 98 stories share one WithTheme and one inScheme, from
// @sb/windows98 (as System 7's from @sb/system7): no story file keeps its
// own copy.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { getClassicyRecentDocuments } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import { CLASSICY_START_MENU_ID } from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { runClassicyWindowCommand } from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";
import { withClassicy } from "./ClassicyDecorators";
import { SB_ICON } from "./helpers";
import {
	chooseMenuItem,
	clickElement,
	contextClickElement,
	hoverElement,
	inScheme,
	noteRecentDocuments,
	openStartMenu,
	openTaskbarMenu,
	openTrayIcon,
	pressElement,
	runWindows98StorySteps,
	untilElement,
	untilSelector,
	WhenWindowsOpen,
	WithActions,
	WithTheme,
	windows98Parameters,
	windows98StoryWindowsOpen,
} from "./windows98";

const STORIES = path.resolve(
	process.cwd(),
	"packages/appearance/windows98/src",
);
const storyFiles = readdirSync(STORIES)
	.filter((file) => file.endsWith(".stories.tsx"))
	.sort();

describe("Windows 98 story helpers", () => {
	it("WithTheme activates its theme and renders its children", async () => {
		await act(async () => {
			render(
				<WithTheme id="windows95">
					<p>scene</p>
				</WithTheme>,
			);
		});
		expect(screen.getByText("scene")).toBeTruthy();
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.id,
		).toBe("windows95");
	});

	it("inScheme renders the scene under the named scheme", () => {
		const scene = () => <p>scene</p>;
		const element = inScheme("windows98Brick", scene).render() as ReactElement<{
			id: string;
			children: ReactElement;
		}>;
		expect(isValidElement(element)).toBe(true);
		expect(element.type).toBe(WithTheme);
		expect(element.props.id).toBe("windows98Brick");
		expect(isValidElement(element.props.children)).toBe(true);
		expect(element.props.children.type).toBe("p");
	});

	it("finds the Windows 98 story files", () => {
		expect(storyFiles.length).toBeGreaterThanOrEqual(1);
	});

	it.each(storyFiles)("%s keeps no copy of either helper", (file) => {
		const source = readFileSync(path.join(STORIES, file), "utf8");
		expect(source).not.toMatch(/\bfunction\s+WithTheme\b/);
		expect(source).not.toMatch(
			/\b(?:const|let|var)\s+(?:WithTheme|inScheme)\b/,
		);
		const uses = ["WithTheme", "inScheme"].filter((name) =>
			new RegExp(`\\b${name}\\b`).test(source),
		);
		if (uses.length === 0) return;
		const imported = source.match(
			/import\s*\{([^}]*)\}\s*from\s*"@sb\/windows98";/,
		);
		expect(imported, `${file} imports from @sb/windows98`).not.toBeNull();
		for (const name of uses)
			expect(imported?.[1]).toMatch(new RegExp(`\\b${name}\\b`));
	});
});

// Plan 0020-w98 step 20: the shell's stories (Windows98Shell.stories.tsx)
// drive the desktop through these helpers, as the user would.
describe("Windows 98 shell story helpers", () => {
	const NOTEPAD = "helpers-notepad.app";

	const NotepadWindow = () => (
		<ClassicyApp id={NOTEPAD} name="Notepad" icon={SB_ICON}>
			<ClassicyWindow
				id="notepad"
				appId={NOTEPAD}
				title="Untitled - Notepad"
				initialSize={[300, 200]}
				initialPosition={[40, 40]}
			>
				<p>notepad</p>
			</ClassicyWindow>
		</ClassicyApp>
	);
	const openNotepad = () =>
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: NOTEPAD, name: "Notepad", icon: SB_ICON },
			}),
		);
	const notepadRecord = () => {
		const app =
			useAppManager.getState().System.Manager.Applications.apps[NOTEPAD];
		return app ? getAppWindow(app, "notepad") : undefined;
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: "windows98",
		});
	});

	afterEach(() => {
		cleanup();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("WithActions dispatches its actions once, in order, and renders its children", async () => {
		const actions = [
			{ type: "ClassicyDesktopTaskbarAddRunCommand", command: "first" },
			{ type: "ClassicyDesktopTaskbarAddRunCommand", command: "second" },
		];
		const { rerender } = render(
			<WithActions actions={actions}>
				<p>scene</p>
			</WithActions>,
		);
		rerender(
			<WithActions actions={actions}>
				<p>scene</p>
			</WithActions>,
		);
		expect(screen.getByText("scene")).toBeTruthy();
		// The Run history lists the latest command first.
		expect(
			useAppManager.getState().System.Manager.Desktop.taskbar?.runHistory,
		).toEqual(["second", "first"]);
	});

	it("knows a window open only once it is mounted and open in the store", async () => {
		expect(windows98StoryWindowsOpen([[NOTEPAD, "notepad"]])).toBe(false);
		render(<NotepadWindow />);
		expect(windows98StoryWindowsOpen([[NOTEPAD, "notepad"]])).toBe(false);
		openNotepad();
		await waitFor(() =>
			expect(windows98StoryWindowsOpen([[NOTEPAD, "notepad"]])).toBe(true),
		);
		expect(windows98StoryWindowsOpen([])).toBe(true);
		expect(
			windows98StoryWindowsOpen([
				[NOTEPAD, "notepad"],
				[NOTEPAD, "other"],
			]),
		).toBe(false);
	});

	it("runs each step in order: a window command through the registry, an action through the store", async () => {
		render(<NotepadWindow />);
		openNotepad();
		await waitFor(() =>
			expect(windows98StoryWindowsOpen([[NOTEPAD, "notepad"]])).toBe(true),
		);
		act(() =>
			runWindows98StorySteps([
				{ appId: NOTEPAD, windowId: "notepad", command: { type: "minimize" } },
				{
					action: { type: "ClassicyDesktopTaskbarAddRunCommand", command: "x" },
				},
			]),
		);
		expect(notepadRecord()?.collapsed).toBe(true);
		expect(
			useAppManager.getState().System.Manager.Desktop.taskbar?.runHistory,
		).toEqual(["x"]);
	});

	it("WhenWindowsOpen waits for its windows, then runs its steps once after the delay", async () => {
		const steps = [
			{
				appId: NOTEPAD,
				windowId: "notepad",
				command: { type: "maximize" } as const,
			},
		];
		const scene = (
			<WhenWindowsOpen
				windows={[[NOTEPAD, "notepad"]]}
				steps={steps}
				delayMs={10}
			>
				<NotepadWindow />
			</WhenWindowsOpen>
		);
		const { rerender } = render(scene);
		await new Promise((resolve) => setTimeout(resolve, 30));
		// Not open yet: nothing ran.
		expect(notepadRecord()?.zoomed).toBeFalsy();
		openNotepad();
		await waitFor(() => expect(notepadRecord()?.zoomed).toBe(true));
		// Once only: an un-zoom stays un-zoomed through re-renders.
		act(() => {
			runClassicyWindowCommand(NOTEPAD, "notepad", { type: "restore" });
		});
		rerender(scene);
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(notepadRecord()?.zoomed).toBeFalsy();
	});

	it("noteRecentDocuments notes each path for Start ▸ Documents", () => {
		noteRecentDocuments(["Macintosh HD:Documents:Read Me.txt"]);
		expect(getClassicyRecentDocuments()).toContain(
			"Macintosh HD:Documents:Read Me.txt",
		);
	});

	it("untilElement resolves with the element once found, and rejects after its timeout", async () => {
		let el: HTMLElement | null = null;
		setTimeout(() => {
			el = document.createElement("div");
		}, 30);
		expect(await untilElement(() => el, "late element", 1000)).toBe(el);
		await expect(untilElement(() => null, "nothing", 50)).rejects.toThrow(
			"no nothing within 50 ms",
		);
	});

	it("dispatches the events the shell listens for", () => {
		const el = document.createElement("button");
		document.body.append(el);
		const seen: string[] = [];
		for (const type of [
			"mousedown",
			"mouseup",
			"click",
			"contextmenu",
			"mouseover",
			"mousemove",
		])
			el.addEventListener(type, (e) =>
				seen.push(`${type}:${(e as MouseEvent).button}:${e.bubbles}`),
			);
		pressElement(el);
		clickElement(el);
		contextClickElement(el);
		hoverElement(el);
		expect(seen).toEqual([
			"mousedown:0:true",
			"mousedown:0:true",
			"mouseup:0:true",
			"click:0:true",
			"contextmenu:2:true",
			"mouseover:0:true",
			"mousemove:0:true",
		]);
		el.remove();
	});
});

// The play functions' helpers against a whole Storybook desktop, drawn by
// the decorator as a Windows 98 shell story is.
describe("Windows 98 shell play helpers on the story desktop", () => {
	const renderShellStory = (
		Story: () => ReactElement,
		classicy: Record<string, unknown> = {},
	) =>
		render(
			withClassicy(
				Story as never,
				{
					id: "test--windows98-shell",
					viewMode: "story",
					globals: { theme: "default", appearancePackage: "platinum" },
					parameters: {
						classicy: { ...windows98Parameters.classicy, ...classicy },
					},
				} as never,
			) as ReactElement,
		);

	afterEach(() => {
		cleanup();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("opens the Start menu and a submenu, with Log Off for the story's user name", async () => {
		renderShellStory(() => <p>scene</p>, { userName: "Guest" });
		await screen.findByText("scene", {}, { timeout: 20000 });
		await openStartMenu(document, ["start-menu_programs"]);
		expect(
			document
				.getElementById("start-menu_programs")
				?.classList.contains("open"),
		).toBe(true);
		expect(
			document.getElementById(CLASSICY_START_MENU_ID)?.textContent,
		).toMatch(/Log Off Guest/);
	}, 30000);

	it("leaves Log Off out without a user name", async () => {
		renderShellStory(() => <p>scene</p>);
		await screen.findByText("scene", {}, { timeout: 20000 });
		await openStartMenu(document);
		expect(
			document.getElementById(CLASSICY_START_MENU_ID)?.textContent,
		).not.toMatch(/Log Off/);
	}, 30000);

	it("opens a tray icon's panel and menu, and the taskbar's menu and its Properties", async () => {
		renderShellStory(() => <p>scene</p>);
		await screen.findByText("scene", {}, { timeout: 20000 });
		const panel = await openTrayIcon(document, "Volume", 1);
		expect(panel.classList.contains("classicyTaskbarTrayPopup")).toBe(true);
		await openTrayIcon(document, "Display", 2);
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeNull();
		await openTaskbarMenu(document);
		expect(document.getElementById("taskbar-properties")).not.toBeNull();
		await chooseMenuItem(document, "taskbar-properties");
		expect(
			await untilSelector(document, ".classicyTaskbarProperties"),
		).toBeTruthy();
	}, 30000);
});

// Step 20's scenes, each in Windows98Shell.stories.tsx.
describe("the Windows 98 shell stories", () => {
	const source = readFileSync(
		path.join(STORIES, "Windows98Shell.stories.tsx"),
		"utf8",
	);
	const exported = Array.from(
		source.matchAll(/^export const (\w+): Story\b/gm),
		(m) => m[1],
	);

	it.each([
		// The plan's scenes.
		"Taskbar",
		"StartMenu",
		"TrayMenu",
		"TraySoundPanel",
		"WindowMenuBarHelp",
		"MaximizedWindow",
		"SystemMenu",
		"MessageBoxInformation",
		"MessageBoxWarning",
		"MessageBoxCritical",
		"Windows95Scheme",
		"RainyDayScheme",
		// E1-E4.
		"TaskbarMenu",
		"QuickLaunch",
		"TaskBandPaging",
		"ShutDown",
		"Run",
		"StartMenuDocuments",
		"StartMenuLogOff",
		"LogOff",
		"FlashingTaskButton",
		"StartButtonTooltip",
		"CaptionButtonTooltip",
		"TaskbarProperties",
		"DockedLeft",
		"DockedTop",
		"AutoHide",
		"SmallStartMenuIcons",
	])("has the %s story", (name) => expect(exported).toContain(name));

	it("leaves parameters.classicy.controlStrip unset, so the tray has its modules", () =>
		expect(source).not.toMatch(/controlStrip\s*:/));

	it("draws every story under the Windows 98 package", () =>
		expect(source).toMatch(/parameters: windows98Parameters/));
});
