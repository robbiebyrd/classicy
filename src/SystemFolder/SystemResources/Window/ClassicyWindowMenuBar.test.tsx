import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { compileScss, scssRule } from "@/__tests__/compiledCss";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_LAYOUT,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
// Apple Guide's reducer, which Help Topics reaches.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { useClassicyEditMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	isClassicyWhatsThisActive,
	resetClassicyWhatsThisForTests,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	ClassicyWindowMenuBar,
	withClassicyExitItem,
	withClassicyWindowsFileMenu,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

describe("ClassicyWindowMenuBar", () => {
	it("renders the window's menus as a bar", () => {
		const { container } = render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[
					{
						id: "file",
						title: "File",
						menuChildren: [{ id: "new", title: "New" }],
					},
				]}
			/>,
		);
		expect(
			container.querySelector(".classicyWindowMenuBar .classicyDesktopMenu"),
		).not.toBeNull();
		expect(screen.getByText("File")).toBeInTheDocument();
	});

	it("marks its root as the window-menu-bar part", () => {
		const { container } = render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[{ id: "file", title: "File" }]}
			/>,
		);
		const root = container.querySelector(".classicyWindowMenuBar");
		expect(root?.getAttribute("data-classicy-part")).toBe("window-menu-bar");
		expect(root?.querySelector("ul.classicyWindowMenu")).not.toBeNull();
	});

	// F 5.1 review: a sticky menu closes on a mouse-down outside the bar, as
	// the screen bar's do.
	it("closes an open menu on a mouse-down outside the bar", () => {
		render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[
					{
						id: "file",
						title: "File",
						menuChildren: [{ id: "new", title: "New" }],
					},
				]}
			/>,
		);
		const file = screen.getByText("File").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("File"));
		expect(file).toHaveClass("open");
		fireEvent.mouseDown(screen.getByText("File"));
		expect(file).toHaveClass("open");
		fireEvent.mouseDown(document.body);
		expect(file).not.toHaveClass("open");
	});

	// F 5.1 fix re-review: each bar treats a peer bar as outside, so only one
	// window's menu is ever open.
	it("keeps one menu open across two window bars", () => {
		const bar = (windowId: string) => (
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId={windowId}
				menuItems={[
					{
						id: `${windowId}_file`,
						title: `File ${windowId}`,
						menuChildren: [{ id: `${windowId}_new`, title: "New" }],
					},
				]}
			/>
		);
		render(
			<>
				{bar("a")}
				{bar("b")}
			</>,
		);
		const fileA = screen.getByText("File a").closest("li") as HTMLElement;
		const fileB = screen.getByText("File b").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("File a"));
		expect(fileA).toHaveClass("open");
		fireEvent.mouseDown(screen.getByText("File b"));
		fireEvent.click(screen.getByText("File b"));
		expect(fileA).not.toHaveClass("open");
		expect(fileB).toHaveClass("open");
	});
});

// Plan 0020-w98 §4: under a taskbar no screen bar is drawn, so a window's
// own bar ends with the Help menu (WIG Ch.7 "The Help Menu", p.99); without
// one (Storybook's mirrored package, the test mirror here) it draws the
// window's menus as given.
describe("ClassicyWindowMenuBar's Help menu", () => {
	const APP = "Finder.app";
	const WINDOW = "Macintosh HD";
	const RENAMED_PACKAGE_ID = "test-taskbar-renamed";
	const about = vi.fn();
	const finderHelpId = `${APP}_${WINDOW}_help`;
	const shellHelpId = `${APP}_${WINDOW}_help-menu`;

	// Finder's window menus, as Finder.tsx builds them: its Help holds the
	// balloon toggle (an event item) and About; a host's Help item is added.
	const finderMenu = (
		extraHelp: ClassicyMenuItem[] = [],
	): ClassicyMenuItem[] => [
		{
			id: `${APP}_${WINDOW}_file`,
			title: "File",
			menuChildren: [{ id: `${APP}_${WINDOW}_close`, title: "Close" }],
		},
		{
			id: finderHelpId,
			title: "Help",
			menuChildren: [
				{
					id: `${APP}_${WINDOW}_help_balloon`,
					title: "Hide Balloon Help",
					event: "ClassicyDesktopSetBalloonHelp",
					eventData: { disableBalloonHelp: true },
				},
				...extraHelp,
				{ id: `${APP}_about`, title: "About", onClickFunc: about },
			],
		},
	];

	const renderBar = (menuItems: ClassicyMenuItem[] = finderMenu()) =>
		render(
			<ClassicyWindowMenuBar
				appId={APP}
				windowId={WINDOW}
				menuItems={menuItems}
			/>,
		);

	const usePackage = (id: string) =>
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: id,
			}),
		);

	// The bar's top-level titles, then one submenu's rows: an item's id, or
	// "—" for a divider.
	const titles = (container: HTMLElement) =>
		Array.from(
			container.querySelectorAll(
				".classicyWindowMenuBar > .classicyMenuWrapper > ul > li",
			),
		).map((li) => li.querySelector(":scope > p")?.textContent);
	const rows = (menuId: string) =>
		Array.from(
			document.querySelectorAll(
				`[id="${menuId}"] > .classicyMenuWrapper > ul > *`,
			),
		).map((row) => (row.tagName === "HR" ? "—" : row.id));
	const rowTitle = (id: string) =>
		document
			.querySelector(`[id="${id}"] > p`)
			?.textContent?.replace(/\s+$/, "");

	beforeEach(() => {
		about.mockClear();
		useAppManager.setState(
			produce(structuredClone(DefaultAppManagerState), (draft) => {
				draft.System.Manager.Applications.apps[APP] = {
					id: APP,
					name: "Finder",
					icon: "",
					windows: {},
					open: true,
					focused: true,
					data: {},
				};
				draft.System.Manager.Desktop.helpMenu = {
					[APP]: [{ id: "host_finder_tips", title: "Finder Tips" }],
				};
			}),
			true,
		);
	});

	afterEach(() => {
		cleanup();
		unregisterClassicyAppearancePackage(TEST_MIRROR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(RENAMED_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("without a taskbar (the mirrored package's layout)", () => {
		beforeEach(() => {
			registerTestMirrorPackage();
			usePackage(TEST_MIRROR_PACKAGE_ID);
		});

		it("keeps the app's Quit item titled Quit", () => {
			const menu = finderMenu();
			(menu[0].menuChildren as ClassicyMenuItem[]).push({
				id: `${APP}_quit`,
				title: "Quit",
			});
			renderBar(menu);
			expect(rowTitle(`${APP}_quit`)).toBe("Quit");
		});

		it("draws the window's menus as given, its own Help included", () => {
			const { container } = renderBar();
			expect(titles(container)).toEqual(["File", "Help"]);
			expect(rows(finderHelpId)).toEqual([
				`${APP}_${WINDOW}_help_balloon`,
				`${APP}_about`,
			]);
			expect(document.getElementById(shellHelpId)).toBeNull();
			// Neither the system's items nor the registered ones are added.
			expect(document.getElementById("help-toggle-balloons")).toBeNull();
			expect(document.getElementById("host_finder_tips")).toBeNull();
		});
	});

	describe("under a taskbar", () => {
		beforeEach(() => {
			registerTestTaskbarPackage();
			usePackage(TEST_TASKBAR_PACKAGE_ID);
		});

		it("ends with Help: the system items, the registered items, the app's items, then About Finder", () => {
			const { container } = renderBar(
				finderMenu([{ id: "own_shortcuts", title: "Keyboard Shortcuts" }]),
			);
			// One Help, last; the app's own Help menu is merged into it.
			expect(titles(container)).toEqual(["File", "Help"]);
			const help = document.getElementById(shellHelpId);
			expect(help?.getAttribute("data-classicy-part")).toBe("help");
			expect(document.getElementById(finderHelpId)).toBeNull();
			expect(rows(shellHelpId)).toEqual([
				"help-about-balloon",
				"—",
				"host_finder_tips",
				"—",
				"own_shortcuts",
				"—",
				`${APP}_about`,
			]);
			// About, with no ellipsis, by the app's name (WIG p.99).
			expect(rowTitle(`${APP}_about`)).toBe("About Finder");
			// Finder's own balloon toggle repeats the system's and is dropped.
			expect(
				document.getElementById(`${APP}_${WINDOW}_help_balloon`),
			).toBeNull();
		});

		it("titles the app's Quit item Exit, keeping its event; an item that is no Quit stays", () => {
			const quit = {
				id: `${APP}_quit`,
				title: "Quit",
				event: "ClassicyAppClose",
				eventData: { app: { id: APP } },
			};
			const menu = finderMenu();
			(menu[0].menuChildren as ClassicyMenuItem[]).push({ id: "spacer" }, quit);
			renderBar(menu);
			expect(rowTitle(`${APP}_quit`)).toBe("Exit");
			// Known by its id as well as its title (B1).
			expect(
				withClassicyExitItem([{ ...quit, title: "Leave" }], APP)[0].title,
			).toBe("Exit");
			expect(
				withClassicyExitItem([{ id: "x_leave", title: "Leave" }], APP)[0].title,
			).toBe("Leave");
			expect(withClassicyExitItem([quit], APP, "x")[0]).toEqual({
				...quit,
				title: "Exit",
				accessKey: "x",
			});
		});

		it("keeps the About item's handler", async () => {
			renderBar();
			const item = document.getElementById(`${APP}_about`) as HTMLElement;
			fireEvent.click(item);
			dispatchAnimationEnd(item);
			await waitFor(() => expect(about).toHaveBeenCalledTimes(1));
		});

		// B19: Windows 98's ToolTips always show (WIG Ch.12 p.276), so a
		// window's Help carries no balloon toggle and no ⌥H; Start ▸ Settings
		// keeps it.
		it("draws no balloon toggle and no ⌥H in a window's Help", () => {
			renderBar();
			expect(document.getElementById("help-toggle-balloons")).toBeNull();
			const help = document.getElementById(shellHelpId) as HTMLElement;
			expect(help.textContent).not.toMatch(/Balloons|⌥H|Alt\+H/);
		});

		it("takes About out of whichever menu holds it", () => {
			const { container } = renderBar([
				{
					id: `${APP}_${WINDOW}_file`,
					title: "File",
					menuChildren: [
						{ id: `${APP}_about`, title: "About", onClickFunc: about },
						{ id: "spacer" },
						{ id: `${APP}_${WINDOW}_close`, title: "Close" },
					],
				},
			]);
			expect(titles(container)).toEqual(["File", "Help"]);
			expect(rows(`${APP}_${WINDOW}_file`)).toEqual([`${APP}_${WINDOW}_close`]);
			expect(rows(shellHelpId).slice(-2)).toEqual(["—", `${APP}_about`]);
		});

		it("adds no About and no app divider for an app without them", () => {
			act(() =>
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Desktop.helpMenu = {};
					}),
				),
			);
			renderBar([{ id: "x_file", title: "File", menuChildren: [] }]);
			expect(rows(shellHelpId)).toEqual(["help-about-balloon"]);
		});

		it("titles About with the active package's display name", () => {
			registerClassicyAppearancePackage({
				id: RENAMED_PACKAGE_ID,
				name: "Renamed taskbar",
				css: "",
				defaults: {
					...getTheme("default"),
					id: `${RENAMED_PACKAGE_ID}-default`,
					package: RENAMED_PACKAGE_ID,
				},
				layout: TEST_TASKBAR_LAYOUT,
				apps: { [APP]: { name: "Explorer" } },
			});
			usePackage(RENAMED_PACKAGE_ID);
			renderBar();
			expect(rowTitle(`${APP}_about`)).toBe("About Explorer");
		});
	});

	// Hand-offs C7 and C8 (the remaining chapters' audit's 12.21, 12.1, 12.2
	// and B.5): under a taskbar whose layout declares WinHelp's topic window
	// (`help.topicWindow` "winhelp") and What's This? (`balloonHelp.contextHelp`
	// "whatsThis"), the window bar's Help leads with Help Topics, which opens
	// the Help Topics browser, then What's This? (⇧F1 drawn), which starts the
	// mode over the window; the access keys under `menu.accessKeys`.
	describe("under a taskbar with WinHelp and What's This?", () => {
		beforeEach(() => {
			registerTestTaskbarPackage({
				...TEST_TASKBAR_LAYOUT,
				menu: { accessKeys: "auto" },
				help: { topicWindow: "winhelp" },
				balloonHelp: { contextHelp: "whatsThis" },
			});
			usePackage(TEST_TASKBAR_PACKAGE_ID);
		});
		afterEach(() => {
			resetClassicyWhatsThisForTests();
		});

		it("leads Help with Help Topics and What's This?, their letters and the drawn chord", () => {
			renderBar();
			expect(rows(shellHelpId)).toEqual([
				"help-topics",
				"help-whats-this",
				"—",
				"host_finder_tips",
				"—",
				`${APP}_about`,
			]);
			expect(document.getElementById("help-toggle-balloons")).toBeNull();
			expect(rowTitle("help-topics")).toBe("Help Topics");
			expect(document.getElementById("help-about-balloon")).toBeNull();
			const whatsThis = document.getElementById(
				"help-whats-this",
			) as HTMLElement;
			expect(whatsThis.textContent).toContain("What's This?");
			expect(whatsThis.textContent).toMatch(/Shift\+F1|⇧F1/);
			const letter = (id: string) =>
				document.querySelector(`[id="${id}"] [data-classicy-part="access-key"]`)
					?.textContent;
			expect(letter("help-topics")).toBe("H");
			expect(letter("help-whats-this")).toBe("W");
			// About last, access key A (Notepad's "&About Notepad"; B19).
			expect(letter(`${APP}_about`)).toBe("A");
		});

		it("opens the Help Topics browser from Help Topics", async () => {
			act(() =>
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Applications.apps["AppleGuide.app"] = {
							id: "AppleGuide.app",
							name: "Apple Guide",
							icon: "",
							windows: {},
							open: true,
							data: {},
						};
					}),
				),
			);
			renderBar();
			const item = document.getElementById("help-topics") as HTMLElement;
			fireEvent.click(item);
			dispatchAnimationEnd(item);
			await waitFor(() =>
				expect(
					(
						useAppManager.getState().System.Manager.Applications.apps[
							"AppleGuide.app"
						]?.data as { helpTopicsOpen?: boolean } | undefined
					)?.helpTopicsOpen,
				).toBe(true),
			);
		});

		it("starts What's This? over the bar's window", async () => {
			const windowRoot = document.createElement("div");
			windowRoot.className = "classicyWindow";
			document.body.append(windowRoot);
			try {
				render(
					<ClassicyWindowMenuBar
						appId={APP}
						windowId={WINDOW}
						menuItems={finderMenu()}
					/>,
					{ container: windowRoot },
				);
				const item = document.getElementById("help-whats-this") as HTMLElement;
				fireEvent.click(item);
				dispatchAnimationEnd(item);
				await waitFor(() => expect(isClassicyWhatsThisActive()).toBe(true));
				expect(document.documentElement).toHaveClass("classicyWhatsThisMode");
			} finally {
				windowRoot.remove();
			}
		});

		it("keeps About Balloon Help and adds no What's This? without the keys", () => {
			registerTestTaskbarPackage();
			usePackage(TEST_TASKBAR_PACKAGE_ID);
			renderBar();
			expect(rows(shellHelpId)[0]).toBe("help-about-balloon");
			expect(document.getElementById("help-toggle-balloons")).toBeNull();
			expect(document.getElementById("help-whats-this")).toBeNull();
		});
	});
});

// Shell addendum B1 (WIG Ch.1 "Consistency", p.2; Ch.2 p.13; Ch.7 "The
// File Menu", p.98): under a taskbar a window's File menu ends with a
// divider and Exit (its Quit retitled and moved there), or, with no Quit
// (a Finder folder window's), with Close (its Close Window retitled); the
// Special menu is not drawn in a window bar, its items living in the Start
// menu and on the Trash's own menu. Without a taskbar (the mirrored
// package's layout) both bars are as given.
describe("ClassicyWindowMenuBar's File and Special menus (B1)", () => {
	const APP = "SimpleText.app";
	const quit = {
		id: `${APP}_quit`,
		title: "Quit",
		accessKey: "",
		event: "ClassicyAppClose",
		eventData: { app: { id: APP } },
	};
	// SimpleText's window menus as SimpleText.tsx builds them.
	const simpleTextMenu: ClassicyMenuItem[] = [
		{
			id: "doc_file",
			title: "File",
			menuChildren: [
				{ id: "doc_new", title: "New" },
				{ id: "doc_open", title: "Open…" },
				{ id: "spacer" },
				quit,
				{ id: "spacer" },
				{ id: "doc_close", title: "Close" },
				{ id: "doc_save", title: "Save" },
			],
		},
		{
			id: "doc_edit",
			title: "Edit",
			menuChildren: [{ id: "u", title: "Undo" }],
		},
	];
	// Finder's folder window menus under Mac OS 8's commands.
	const finderMenu: ClassicyMenuItem[] = [
		{
			id: "Finder.app_HD_file",
			title: "File",
			menuChildren: [
				{ id: "Finder.app_HD_file_closew", title: "Close Window" },
				{ id: "Finder.app_HD_file_closews", title: "Close All Windows" },
				{ id: "spacer" },
				{ id: "Finder.app_HD_file_move_to_trash", title: "Move To Trash" },
			],
		},
		{
			id: "Finder.app_HD_special",
			title: "Special",
			menuChildren: [
				{ id: "Finder.app_HD_special_empty_trash", title: "Empty Trash" },
			],
		},
	];
	const titles = (container: HTMLElement) =>
		Array.from(
			container.querySelectorAll(
				".classicyWindowMenuBar > .classicyMenuWrapper > ul > li",
			),
		).map((li) => li.querySelector(":scope > p")?.textContent);
	const rowTitles = (menuId: string) =>
		Array.from(
			document.querySelectorAll(
				`[id="${menuId}"] > .classicyMenuWrapper > ul > *`,
			),
		).map((row) =>
			row.tagName === "HR"
				? "—"
				: (row.querySelector(":scope > p")?.textContent ?? "").trim(),
		);
	const usePackage = (id: string) =>
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: id,
			}),
		);
	const renderBar = (appId: string, menuItems: ClassicyMenuItem[]) =>
		render(
			<ClassicyWindowMenuBar
				appId={appId}
				windowId="w"
				menuItems={menuItems}
			/>,
		);

	beforeEach(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	afterEach(() => {
		cleanup();
		unregisterClassicyAppearancePackage(TEST_MIRROR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("under a taskbar", () => {
		beforeEach(() => {
			registerTestTaskbarPackage({
				...TEST_TASKBAR_LAYOUT,
				menu: { accessKeys: "auto" },
			});
			usePackage(TEST_TASKBAR_PACKAGE_ID);
		});

		it("ends SimpleText's File with a divider and Exit, access key X", () => {
			renderBar(APP, simpleTextMenu);
			expect(rowTitles("doc_file")).toEqual([
				"New",
				"Open…",
				"—",
				"Close",
				"Save",
				"—",
				"Exit",
			]);
			expect(
				document.querySelector(
					`[id="${APP}_quit"] [data-classicy-part="access-key"]`,
				)?.textContent,
			).toBe("x");
		});

		it("ends Finder's File with a divider and Close, and draws no Special menu", () => {
			const { container } = renderBar("Finder.app", finderMenu);
			expect(titles(container)).toEqual(["File", "Help"]);
			expect(rowTitles("Finder.app_HD_file")).toEqual([
				"Close All Windows",
				"—",
				"Move To Trash",
				"—",
				"Close",
			]);
			expect(document.getElementById("Finder.app_HD_special")).toBeNull();
		});

		it("drops a menu titled Special whatever its id, and keeps Exit's handler", () => {
			const shaped = withClassicyWindowsFileMenu(
				[
					{ id: "f", title: "File", menuChildren: [quit] },
					{ id: "odd", title: "Special", menuChildren: [] },
					{ id: "x_special_thing", title: "Thing" },
				],
				APP,
				{ exitKey: "x" },
			);
			expect(shaped.map((m) => m.title)).toEqual(["File", "Thing"]);
			expect(shaped[0].menuChildren).toEqual([
				{ ...quit, title: "Exit", accessKey: "x" },
			]);
		});
	});

	describe("without a taskbar (the mirrored package's layout)", () => {
		beforeEach(() => {
			registerTestMirrorPackage();
			usePackage(TEST_MIRROR_PACKAGE_ID);
		});

		it("draws SimpleText's and Finder's bars as given", () => {
			renderBar(APP, simpleTextMenu);
			expect(rowTitles("doc_file")).toEqual([
				"New",
				"Open…",
				"—",
				"Quit",
				"—",
				"Close",
				"Save",
			]);
			cleanup();
			const { container } = renderBar("Finder.app", finderMenu);
			expect(titles(container)).toEqual(["File", "Special"]);
			expect(rowTitles("Finder.app_HD_file")).toEqual([
				"Close Window",
				"Close All Windows",
				"—",
				"Move To Trash",
			]);
		});
	});
});

// The bar's height and the contents' shrink are keyed twice: on the class
// ClassicyWindow adds when it draws the bar, and on :has() for a bar placed
// some other way. Each is a rule of its own, never a selector list, so a
// browser that cannot parse :has() still applies the class rules.
describe("ClassicyWindowMenuBar.scss", () => {
	const css = compileScss(
		"src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss",
	);
	const height =
		"var(--classicy-window-menu-bar-height, var(--window-menu-bar-height))";

	it.each([
		".classicyWindow.classicyWindowWithMenuBar",
		".classicyWindow:has(> .classicyWindowMenuBar)",
	])("sizes the bar and shrinks the contents under %s", (root) => {
		expect(scssRule(css, `${root} > .classicyWindowMenuBar`)).toEqual({
			height,
		});
		expect(
			scssRule(
				css,
				`${root} .classicyWindowContents:not(.classicyWindowContentsWithHeader)`,
			).height,
		).toContain(height);
		expect(
			scssRule(css, `.classicyWindow${root} .classicyWindowContentsWithHeader`)
				.height,
		).toContain(height);
	});

	it("never lists the class and :has() forms in one selector", () => {
		for (const match of css.matchAll(/^([^{}\n][^{}]*?) \{/gm)) {
			const selector = match[1];
			if (!selector.includes(",")) continue;
			expect(
				selector.includes(":has(") &&
					selector.includes("classicyWindowWithMenuBar"),
			).toBe(false);
		}
	});
});

// C9 (the remaining chapters' audit's 5.44; WIG Ch.5 pp.44-45, 51, 59):
// under Windows 98's own layout a window bar's bundled Edit menu takes
// Notepad's form (`edit.menu` "windows") and acts inside its own window
// alone (`edit.scope` "window"), drawn by the window bar itself.
describe("a window bar's Edit menu under Windows 98's layout (C9)", () => {
	const APP = "Notes.app";
	const PACKAGE_ID = "test-windows98-edit";
	const Bar = ({ windowId }: { windowId: string }) => {
		const edit = useClassicyEditMenu(`${APP}_${windowId}`);
		return (
			<ClassicyWindowMenuBar
				appId={APP}
				windowId={windowId}
				menuItems={[edit]}
			/>
		);
	};
	// A window: its root (`active` while it is the active window), its bar
	// and a field.
	const Window = ({
		windowId,
		active,
	}: {
		windowId: string;
		active: boolean;
	}) => (
		<div className={`classicyWindow${active ? " active" : ""}`} id={windowId}>
			<Bar windowId={windowId} />
			<input aria-label={`field ${windowId}`} defaultValue="hello world" />
		</div>
	);
	const rowsOf = (menuId: string) =>
		Array.from(
			document.querySelectorAll(
				`[id="${menuId}"] > .classicyMenuWrapper > ul > *`,
			),
		).map((row) =>
			row.tagName === "HR"
				? "—"
				: (row.querySelector(":scope > p")?.textContent ?? "").trim(),
		);
	const field = (windowId: string) =>
		screen.getByLabelText(`field ${windowId}`) as HTMLInputElement;
	const choose = async (windowId: string, id: string) => {
		const item = document.getElementById(
			`${APP}_${windowId}_${id}`,
		) as HTMLElement;
		fireEvent.click(item);
		dispatchAnimationEnd(item);
		await waitFor(() => expect(item).not.toHaveClass("pressed"));
	};

	beforeEach(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		registerClassicyAppearancePackage({
			id: PACKAGE_ID,
			name: "Windows 98 edit",
			css: "",
			defaults: {
				...getTheme("default"),
				id: `${PACKAGE_ID}-default`,
				package: PACKAGE_ID,
			},
			layout: windows98.layout as never,
		});
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: PACKAGE_ID,
			}),
		);
	});
	afterEach(() => {
		cleanup();
		unregisterClassicyAppearancePackage(PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("draws Notepad's Edit menu: Undo, Cut, Copy, Paste, Delete with Del, Select All", () => {
		render(<Window windowId="a" active />);
		const rows = rowsOf(`${APP}_a_edit`);
		expect(rows.map((row) => row.replace(/\s.*$/, ""))).toEqual([
			"Undo",
			"—",
			"Cut",
			"Copy",
			"Paste",
			"Delete",
			"—",
			"Select",
		]);
		expect(rows.join(" ")).not.toContain("Can't Undo");
		expect(rows[5]).toContain("Del");
	});

	it("selects in its own window's field only", async () => {
		const { rerender } = render(
			<>
				<Window windowId="a" active />
				<Window windowId="b" active={false} />
			</>,
		);
		const a = field("a");
		act(() => {
			a.focus();
			a.setSelectionRange(0, 0);
		});
		// Window b becomes the active one: its Select All leaves a's field be.
		rerender(
			<>
				<Window windowId="a" active={false} />
				<Window windowId="b" active />
			</>,
		);
		await choose("b", "select_all");
		expect([a.selectionStart, a.selectionEnd]).toEqual([0, 0]);
		// Window a active again: its own Select All selects its field.
		rerender(
			<>
				<Window windowId="a" active />
				<Window windowId="b" active={false} />
			</>,
		);
		act(() => a.focus());
		await choose("a", "select_all");
		expect([a.selectionStart, a.selectionEnd]).toEqual([0, 11]);
	});
});

// Shell addendum B8 (App. B Table B.2, p.358; Table B.5, p.360): a window
// bar's menu-bar mode marks the title the keyboard tracks as the package's
// sunken rule reads it, the root list `focused` and the title focused.
describe("a window bar's menu-bar mode under Windows 98's layout (B8)", () => {
	const PACKAGE_ID = "test-windows98-bar-mode";
	beforeEach(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		registerClassicyAppearancePackage({
			id: PACKAGE_ID,
			name: "Windows 98 bar mode",
			css: "",
			defaults: {
				...getTheme("default"),
				id: `${PACKAGE_ID}-default`,
				package: PACKAGE_ID,
			},
			layout: windows98.layout as never,
		});
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: PACKAGE_ID,
			}),
		);
	});
	afterEach(() => {
		cleanup();
		unregisterClassicyAppearancePackage(PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("focuses the first title in a focused root list on F10, and Right moves it", () => {
		const { container } = render(
			<ClassicyWindowMenuBar
				appId="Notes.app"
				windowId="a"
				menuItems={[
					{
						id: "Notes.app_a_file",
						title: "File",
						menuChildren: [{ id: "Notes.app_a_new", title: "New" }],
					},
					{
						id: "Notes.app_a_view",
						title: "View",
						menuChildren: [{ id: "Notes.app_a_zoom", title: "Zoom" }],
					},
				]}
			/>,
		);
		const list = container.querySelector(
			".classicyWindowMenuBar > .classicyMenuWrapper > ul",
		) as HTMLElement;
		expect(list).not.toHaveClass("focused");
		act(() => {
			fireEvent.keyDown(window, { key: "F10", code: "F10" });
		});
		const file = document.getElementById("Notes.app_a_file");
		expect(document.activeElement).toBe(file);
		expect(list).toHaveClass("focused");
		act(() => {
			fireEvent.keyDown(file as HTMLElement, { key: "ArrowRight" });
		});
		expect(document.activeElement).toBe(
			document.getElementById("Notes.app_a_view"),
		);
		expect(list).toHaveClass("focused");
		// No ⌥H: the bar's Help has no balloon toggle (B19).
		expect(document.getElementById("help-toggle-balloons")).toBeNull();
	});
});
