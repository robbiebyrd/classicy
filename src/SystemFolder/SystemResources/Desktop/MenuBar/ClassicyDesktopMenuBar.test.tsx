import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the test package's theme names.
import "../../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { resetClassicyDimmedIconsForTests } from "@/Appearance/ClassicyIconDimming.internal";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
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
	windows: {},
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
					windows: {},
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

		// Exactly once: there is now a single document keydown listener (the
		// central dispatcher), so the action can't double-fire.
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
					windows: {},
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

		const system = useAppManager.getState().System.Manager.Keyboard.system;
		// option+h = Show/Hide Balloons (a real working equivalent).
		expect(system).toEqual(expect.arrayContaining(["option+h"]));
		// "About This Computer" has no keyboard equivalent in the real Mac OS, so
		// the previously-invented control+s chord must not be registered.
		expect(system).not.toContain("control+s");
	});
});

describe("ClassicyDesktopMenuBar — App Switcher width stability", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	const app = (
		id: string,
		name: string,
		extra: Partial<ClassicyStoreSystemApp> = {},
	): ClassicyStoreSystemApp => ({
		id,
		name,
		icon: `/icons/${name}.png`,
		windows: {},
		open: true,
		focused: false,
		data: {},
		...extra,
	});

	it("reserves the width of every open app's name so the switcher never resizes", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder", { focused: true }),
				"PictureViewer.app": app("PictureViewer.app", "PictureViewer"),
				"SimpleText.app": app("SimpleText.app", "SimpleText"),
			};
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});

		render(<ClassicyDesktopMenuBar />);

		const switcher = document.querySelector("#app-switcher");
		const reserved = [
			...(switcher?.querySelectorAll(
				":scope > p .classicyMenuItemTitleSample",
			) ?? []),
		].map((s) => s.textContent);
		expect(reserved).toEqual(["PictureViewer", "SimpleText"]);
	});

	it("does not reserve width for background extensions", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder", { focused: true }),
				"AppleGuide.app": app("AppleGuide.app", "AnExtremelyLongExtension", {
					extension: true,
				}),
			};
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});

		render(<ClassicyDesktopMenuBar />);

		const switcher = document.querySelector("#app-switcher");
		expect(
			switcher?.querySelector(":scope > p .classicyMenuItemTitleSample"),
		).toBeNull();
	});
});

describe("ClassicyDesktopMenuBar — sticky menus close on an outside mouse-down", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("keeps an open menu through a mouse-down on the bar, and closes it on one outside", () => {
		render(<ClassicyDesktopMenuBar />);
		const apple = document.querySelector<HTMLElement>(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.click(apple.querySelector("p") ?? apple);
		expect(apple).toHaveClass("open");
		fireEvent.mouseDown(apple);
		expect(apple).toHaveClass("open");
		fireEvent.mouseDown(document.body);
		expect(apple).not.toHaveClass("open");
	});
});

// Story 0214-c61: the Application menu lists Hide <app>, Hide Others and
// Show All, each dimmed when it does nothing, a divider, then each open
// application with its small icon, the front one checked (HIG7 p.127,
// 7.5.5's `*-755-appmenu-open.png`).
describe("ClassicyDesktopMenuBar — the Application menu's commands", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	const app = (
		id: string,
		name: string,
		extra: Partial<ClassicyStoreSystemApp> = {},
	): ClassicyStoreSystemApp => ({
		id,
		name,
		icon: `/icons/${name}.png`,
		windows: {},
		open: true,
		focused: false,
		data: {},
		...extra,
	});

	/** The open switcher's items: [id, title, dimmed, checked, has image]. */
	const items = () => {
		const switcher = document.querySelector("#app-switcher") as HTMLElement;
		fireEvent.click(switcher.querySelector("p") ?? switcher);
		return [
			...switcher.querySelectorAll(":scope .classicyMenuWrapper ul > *"),
		].map((li) =>
			li.querySelector("p")
				? [
						li.id,
						li.querySelector("p")?.textContent,
						li.classList.contains("disabled"),
						li.querySelector(".classicyMenuItemCheck.checked") !== null,
						li.querySelector("p > img") !== null,
						...(li.classList.contains("classicyDesktopMenuAppHidden")
							? ["hidden"]
							: []),
					]
				: ["divider"],
		);
	};

	it("dims every command with only the Finder open", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder", { focused: true }),
			};
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});
		render(<ClassicyDesktopMenuBar />);
		expect(items()).toEqual([
			["app-switcher_hide", "Hide Finder", true, false, false],
			["app-switcher_hide-others", "Hide Others", true, false, false],
			["app-switcher_show-all", "Show All", true, false, false],
			["divider"],
			["Finder.app", "Finder", false, true, true],
		]);
	});

	it("enables Hide and Hide Others with another app shown, Show All with one hidden", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder"),
				"SimpleText.app": app("SimpleText.app", "SimpleText", {
					focused: true,
				}),
				"Notes.app": app("Notes.app", "Notes", { hidden: true }),
			};
			draft.System.Manager.Applications.focusedAppId = "SimpleText.app";
		});
		render(<ClassicyDesktopMenuBar />);
		expect(items()).toEqual([
			["app-switcher_hide", "Hide SimpleText", false, false, false],
			["app-switcher_hide-others", "Hide Others", false, false, false],
			["app-switcher_show-all", "Show All", false, false, false],
			["divider"],
			["Finder.app", "Finder", false, false, true],
			["SimpleText.app", "SimpleText", false, true, true],
			["Notes.app", "Notes", false, false, true, "hidden"],
		]);
	});

	it("keeps the front application while an extension holds focus", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder"),
				"SimpleText.app": app("SimpleText.app", "SimpleText", {
					lastFocusedAt: 5,
				}),
				"Guide.app": app("Guide.app", "Guide", {
					focused: true,
					extension: true,
				}),
			};
			draft.System.Manager.Applications.focusedAppId = "Guide.app";
		});
		render(<ClassicyDesktopMenuBar />);
		// The extension's window floats over SimpleText, the app last in use:
		// the bar's front application (story 0233-c79).
		const [hide, hideOthers] = items();
		expect(hide.slice(0, 3)).toEqual([
			"app-switcher_hide",
			"Hide SimpleText",
			false,
		]);
		expect(hideOthers.slice(0, 3)).toEqual([
			"app-switcher_hide-others",
			"Hide Others",
			false,
		]);
	});
});

// Story 0214-c61 fix round 3: a hidden application's icon is drawn with the
// active package's dimming rule (`iconDimming.hiddenApp`), on a canvas.
describe("ClassicyDesktopMenuBar — a hidden application's dimmed icon", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		resetClassicyAppearancePackagesForTests();
		resetClassicyDimmedIconsForTests();
	});
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		resetClassicyDimmedIconsForTests();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("draws only the hidden application's icon dimmed", async () => {
		registerClassicyAppearancePackage({
			id: "platinum",
			name: "Test",
			css: "",
			defaults: { ...getTheme("default"), package: "platinum" },
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
			iconDimming: {
				hiddenApp: { blend: { color: "#FFFFFF", amount: 0.5 }, bits: 4 },
			},
		});
		// A constructor (\`new Image()\`): an <img> that loads at once.
		vi.stubGlobal(
			"Image",
			class {
				constructor() {
					const img = document.createElement("img");
					Object.defineProperty(img, "naturalWidth", { value: 16 });
					Object.defineProperty(img, "naturalHeight", { value: 16 });
					queueMicrotask(() => img.onload?.(new Event("load")));
					// biome-ignore lint/correctness/noConstructorReturn: stands in for an HTMLImageElement
					return img;
				}
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() =>
				({
					drawImage: vi.fn(),
					getImageData: vi.fn(() => ({
						data: new Uint8ClampedArray(16 * 16 * 4),
					})),
					putImageData: vi.fn(),
				}) as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
			"data:image/png;base64,DIMMED",
		);
		const base = { windows: {}, open: true, data: {} };
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": {
					...base,
					id: "Finder.app",
					name: "Finder",
					icon: "/icons/Finder.png",
					focused: true,
				},
				"Notes.app": {
					...base,
					id: "Notes.app",
					name: "Notes",
					icon: "/icons/Notes.png",
					focused: false,
					hidden: true,
				},
			};
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
		});
		render(<ClassicyDesktopMenuBar />);
		const switcher = document.querySelector("#app-switcher") as HTMLElement;
		fireEvent.click(switcher.querySelector("p") ?? switcher);
		const img = (id: string) =>
			switcher.querySelector(`[id="${id}"] > p > img`) as HTMLImageElement;
		await waitFor(() =>
			expect(img("Notes.app").getAttribute("src")).toBe(
				"data:image/png;base64,DIMMED",
			),
		);
		expect(img("Notes.app").classList).toContain("classicyIconDimmedImage");
		expect(img("Finder.app").getAttribute("src")).not.toBe(
			"data:image/png;base64,DIMMED",
		);
	});
});
