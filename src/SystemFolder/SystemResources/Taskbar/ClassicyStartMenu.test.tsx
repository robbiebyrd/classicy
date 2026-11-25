import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, waitFor } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_LAYOUT,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { noteClassicyRecentDocument } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import { trashClassicyFileSystemItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { CLASSICY_START_MENU_ID } from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import {
	classicyDesktopHasOpenModal,
	isClassicyStartMenuKey,
} from "@/SystemFolder/SystemResources/Taskbar/useClassicyTaskbarKeys.internal";

// Plan 0020-w98 §3, "The Start menu", and §2 "Keyboard": the menu the
// taskbar's Start button opens, its placement above the taskbar's band, its
// banner, its keyboard, and CTRL+ESC. jsdom lays nothing out: the boxes are
// stubbed (a 640 × 480 desktop, a 28 px taskbar along its foot, the Start
// button in it, a 160 × 200 menu).

const DESKTOP = { left: 0, top: 0, width: 640, height: 480 };
const TASKBAR_HEIGHT = 28;
const START = { left: 2, top: 454, right: 56, bottom: 476 };
const MENU = { width: 160, height: 200 };

const BANNER_PACKAGE_ID = "test-taskbar-banner";

const box = (left: number, top: number, width: number, height: number) =>
	DOMRect.fromRect({ x: left, y: top, width, height });
const pxOf = (value: string) => Number.parseFloat(value) || 0;

const menu = () => document.getElementById(CLASSICY_START_MENU_ID);
const start = () =>
	document.querySelector(".classicyTaskbarStart") as HTMLButtonElement;
const item = (id: string) => document.getElementById(id) as HTMLElement;
const ctrlEscape = (target: Element = document.body, init = {}) =>
	fireEvent.keyDown(target, {
		key: "Escape",
		code: "Escape",
		ctrlKey: true,
		...init,
	});

const activate = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const renderTaskbar = () =>
	render(
		<div className="classicyDesktop" id="classicyDesktop">
			<ClassicyTaskbar />
		</div>,
	);

describe("the Start menu", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		registerTestTaskbarPackage();
		registerTestTaskbarPackage(
			{
				...TEST_TASKBAR_LAYOUT,
				taskbar: {
					startLabel: "Start",
					startBanner: { title: "Classicy", edition: "98" },
				},
			},
			BANNER_PACKAGE_ID,
		);
		activate(TEST_TASKBAR_PACKAGE_ID);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				if (this.classList.contains("classicyDesktop"))
					return box(DESKTOP.left, DESKTOP.top, DESKTOP.width, DESKTOP.height);
				if (this.classList.contains("classicyTaskbarStart"))
					return box(
						START.left,
						START.top,
						START.right - START.left,
						START.bottom - START.top,
					);
				const surface = this.closest(".classicyBevelButtonPopup");
				if (
					surface &&
					(this === surface || (this.tagName === "UL" && !this.closest("li")))
				) {
					const style = (surface as HTMLElement).style;
					return box(
						pxOf(style.left),
						pxOf(style.top),
						MENU.width,
						MENU.height,
					);
				}
				return box(0, 0, 0, 0);
			},
		);
		const computed = window.getComputedStyle;
		vi.spyOn(window, "getComputedStyle").mockImplementation(
			(el: Element, pseudo?: string | null) =>
				pseudo
					? ({ content: "none" } as unknown as CSSStyleDeclaration)
					: computed.call(window, el),
		);
		const original = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			"offsetHeight",
		);
		Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
			configurable: true,
			get(this: HTMLElement) {
				return this.classList.contains("classicyTaskbar") ? TASKBAR_HEIGHT : 0;
			},
		});
		restoreOffsetHeight = () => {
			if (original)
				Object.defineProperty(HTMLElement.prototype, "offsetHeight", original);
		};
	});

	let restoreOffsetHeight = () => {};

	afterEach(() => {
		restoreOffsetHeight();
		vi.restoreAllMocks();
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(BANNER_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("opens from the Start button as a menu named by its label, which the button controls", () => {
		renderTaskbar();
		expect(start()).not.toHaveAttribute("aria-controls");
		fireEvent.mouseDown(start(), { button: 0 });
		const surface = menu();
		expect(surface).not.toBeNull();
		expect(surface).toHaveAttribute("role", "menu");
		expect(surface).toHaveAttribute("aria-label", "Start");
		expect(surface).toHaveClass(
			"classicyBevelButtonPopup",
			"classicyStartMenu",
		);
		expect(start()).toHaveClass("open");
		expect(start()).toHaveAttribute("aria-expanded", "true");
		expect(start()).toHaveAttribute("aria-controls", CLASSICY_START_MENU_ID);
		// The first level, top to bottom.
		const firstLevel = Array.from(
			surface?.querySelectorAll(
				":scope > .classicyMenuWrapper > ul > li.classicyMenuItem",
			) ?? [],
			(li) => li.textContent,
		);
		expect(firstLevel).toEqual([
			"About This Computer",
			expect.stringMatching(/^Programs/),
			expect.stringMatching(/^Documents/),
			expect.stringMatching(/^Settings/),
			"Help",
			"Run...",
			"Empty Trash…",
			"Reset PRAM…",
			"Shut Down...",
		]);
	});

	// Plan 0020-w98 E2: Log Off <name>... for a signed-in user, Documents
	// from the session's opens, and the shell's dialogs from their items.
	it("shows Log Off <name>... only for the taskbar's user name", () => {
		const { unmount } = render(
			<div className="classicyDesktop" id="classicyDesktop">
				<ClassicyTaskbar userName="Ada" />
			</div>,
		);
		fireEvent.mouseDown(start(), { button: 0 });
		expect(item("start-menu_log-off")).toHaveTextContent("Log Off Ada...");
		unmount();
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		expect(document.getElementById("start-menu_log-off")).toBeNull();
	});

	it("lists under Documents the session's documents that still exist, by name with their icons", () => {
		noteClassicyRecentDocument("Macintosh HD:Gone.txt");
		noteClassicyRecentDocument("Macintosh HD:Documents:Read Me.txt");
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		const documents = item("start-menu_documents").querySelectorAll(
			"li.classicyMenuItem",
		);
		expect(Array.from(documents, (li) => li.textContent)).toEqual([
			"Read Me.txt",
		]);
		expect(documents[0].querySelector("img")?.getAttribute("src")).toBeTruthy();
	});

	it('shows "(Empty)" under Documents before any document opens', () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		expect(item("start-menu_documents_empty")).toHaveTextContent("(Empty)");
	});

	it("opens Run and Shut Down Windows from their items, closing the menu", async () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		fireEvent.click(item("start-menu_run"));
		await waitFor(() =>
			expect(useAppManager.getState().System.Manager.Desktop.systemDialog).toBe(
				"run",
			),
		);
		expect(menu()).toBeNull();
		act(() =>
			dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: null }),
		);
		fireEvent.mouseDown(start(), { button: 0 });
		fireEvent.click(item("start-menu_shut-down"));
		await waitFor(() =>
			expect(useAppManager.getState().System.Manager.Desktop.systemDialog).toBe(
				"shutDown",
			),
		);
	});

	it("opens upward onto the taskbar band's top edge, at the Start button's left, inside the desktop", () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		const surface = menu() as HTMLElement;
		expect(surface.style.visibility).toBe("");
		// Below the button there is no room (the menu bounds end at the
		// band), so it flips above it and sits on the band's top edge.
		expect(pxOf(surface.style.top)).toBe(
			DESKTOP.height - TASKBAR_HEIGHT - MENU.height,
		);
		expect(pxOf(surface.style.left)).toBe(START.left);
		// Flush on that edge, its menu fits and is drawn whole: its scroll
		// cap keeps no margin from the band (the pop-up menus' 4 px would
		// have it scroll by that much).
		const list = surface.querySelector(
			":scope > .classicyMenuWrapper > ul",
		) as HTMLElement;
		expect(list).not.toHaveClass("classicyMenuListScrolls");
		expect(list.style.maxHeight).toBe("");
		expect(
			document.querySelector('[data-classicy-part="menu-scroll-down"]'),
		).toBeNull();
	});

	// Plan 0020-w98 E4: toward the desktop from a taskbar on any edge.
	it("opens beside the Start button, to its right, from a taskbar at the left", () => {
		act(() =>
			dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "left" }),
		);
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		const surface = menu() as HTMLElement;
		expect(pxOf(surface.style.left)).toBe(START.right);
		expect(pxOf(surface.style.top)).toBeLessThanOrEqual(START.top);
	});

	it("opens below the Start button from a taskbar along the top", () => {
		act(() => dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "top" }));
		vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(
			function (this: Element) {
				if (this.classList.contains("classicyDesktop"))
					return box(DESKTOP.left, DESKTOP.top, DESKTOP.width, DESKTOP.height);
				if (this.classList.contains("classicyTaskbarStart"))
					return box(2, 4, 54, 22);
				const surface = this.closest(".classicyBevelButtonPopup");
				if (
					surface &&
					(this === surface || (this.tagName === "UL" && !this.closest("li")))
				) {
					const style = (surface as HTMLElement).style;
					return box(
						pxOf(style.left),
						pxOf(style.top),
						MENU.width,
						MENU.height,
					);
				}
				return box(0, 0, 0, 0);
			},
		);
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		// The menu bounds start under the band, so it sits on the band's
		// bottom edge, as Windows' does from a top taskbar.
		expect(pxOf((menu() as HTMLElement).style.top)).toBe(TASKBAR_HEIGHT);
	});

	describe("the banner", () => {
		// Taskbar Properties' "Show small icons in Start menu" (plan 0020-w98
		// E4): the first level's small icons, and no banner, as Windows 98.
		it("is dropped, and the menu takes small icons, under Show small icons in Start menu", () => {
			activate(BANNER_PACKAGE_ID);
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { smallStartMenuIcons: true },
				}),
			);
			renderTaskbar();
			fireEvent.mouseDown(start(), { button: 0 });
			const surface = menu() as HTMLElement;
			expect(surface).toHaveClass(
				"classicyStartMenu",
				"classicyStartMenuSmallIcons",
			);
			expect(surface.querySelector(".classicyStartMenuBanner")).toBeNull();
			expect(surface.firstElementChild).toHaveClass("classicyMenuWrapper");
		});

		it("is drawn, with large icons, by default", () => {
			activate(BANNER_PACKAGE_ID);
			renderTaskbar();
			fireEvent.mouseDown(start(), { button: 0 });
			expect(menu()).not.toHaveClass("classicyStartMenuSmallIcons");
			expect(menu()?.querySelector(".classicyStartMenuBanner")).not.toBeNull();
		});

		it("is the surface's first child under a layout with a startBanner: the title, then the edition", () => {
			activate(BANNER_PACKAGE_ID);
			renderTaskbar();
			fireEvent.mouseDown(start(), { button: 0 });
			const surface = menu() as HTMLElement;
			const banner = surface.firstElementChild as HTMLElement;
			expect(banner).toHaveClass("classicyStartMenuBanner");
			expect(banner).toHaveAttribute("data-classicy-part", "start-menu-banner");
			expect(banner).toHaveAttribute("aria-hidden", "true");
			expect(
				Array.from(banner.children, (el) => [el.className, el.textContent]),
			).toEqual([
				["classicyStartMenuBannerTitle", "Classicy"],
				["classicyStartMenuBannerEdition", "98"],
			]);
			expect(banner.nextElementSibling).toHaveClass("classicyMenuWrapper");
		});

		it("draws no edition when the banner has none", () => {
			registerTestTaskbarPackage(
				{
					...TEST_TASKBAR_LAYOUT,
					taskbar: { startBanner: { title: "Classicy" } },
				},
				BANNER_PACKAGE_ID,
			);
			activate(BANNER_PACKAGE_ID);
			renderTaskbar();
			fireEvent.mouseDown(start(), { button: 0 });
			const banner = menu()?.querySelector(".classicyStartMenuBanner");
			expect(banner?.children).toHaveLength(1);
			expect(banner).toHaveTextContent("Classicy");
		});

		it("is absent under a layout without one", () => {
			renderTaskbar();
			fireEvent.mouseDown(start(), { button: 0 });
			expect(menu()?.querySelector(".classicyStartMenuBanner")).toBeNull();
			expect(menu()?.firstElementChild).toHaveClass("classicyMenuWrapper");
		});
	});

	it("draws Empty Trash… with the Trash art, full while anything is in the Trash", () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		const art = () =>
			item("start_special_empty_trash")
				.querySelector("img")
				?.getAttribute("src");
		const empty = resolveClassicyAsset("systemArt", "trashEmpty");
		const full = resolveClassicyAsset("systemArt", "trashFull");
		expect(empty).toBeTruthy();
		expect(full).not.toBe(empty);
		expect(art()).toBe(empty);
		act(() => {
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Documents:Old Note.txt", "");
			trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Old Note.txt"]);
		});
		expect(art()).toBe(full);
	});

	it("closes on a choice, and runs it", async () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		fireEvent.click(item("start_special_reset_pram"));
		await waitFor(() =>
			expect(useAppManager.getState().System.Manager.Desktop.systemDialog).toBe(
				"resetPram",
			),
		);
		expect(menu()).toBeNull();
		expect(start()).not.toHaveClass("open");
		expect(start()).toHaveAttribute("aria-expanded", "false");
	});

	it("closes on a press outside it, but a press on the Start button closes it only once", () => {
		renderTaskbar();
		fireEvent.mouseDown(start(), { button: 0 });
		fireEvent.mouseDown(document.body, { button: 0 });
		expect(menu()).toBeNull();
		fireEvent.mouseDown(start(), { button: 0 });
		expect(menu()).not.toBeNull();
		fireEvent.mouseDown(start(), { button: 0 });
		expect(menu()).toBeNull();
		expect(start()).not.toHaveClass("open");
	});

	describe("the keyboard", () => {
		it("opens with no item selected; Down selects the first item and Up the last", () => {
			renderTaskbar();
			start().focus();
			fireEvent.click(start(), { detail: 0 });
			expect(menu()).not.toBeNull();
			expect(document.activeElement).toBe(start());
			fireEvent.keyDown(start(), { key: "ArrowDown" });
			expect(document.activeElement).toBe(item("start-menu_about"));

			fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
			fireEvent.click(start(), { detail: 0 });
			fireEvent.keyDown(start(), { key: "ArrowUp" });
			expect(document.activeElement).toBe(item("start-menu_shut-down"));
		});

		it("walks the items shown, passing over a closed submenu's", () => {
			renderTaskbar();
			start().focus();
			fireEvent.click(start(), { detail: 0 });
			fireEvent.keyDown(start(), { key: "ArrowDown" });
			const walk = () => {
				fireEvent.keyDown(document.activeElement as Element, {
					key: "ArrowDown",
				});
				return (document.activeElement as HTMLElement).id;
			};
			expect([walk(), walk(), walk(), walk()]).toEqual([
				"start-menu_programs",
				"start-menu_documents",
				"start-menu_settings",
				"start-menu_help",
			]);
			// Settings opened (Return): its items are shown, so walked.
			fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
			fireEvent.keyDown(item("start-menu_settings"), { key: "Enter" });
			expect(item("start-menu_settings")).toHaveClass("open");
			expect(walk()).toBe("start-menu_control-panel");
		});

		it("walks a submenu's dimmed item too, as Windows' menu loop does", () => {
			renderTaskbar();
			start().focus();
			fireEvent.click(start(), { detail: 0 });
			fireEvent.keyDown(start(), { key: "ArrowDown" });
			fireEvent.keyDown(document.activeElement as Element, {
				key: "ArrowDown",
			});
			expect(document.activeElement).toBe(item("start-menu_programs"));
			// No app is mounted: Programs holds its dimmed "(Empty)" alone.
			fireEvent.keyDown(item("start-menu_programs"), { key: "Enter" });
			expect(item("start-menu_programs")).toHaveClass("open");
			fireEvent.keyDown(document.activeElement as Element, {
				key: "ArrowDown",
			});
			expect(document.activeElement).toBe(item("start-menu_programs_empty"));
			expect(item("start-menu_programs_empty")).toHaveClass("disabled");
		});

		it("never closes for idleness, as the Mac's sticky menus do after 15 s", () => {
			vi.useFakeTimers();
			try {
				renderTaskbar();
				fireEvent.mouseDown(start(), { button: 0 });
				act(() => {
					vi.advanceTimersByTime(60_000);
				});
				expect(menu()).not.toBeNull();
				expect(start()).toHaveClass("open");
			} finally {
				vi.useRealTimers();
			}
		});

		it("closes on Escape, handing the focus back to the Start button", () => {
			renderTaskbar();
			start().focus();
			fireEvent.click(start(), { detail: 0 });
			fireEvent.keyDown(start(), { key: "ArrowDown" });
			expect(menu()?.contains(document.activeElement)).toBe(true);
			fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
			expect(menu()).toBeNull();
			expect(start()).not.toHaveClass("open");
			expect(document.activeElement).toBe(start());
		});
	});

	describe("CTRL+ESC", () => {
		it("is Escape with Control alone", () => {
			const key = (init: Partial<KeyboardEvent>) =>
				isClassicyStartMenuKey({
					altKey: false,
					ctrlKey: false,
					metaKey: false,
					shiftKey: false,
					key: "Escape",
					code: "Escape",
					...init,
				});
			expect(key({ ctrlKey: true })).toBe(true);
			expect(key({ ctrlKey: true, key: "Unidentified" })).toBe(true);
			expect(key({})).toBe(false);
			expect(key({ ctrlKey: true, shiftKey: true })).toBe(false);
			expect(key({ ctrlKey: true, altKey: true })).toBe(false);
			expect(key({ ctrlKey: true, metaKey: true })).toBe(false);
			expect(key({ ctrlKey: true, key: "Enter", code: "Enter" })).toBe(false);
		});

		it("toggles the menu from anywhere on the page, taking the key", () => {
			renderTaskbar();
			expect(ctrlEscape()).toBe(false);
			expect(menu()).not.toBeNull();
			expect(start()).toHaveClass("open");
			expect(ctrlEscape()).toBe(false);
			expect(menu()).toBeNull();
			expect(start()).not.toHaveClass("open");
		});

		it("does nothing more on a held key's repeats", () => {
			renderTaskbar();
			ctrlEscape();
			expect(ctrlEscape(document.body, { repeat: true })).toBe(false);
			expect(menu()).not.toBeNull();
		});

		it("leaves Escape alone and an event another listener handled", () => {
			renderTaskbar();
			expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
			expect(menu()).toBeNull();
			const handled = new KeyboardEvent("keydown", {
				key: "Escape",
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});
			const stop = (e: Event) => e.preventDefault();
			document.body.addEventListener("keydown", stop);
			act(() => {
				document.body.dispatchEvent(handled);
			});
			document.body.removeEventListener("keydown", stop);
			expect(menu()).toBeNull();
		});

		it("opens nothing while a modal dialog is open on the desktop, nor does the Start button", () => {
			const { container } = renderTaskbar();
			const desktop = container.querySelector(".classicyDesktop") as Element;
			const scrim = document.createElement("div");
			scrim.className = "classicyWindowModalScrim";
			desktop.appendChild(scrim);
			expect(classicyDesktopHasOpenModal(start())).toBe(true);
			expect(ctrlEscape()).toBe(true);
			fireEvent.click(start(), { detail: 0 });
			expect(menu()).toBeNull();
			expect(start()).not.toHaveClass("open");

			// A hidden app's modal (its scrim drawn `display: none`) blocks
			// nothing.
			scrim.style.display = "none";
			expect(classicyDesktopHasOpenModal(start())).toBe(false);
			expect(ctrlEscape()).toBe(false);
			expect(menu()).not.toBeNull();
		});

		it("stops when the taskbar unmounts", () => {
			const { unmount } = renderTaskbar();
			unmount();
			expect(ctrlEscape()).toBe(true);
		});
	});
});
