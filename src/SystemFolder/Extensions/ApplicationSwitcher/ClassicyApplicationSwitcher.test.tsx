import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import { ClassicyApplicationSwitcher } from "./ClassicyApplicationSwitcher";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_PALETTE_ID,
	APPLICATION_SWITCHER_SET_CYCLING,
	APPLICATION_SWITCHER_TEAR_OFF,
	type ClassicyApplicationSwitcherData,
} from "./ClassicyApplicationSwitcherContext";

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const app = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: `/${id}.png`,
	windows: {},
	open: true,
	focused: false,
	data: {},
	...extra,
});

const set = (mutate: (d: ClassicyStore) => void) =>
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
const apps = () => useAppManager.getState().System.Manager.Applications;
const front = () => frontAppIdOf(apps());
const data = () =>
	apps().apps[APPLICATION_SWITCHER_APP_ID]
		.data as ClassicyApplicationSwitcherData;

/** Finder, Notes (in front) and Calc (hidden), and the switcher. */
const setUp = () =>
	set((d) => {
		d.System.Manager.Applications.apps = {
			"Finder.app": app("Finder.app"),
			"Notes.app": app("Notes.app", { focused: true, lastFocusedAt: 3 }),
			"Calc.app": app("Calc.app", { lastFocusedAt: 2, hidden: true }),
			[APPLICATION_SWITCHER_APP_ID]: app(APPLICATION_SWITCHER_APP_ID, {
				name: "Application Switcher",
				extension: true,
			}),
		};
		d.System.Manager.Applications.focusedAppId = "Notes.app";
	});

const press = (init: KeyboardEventInit) =>
	act(() => {
		fireEvent.keyDown(document.activeElement ?? document.body, init);
	});
const grave = { key: "`", code: "Backquote", ctrlKey: true };

const palette = () =>
	document.querySelector<HTMLElement>(".classicyApplicationSwitcherPalette");
const buttons = () =>
	Array.from(
		document.querySelectorAll<HTMLButtonElement>(
			".classicyApplicationSwitcherButton",
		),
	);
const button = (name: string) =>
	buttons().find((b) => b.getAttribute("aria-label") === name) as HTMLElement;
const tearOff = (position: [number, number] = [120, 80]) =>
	act(() => {
		dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position });
	});

describe("the Application Switcher", () => {
	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	describe("keyboard switching", () => {
		it("goes to the next application on Control-` and back on Control-Shift-`, showing a hidden one", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			// Alphabetical: Calc, Finder, Notes. From Notes, the next wraps to Calc.
			press(grave);
			expect(front()).toBe("Calc.app");
			expect(apps().apps["Calc.app"].hidden).toBeFalsy();
			press({ ...grave, key: "~", shiftKey: true });
			expect(front()).toBe("Notes.app");
		});

		it("takes the chord ahead of the menu bar's dispatcher, and claims the key", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			let seen: boolean | undefined;
			const after = (e: KeyboardEvent) => {
				seen = e.defaultPrevented;
			};
			document.addEventListener("keydown", after);
			press(grave);
			document.removeEventListener("keydown", after);
			expect(seen).toBe(true);
		});

		it("leaves a key another handler took first (a keyboard-equivalent dialog recording it)", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			const recorder = (e: KeyboardEvent) => e.preventDefault();
			window.addEventListener("keydown", recorder, true);
			press(grave);
			window.removeEventListener("keydown", recorder, true);
			expect(front()).toBe("Notes.app");
		});

		it("registers both chords as global shortcuts, named for the Keyboard Shortcuts topic", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			const global = useAppManager.getState().System.Manager.Keyboard.global;
			expect(global["control+`"]).toMatchObject({
				appId: APPLICATION_SWITCHER_APP_ID,
				shortcut: "⌃`",
				title: "Switch to the next application",
			});
			expect(global["control+shift+`"]).toMatchObject({
				shortcut: "⌃⇧`",
				title: "Switch to the previous application",
			});
		});

		it("follows a recorded chord, and does nothing while switched off", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			act(() => {
				dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, shortcut: "⌥J" });
			});
			press(grave);
			expect(front()).toBe("Notes.app");
			press({ key: "∆", code: "KeyJ", altKey: true });
			expect(front()).toBe("Calc.app");
			const global = useAppManager.getState().System.Manager.Keyboard.global;
			expect(global["control+`"]).toBeUndefined();
			expect(global["option+j"]?.appId).toBe(APPLICATION_SWITCHER_APP_ID);

			act(() => {
				dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, enabled: false });
			});
			press({ key: "∆", code: "KeyJ", altKey: true });
			expect(front()).toBe("Calc.app");
			expect(
				useAppManager.getState().System.Manager.Keyboard.global["option+j"],
			).toBeUndefined();
		});
	});

	describe("the palette", () => {
		it("is drawn once torn off: a floating windoid titled Applications, in the menu's order", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			expect(palette()).toBeNull();
			tearOff([120, 80]);
			const root = palette() as HTMLElement;
			expect(root).not.toBeNull();
			expect(root.classList.contains("classicyWindowUtility")).toBe(true);
			// No desktop around it here: the fallback floating layer.
			expect(root.parentElement?.id).toBe("classicy-floating-layer");
			expect(
				root.querySelector(".classicyWindowTitleBarUtilityTitle")?.textContent,
			).toBe("Applications");
			expect(buttons().map((b) => b.getAttribute("aria-label"))).toEqual([
				"Calc",
				"Finder",
				"Notes",
			]);
			// The window opens where the menu was dropped.
			const record =
				apps().apps[APPLICATION_SWITCHER_APP_ID].windows[
					APPLICATION_SWITCHER_PALETTE_ID
				];
			expect(record?.position).toEqual([120, 80]);
		});

		it("holds the front application's button down and dims a hidden one's icon", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			expect(button("Notes").getAttribute("aria-pressed")).toBe("true");
			expect(button("Finder").getAttribute("aria-pressed")).toBe("false");
			expect(button("Calc").classList).toContain(
				"classicyApplicationSwitcherHidden",
			);
			expect(button("Finder").classList).not.toContain(
				"classicyApplicationSwitcherHidden",
			);
		});

		it("switches on a click, and on an Option-click hides the application that was in front", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			fireEvent.click(button("Finder"));
			expect(front()).toBe("Finder.app");
			expect(button("Finder").getAttribute("aria-pressed")).toBe("true");
			fireEvent.click(button("Calc"), { altKey: true });
			expect(front()).toBe("Calc.app");
			expect(apps().apps["Calc.app"].hidden).toBeFalsy();
			expect(apps().apps["Finder.app"].hidden).toBe(true);
			expect(button("Finder").classList).toContain(
				"classicyApplicationSwitcherHidden",
			);
		});

		it("never takes the menu bar: a click on its bar leaves the front application", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			const root = palette() as HTMLElement;
			fireEvent.mouseUp(root);
			fireEvent.click(root);
			expect(front()).toBe("Notes.app");
		});

		it("sets its options from the zoom box: names, Option for the icon size, Option-Shift for the orientation", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			const zoom = () =>
				palette()?.querySelector(".classicyWindowZoomBox") as HTMLElement;
			expect(
				document.querySelectorAll(".classicyApplicationSwitcherName"),
			).toHaveLength(3);
			fireEvent.click(zoom());
			expect(data().showNames).toBe(false);
			expect(
				document.querySelectorAll(".classicyApplicationSwitcherName"),
			).toHaveLength(0);
			// A column of small icons leaves no room for a title or a collapse box.
			expect(palette()?.querySelector(".classicyWindowCollapseBox")).toBeNull();
			expect(
				palette()?.querySelector(".classicyWindowTitleBarUtilityTitle"),
			).toBeNull();
			fireEvent.click(zoom(), { altKey: true });
			expect(data().iconSize).toBe("large");
			expect(palette()?.classList).toContain(
				"classicyApplicationSwitcherLargeIcons",
			);
			fireEvent.click(zoom(), { altKey: true, shiftKey: true });
			expect(data().orientation).toBe("horizontal");
			expect(palette()?.classList).toContain(
				"classicyApplicationSwitcherHorizontal",
			);
			// The zoom box sets options; it never zooms the window.
			expect(
				apps().apps[APPLICATION_SWITCHER_APP_ID].windows[
					APPLICATION_SWITCHER_PALETTE_ID
				]?.zoomed,
			).toBeFalsy();
		});

		it("closes from its close box", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			fireEvent.click(
				palette()?.querySelector(".classicyWindowCloseBox") as HTMLElement,
			);
			expect(data().paletteOpen).toBe(false);
			expect(palette()).toBeNull();
		});

		it("comes back where it was, with its options, from the persisted state", () => {
			setUp();
			const first = render(<ClassicyApplicationSwitcher />);
			tearOff([200, 150]);
			act(() => {
				dispatch({
					type: "ClassicyWindowMove",
					moving: false,
					position: [260, 190],
					app: { id: APPLICATION_SWITCHER_APP_ID },
					window: { id: APPLICATION_SWITCHER_PALETTE_ID },
				});
			});
			fireEvent.click(
				palette()?.querySelector(".classicyWindowZoomBox") as HTMLElement,
			);
			first.unmount();
			// A reload: the store holds what was persisted.
			const saved = JSON.parse(JSON.stringify(useAppManager.getState()));
			act(() => {
				useAppManager.setState(saved, true);
			});
			render(<ClassicyApplicationSwitcher />);
			expect(palette()).not.toBeNull();
			expect(
				apps().apps[APPLICATION_SWITCHER_APP_ID].windows[
					APPLICATION_SWITCHER_PALETTE_ID
				]?.position,
			).toEqual([260, 190]);
			expect(palette()?.style.left).toBe("260px");
			expect(palette()?.style.top).toBe("190px");
			expect(
				document.querySelectorAll(".classicyApplicationSwitcherName"),
			).toHaveLength(0);
		});
	});

	describe("under a package with no palette (System 7.5)", () => {
		beforeEach(() => {
			resetClassicyAppearancePackagesForTests();
			registerClassicyAppearancePackage(platinum);
			registerClassicyAppearancePackage({
				id: "test-no-palette",
				name: "No Palette",
				css: "",
				defaults: {
					...getTheme("default"),
					id: "test-no-palette-default",
					package: "test-no-palette",
				},
				layout: {
					window: { growBoxCorner: "bottom-right" },
					menuBar: { placement: "screen" },
					desktop: { iconGridOrigin: "top-right" },
					applicationSwitcher: { palette: "none" },
				},
			});
		});

		afterEach(() => {
			resetClassicyAppearancePackagesForTests();
			registerClassicyAppearancePackage(platinum);
		});

		it("draws no palette, keeps its state for a package that does, and still switches from the keyboard", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			expect(palette()).not.toBeNull();
			act(() => {
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: "test-no-palette",
				});
			});
			expect(palette()).toBeNull();
			expect(data().paletteOpen).toBe(true);
			press(grave);
			expect(front()).toBe("Calc.app");
			act(() => {
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: PLATINUM_APPEARANCE_PACKAGE_ID,
				});
			});
			expect(palette()).not.toBeNull();
		});
	});
});
