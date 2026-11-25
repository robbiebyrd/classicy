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
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

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
				"help-toggle-balloons",
				"—",
				"host_finder_tips",
				"—",
				"own_shortcuts",
				"—",
				`${APP}_about`,
			]);
			expect(rowTitle("help-toggle-balloons")).toBe("Hide Balloons");
			// About, with no ellipsis, by the app's name (WIG p.99).
			expect(rowTitle(`${APP}_about`)).toBe("About Finder");
			// Finder's own balloon toggle repeats the system's and is dropped.
			expect(
				document.getElementById(`${APP}_${WINDOW}_help_balloon`),
			).toBeNull();
		});

		it("keeps the About item's handler", async () => {
			renderBar();
			const item = document.getElementById(`${APP}_about`) as HTMLElement;
			fireEvent.click(item);
			dispatchAnimationEnd(item);
			await waitFor(() => expect(about).toHaveBeenCalledTimes(1));
		});

		it("toggles balloon help from the system item", async () => {
			renderBar();
			const item = document.getElementById(
				"help-toggle-balloons",
			) as HTMLElement;
			fireEvent.click(item);
			dispatchAnimationEnd(item);
			await waitFor(() =>
				expect(
					useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
				).toBe(true),
			);
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
			expect(rows(shellHelpId)).toEqual([
				"help-about-balloon",
				"help-toggle-balloons",
			]);
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
