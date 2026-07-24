import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** Replace the whole store with defaults plus the given mutations. */
function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

function appleSubmenu(): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		"#apple-menu .classicyMenuWrapper ul",
	);
}

const pdfApp: ClassicyStoreSystemApp = {
	id: "PDFViewer.app",
	name: "PDFViewer",
	icon: "/icons/pdf.png",
	windows: [],
	open: true,
	focused: true,
	data: {},
};

describe("ClassicyDesktopMenuBar — About <app> in the Apple menu (HIG #209)", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("prepends 'About <focused app>' as the first Apple-menu item", () => {
		const aboutClick = vi.fn();
		const appMenu: ClassicyMenuItem[] = [
			{
				id: "PDFViewer.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "PDFViewer.app_about",
						title: "About",
						onClickFunc: aboutClick,
					},
				],
			},
		];

		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": {
					id: "Finder.app",
					name: "Finder",
					icon: "/icons/finder.png",
					windows: [],
					open: true,
					focused: false,
					data: {},
				},
				"PDFViewer.app": pdfApp,
			};
			draft.System.Manager.Applications.focusedAppId = "PDFViewer.app";
			draft.System.Manager.Desktop.appMenu = appMenu;
		});

		render(<ClassicyDesktopMenuBar />);

		const submenu = appleSubmenu();
		expect(submenu).not.toBeNull();
		const firstItem = submenu?.querySelector("li");
		expect(firstItem?.id).toBe("PDFViewer.app_about_apple");
		expect(firstItem).toHaveTextContent("About PDFViewer");
		// aboutClick is the handler pulled from the app's About entry; keeping the
		// reference alive documents that it is the value forwarded onto the item.
		expect(aboutClick).not.toHaveBeenCalled();
	});

	it("reflects the focused app in the About title", () => {
		const appMenu: ClassicyMenuItem[] = [
			{
				id: "Finder.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "Finder.app_about",
						title: "About",
						onClickFunc: vi.fn(),
					},
				],
			},
		];

		setStore((draft) => {
			// Finder is the focused app (default), a different app supplies no menu.
			draft.System.Manager.Desktop.appMenu = appMenu;
		});

		render(<ClassicyDesktopMenuBar />);

		const firstItem = appleSubmenu()?.querySelector("li");
		expect(firstItem?.id).toBe("Finder.app_about_apple");
		expect(firstItem).toHaveTextContent("About Finder");
	});

	it("falls back to the unchanged system menu when no app About exists", () => {
		setStore((draft) => {
			// appMenu present but with no About entry anywhere.
			draft.System.Manager.Desktop.appMenu = [
				{
					id: "PDFViewer.app_file",
					title: "File",
					menuChildren: [{ id: "noop", title: "Nothing" }],
				},
			];
		});

		render(<ClassicyDesktopMenuBar />);

		const firstItem = appleSubmenu()?.querySelector("li");
		// The default systemMenu's leading entry is "About This Computer".
		expect(firstItem?.id).toBe("about");
		expect(firstItem).toHaveTextContent("About This Computer");
	});
});

describe("ClassicyDesktopMenuBar — About is moved (not copied) into the Apple menu", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	function focusPdfAppWithMenu(appMenu: ClassicyMenuItem[]): void {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"PDFViewer.app": pdfApp,
			};
			draft.System.Manager.Applications.focusedAppId = "PDFViewer.app";
			draft.System.Manager.Desktop.appMenu = appMenu;
		});
	}

	it("strips the hoisted About item from the app's own menus", () => {
		focusPdfAppWithMenu([
			{
				id: "PDFViewer.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "PDFViewer.app_help_balloon",
						title: "Hide Balloon Help",
						onClickFunc: vi.fn(),
					},
					{
						id: "PDFViewer.app_about",
						title: "About",
						onClickFunc: vi.fn(),
					},
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		// Hoisted copy is in the Apple menu…
		expect(document.getElementById("PDFViewer.app_about_apple")).not.toBeNull();
		// …and the original is gone from the app's Help menu.
		expect(document.getElementById("PDFViewer.app_about")).toBeNull();
		// Sibling items survive the strip.
		expect(
			document.getElementById("PDFViewer.app_help_balloon"),
		).not.toBeNull();
	});

	it("drops an app menu left empty by the About strip", () => {
		focusPdfAppWithMenu([
			{
				id: "PDFViewer.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "PDFViewer.app_about",
						title: "About",
						onClickFunc: vi.fn(),
					},
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(document.getElementById("PDFViewer.app_about_apple")).not.toBeNull();
		// Help held only About — the whole menu disappears rather than render empty.
		expect(document.getElementById("PDFViewer.app_help")).toBeNull();
	});

	it("removes a spacer left dangling at the top of a stripped menu", () => {
		focusPdfAppWithMenu([
			{
				id: "PDFViewer.app_file",
				title: "File",
				menuChildren: [
					{
						id: "PDFViewer.app_about",
						title: "About PDFViewer",
						onClickFunc: vi.fn(),
					},
					{ id: "spacer" },
					{
						id: "PDFViewer.app_quit",
						title: "Quit",
						onClickFunc: vi.fn(),
					},
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(document.getElementById("PDFViewer.app_about")).toBeNull();
		const fileMenu = document.getElementById("PDFViewer.app_file");
		expect(fileMenu).not.toBeNull();
		// First remaining child is Quit, not the orphaned divider.
		const firstChild = fileMenu?.querySelector(".classicyMenuWrapper ul li");
		expect(firstChild?.id).toBe("PDFViewer.app_quit");
	});
});

describe("ClassicyDesktopMenuBar — app-wide keyboard shortcuts (HIG #187)", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("fires the matching menu item's action on a command-key press while no menu is open", () => {
		const openClick = vi.fn();
		const appMenu: ClassicyMenuItem[] = [
			{
				id: "PDFViewer.app_file",
				title: "File",
				menuChildren: [
					{
						id: "PDFViewer.app_open",
						title: "Open…",
						keyboardShortcut: "Cmd+O",
						onClickFunc: openClick,
					},
				],
			},
		];

		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"PDFViewer.app": pdfApp,
			};
			draft.System.Manager.Applications.focusedAppId = "PDFViewer.app";
			draft.System.Manager.Desktop.appMenu = appMenu;
		});

		render(<ClassicyDesktopMenuBar />);

		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "o",
					metaKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
		});

		// Exactly once: the two document listeners (this one + ClassicyMenu's root
		// listener) coordinate via defaultPrevented so the action never double-fires.
		expect(openClick).toHaveBeenCalledTimes(1);
	});

	it("ignores keystrokes that match no shortcut", () => {
		const openClick = vi.fn();
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenu = [
				{
					id: "PDFViewer.app_file",
					title: "File",
					menuChildren: [
						{
							id: "PDFViewer.app_open",
							title: "Open…",
							keyboardShortcut: "Cmd+O",
							onClickFunc: openClick,
						},
					],
				},
			];
		});

		render(<ClassicyDesktopMenuBar />);

		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "k",
					metaKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
		});

		expect(openClick).not.toHaveBeenCalled();
	});
});

describe("ClassicyDesktopMenuBar — shortcut auto-registration (Keyboard registry)", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("registers the focused app's menu chords under its appId", async () => {
		const appMenu: ClassicyMenuItem[] = [
			{
				id: "view",
				title: "View",
				menuChildren: [{ id: "t", title: "Tools", keyboardShortcut: "Ctrl+T" }],
			},
		];

		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"HyperCard.app": {
					id: "HyperCard.app",
					name: "HyperCard",
					icon: "/icons/hypercard.png",
					windows: [],
					open: true,
					focused: true,
					data: {},
				},
			};
			draft.System.Manager.Applications.focusedAppId = "HyperCard.app";
			draft.System.Manager.Desktop.appMenu = appMenu;
		});

		await act(async () => {
			render(<ClassicyDesktopMenuBar />);
		});

		expect(
			useAppManager.getState().System.Manager.Keyboard.app["HyperCard.app"],
		).toEqual(expect.arrayContaining(["control+t"]));
	});

	it("registers system + Help chords under the system scope", async () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenu = [];
		});

		await act(async () => {
			render(<ClassicyDesktopMenuBar />);
		});

		expect(useAppManager.getState().System.Manager.Keyboard.system).toEqual(
			expect.arrayContaining(["control+s", "option+h"]),
		);
	});
});
