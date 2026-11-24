import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
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
import { ClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { ClassicyApplicationSwitcher } from "./ClassicyApplicationSwitcher";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_PALETTE_ID,
	APPLICATION_SWITCHER_SET_CYCLING,
	APPLICATION_SWITCHER_SET_PALETTE,
	APPLICATION_SWITCHER_TEAR_OFF,
	type ClassicyApplicationSwitcherData,
} from "./ClassicyApplicationSwitcherContext";
import { classicyAppSwitcherPaletteLines } from "./ClassicyApplicationSwitcherPalette.internal";

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

	it("stays out of the startup parade, as 8.5's Application Switcher does", () => {
		setUp();
		render(<ClassicyApplicationSwitcher />);
		expect(apps().apps[APPLICATION_SWITCHER_APP_ID].noBootParade).toBe(true);
	});

	describe("under the screen saver", () => {
		const saverShowing = () =>
			apps().apps[SCREEN_SAVER_APP_ID]?.data?.active === true;
		const withSaverShowing = () => {
			setUp();
			act(() => {
				useAppManager.setState(
					produce(useAppManager.getState(), (d) => {
						d.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID] = app(
							SCREEN_SAVER_APP_ID,
							{ extension: true, data: { active: true } },
						);
					}),
					true,
				);
			});
		};

		// Both listen on the document in the capture phase; which runs first is
		// only their registration order (review M4).
		for (const saverFirst of [true, false]) {
			it(`the key that wakes the saver never also switches (${saverFirst ? "the saver's listener first" : "the switcher's listener first"})`, () => {
				withSaverShowing();
				render(
					saverFirst ? (
						<>
							<ClassicyScreenSaver />
							<ClassicyApplicationSwitcher />
						</>
					) : (
						<>
							<ClassicyApplicationSwitcher />
							<ClassicyScreenSaver />
						</>
					),
				);
				expect(saverShowing()).toBe(true);
				press(grave);
				expect(saverShowing()).toBe(false);
				expect(front()).toBe("Notes.app");
				// Awake, the chord switches.
				press(grave);
				expect(front()).toBe("Calc.app");
			});
		}
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
			// A screen reader hears what the dimmed icon shows (review M7).
			expect(button("Calc").getAttribute("aria-description")).toBe("Hidden");
			expect(button("Finder").hasAttribute("aria-description")).toBe(false);
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

		it("never takes the menu bar or the focus: a click on its bar leaves the front application", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			const root = palette() as HTMLElement;
			fireEvent.mouseUp(root);
			fireEvent.click(root);
			expect(front()).toBe("Notes.app");
			// Not only the bar's fallback: the focus itself stays (review C1).
			expect(apps().focusedAppId).toBe("Notes.app");
			expect(apps().apps[APPLICATION_SWITCHER_APP_ID].focused).toBeFalsy();
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

		it("dims its buttons while a modal window is open, as 8.5 does under a dialog", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			expect(button("Finder")).not.toBeDisabled();
			act(() => {
				useAppManager.setState(
					produce(useAppManager.getState(), (d) => {
						d.System.Manager.Applications.apps["Notes.app"].windows = {
							dialog: {
								id: "dialog",
								closed: false,
								modal: true,
								size: [100, 100],
								position: [0, 0],
								minimumSize: [0, 0],
							},
						};
					}),
					true,
				);
			});
			expect(buttons().every((b) => b.disabled)).toBe(true);
			fireEvent.click(button("Finder"));
			expect(front()).toBe("Notes.app");
		});

		it("counts the buttons a line the desktop has room for holds, from their sizes", () => {
			const twenty = (size: number) => Array.from({ length: 20 }, () => size);
			// 300 pixels of desktop, 4 of the palette's own frame.
			expect(classicyAppSwitcherPaletteLines(300, 4, twenty(24))).toBe(12);
			expect(classicyAppSwitcherPaletteLines(300, 4, twenty(40))).toBe(7);
			// Never under one, and every button in one line when none is laid out.
			expect(classicyAppSwitcherPaletteLines(10, 4, [40, 40])).toBe(1);
			expect(classicyAppSwitcherPaletteLines(300, 4, [0, 0, 0])).toBe(3);
			// By the sum, not the largest: 60 + 60 + 150 fits 284 (re-review IG-C1).
			expect(classicyAppSwitcherPaletteLines(284, 4, [60, 60, 150])).toBe(3);
			// In lines of two, each track is as large as its largest button: the
			// first holds 60 and 150, the second 60, so the line is 210.
			expect(classicyAppSwitcherPaletteLines(219, 4, [60, 60, 150])).toBe(2);
			expect(classicyAppSwitcherPaletteLines(213, 4, [60, 60, 150])).toBe(1);
			// The gap between tracks counts: two 100s and one gap of 10 in 300.
			expect(classicyAppSwitcherPaletteLines(300, 0, [100, 100, 100], 10)).toBe(
				2,
			);
		});

		describe("wrapping (re-review I-R1)", () => {
			// A laid-out desktop for jsdom: the floating layer is the desktop,
			// `desktopWidth` by `desktopHeight`. The palette sits where its style
			// puts it and is laid out as its stylesheet lays it: `frameAbove`
			// pixels of frame above its buttons (`buttonHeight` tall, each its
			// natural width, 112 unless `naturalWidths` names it), a 4-pixel
			// frame at either side and none below, the buttons in one column (one
			// row, horizontal), or in lines of `--application-switcher-lines`
			// when it wraps, where a browser may squeeze them: `narrowOnWrap`
			// pixels off each along the line. So the palette's size is measured
			// from its shape, not fixed. The buttons' copies the palette lays out
			// alone, outside its own list, take their natural sizes.
			let desktopHeight = 600;
			let desktopWidth = 800;
			const BUTTON = 24;
			const BUTTON_WIDTH = 112;
			const SIDE_FRAME = 4;
			const FRAME_ABOVE = 16;
			let buttonHeight = BUTTON;
			let frameAbove = FRAME_ABOVE;
			let narrowOnWrap = 0;
			let naturalWidths: Record<string, number> = {};
			// How often a measure read the desktop's box: each count does once.
			let desktopReads = 0;
			const naturalWidth = (button: Element) =>
				naturalWidths[button.getAttribute("aria-label") ?? ""] ?? BUTTON_WIDTH;
			const rect = (left: number, top: number, width: number, height: number) =>
				({
					top,
					left,
					width,
					height,
					x: left,
					y: top,
					right: left + width,
					bottom: top + height,
					toJSON: () => ({}),
				}) as DOMRect;
			// What each live observer watches, so a test resizes one thing.
			type Observed = { target: Element; observer: object; run: () => void };
			const observed: Observed[] = [];
			const resize = (which: (target: Element) => boolean) =>
				act(() => {
					for (const o of observed.filter((o) => which(o.target))) o.run();
				});
			const isLayer = (target: Element) =>
				target.id === "classicy-floating-layer";
			const isButton = (target: Element) =>
				target.classList.contains("classicyApplicationSwitcherButton");
			beforeEach(() => {
				desktopHeight = 600;
				desktopWidth = 800;
				buttonHeight = BUTTON;
				frameAbove = FRAME_ABOVE;
				narrowOnWrap = 0;
				naturalWidths = {};
				desktopReads = 0;
				observed.length = 0;
				vi.stubGlobal(
					"ResizeObserver",
					class {
						constructor(private callback: () => void) {}
						observe(target: Element) {
							observed.push({ target, observer: this, run: this.callback });
						}
						disconnect() {
							for (let i = observed.length - 1; i >= 0; i--)
								if (observed[i].observer === this) observed.splice(i, 1);
						}
					},
				);
				// The buttons' grid: the palette's own list, how many buttons it
				// has, how many a line holds, and whether it wraps.
				const grid = (win: HTMLElement) => {
					const list = win.querySelector<HTMLElement>(
						".classicyApplicationSwitcherButtons",
					);
					const count = list?.children.length ?? 0;
					const set = Number.parseInt(
						list?.style.getPropertyValue("--application-switcher-lines") ?? "",
						10,
					);
					return {
						list,
						count,
						perLine: Math.max(1, set || count),
						wrapped: set > 0,
						horizontal: win.classList.contains(
							"classicyApplicationSwitcherHorizontal",
						),
					};
				};
				// A button as the palette's list lays it out: squeezed along the
				// line when wrapped.
				const laidOut = (button: Element, g: ReturnType<typeof grid>) => {
					const squeeze = g.wrapped ? narrowOnWrap : 0;
					return g.horizontal
						? { width: naturalWidth(button) - squeeze, height: buttonHeight }
						: { width: naturalWidth(button), height: buttonHeight - squeeze };
				};
				const original = Element.prototype.getBoundingClientRect;
				vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
					function (this: Element) {
						if (this.id === "classicy-floating-layer") {
							desktopReads++;
							return rect(0, 0, desktopWidth, desktopHeight);
						}
						const win = this.closest<HTMLElement>(
							".classicyApplicationSwitcherPalette",
						);
						const left = Number.parseFloat(win?.style.left ?? "") || 0;
						const top = Number.parseFloat(win?.style.top ?? "") || 0;
						if (win && this === win) {
							const g = grid(win);
							const buttons = [...(g.list?.children ?? [])];
							const lines = Math.max(1, Math.ceil(g.count / g.perLine));
							const along = Math.min(g.perLine, g.count);
							const sizes = buttons.map((b) => laidOut(b, g));
							return g.horizontal
								? rect(
										left,
										top,
										SIDE_FRAME +
											sizes.slice(0, along).reduce((s, b) => s + b.width, 0) +
											SIDE_FRAME,
										frameAbove + buttonHeight * lines,
									)
								: rect(
										left,
										top,
										SIDE_FRAME + BUTTON_WIDTH * lines + SIDE_FRAME,
										frameAbove +
											sizes.slice(0, along).reduce((s, b) => s + b.height, 0),
									);
						}
						if (win && isButton(this)) {
							const g = grid(win);
							// A copy outside the palette's own list: its natural size.
							if (this.parentElement !== g.list)
								return rect(0, 0, naturalWidth(this), buttonHeight);
							const i = [...(g.list?.children ?? [])].indexOf(this);
							const size = laidOut(this, g);
							const line = Math.floor(i / g.perLine);
							const place = i % g.perLine;
							return g.horizontal
								? rect(
										left + SIDE_FRAME + size.width * place,
										top + frameAbove + buttonHeight * line,
										size.width,
										size.height,
									)
								: rect(
										left + SIDE_FRAME + BUTTON_WIDTH * line,
										top + frameAbove + size.height * place,
										size.width,
										size.height,
									);
						}
						return original.call(this);
					},
				);
			});
			afterEach(() => {
				vi.restoreAllMocks();
				vi.unstubAllGlobals();
			});
			const list = () =>
				palette()?.querySelector(
					".classicyApplicationSwitcherButtons",
				) as HTMLElement;
			const lines = () =>
				list().style.getPropertyValue("--application-switcher-lines");
			const moveTo = (position: [number, number]) =>
				act(() => {
					dispatch({
						type: "ClassicyWindowMove",
						moving: false,
						position,
						app: { id: APPLICATION_SWITCHER_APP_ID },
						window: { id: APPLICATION_SWITCHER_PALETTE_ID },
					});
				});
			// The menu bar the room starts under, as the palette reads it.
			const menuBar = () => readClassicyThemeVar("--menu-bar-height");

			it("keeps its shape when dragged past each edge of the desktop", () => {
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 200]);
				expect(list().classList).not.toContain(
					"classicyApplicationSwitcherWrapped",
				);
				const size = () => palette()?.getBoundingClientRect();
				const before = size();
				// One column of its three buttons, measured from its layout.
				expect(before?.width).toBe(SIDE_FRAME + BUTTON_WIDTH + SIDE_FRAME);
				expect(before?.height).toBe(FRAME_ABOVE + BUTTON * 3);
				for (const position of [
					[300, desktopHeight - 30],
					[-90, 200],
					[760, 200],
					[300, 0],
				] as [number, number][]) {
					moveTo(position);
					expect(
						apps().apps[APPLICATION_SWITCHER_APP_ID].windows[
							APPLICATION_SWITCHER_PALETTE_ID
						]?.position,
					).toEqual(position);
					expect(list().classList).not.toContain(
						"classicyApplicationSwitcherWrapped",
					);
					expect(lines()).toBe("");
					expect(size()?.width).toBe(before?.width);
					expect(size()?.height).toBe(before?.height);
				}
			});

			it("wraps a column taller than the desktop, and only by its capacity", () => {
				// Room for one 24-pixel button below the menu bar and the frame.
				desktopHeight = menuBar() + FRAME_ABOVE + BUTTON + BUTTON - 1;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 0]);
				expect(list().classList).toContain(
					"classicyApplicationSwitcherWrapped",
				);
				expect(lines()).toBe("1");
				// Three columns of one button, measured from its layout.
				expect(palette()?.getBoundingClientRect().width).toBe(
					SIDE_FRAME + BUTTON_WIDTH * 3 + SIDE_FRAME,
				);
				// Moving it changes nothing.
				moveTo([10, 10]);
				expect(lines()).toBe("1");
			});

			it("measures again when the desktop resizes", () => {
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 200]);
				expect(lines()).toBe("");
				expect(observed.some((o) => isLayer(o.target))).toBe(true);
				// The desktop shrinks to two buttons' room, then grows back.
				desktopHeight = menuBar() + FRAME_ABOVE + BUTTON * 2;
				resize(isLayer);
				expect(list().classList).toContain(
					"classicyApplicationSwitcherWrapped",
				);
				expect(lines()).toBe("2");
				desktopHeight = 600;
				resize(isLayer);
				expect(lines()).toBe("");
				expect(list().classList).not.toContain(
					"classicyApplicationSwitcherWrapped",
				);
			});

			// Re-review M-R4: a metric edit (the buttons' padding, an icon size),
			// a theme switch or a font that loads late resizes the buttons with
			// nothing else changing.
			it("measures again when its buttons resize", () => {
				// Room for exactly its three buttons below the menu bar and frame.
				desktopHeight = menuBar() + FRAME_ABOVE + BUTTON * 3;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 0]);
				expect(lines()).toBe("");
				// Taller buttons: one fits a column now.
				buttonHeight = 40;
				resize(isButton);
				expect(list().classList).toContain(
					"classicyApplicationSwitcherWrapped",
				);
				expect(lines()).toBe("1");
				// Back to their size: one column again.
				buttonHeight = BUTTON;
				resize(isButton);
				expect(lines()).toBe("");
				expect(list().classList).not.toContain(
					"classicyApplicationSwitcherWrapped",
				);
			});

			it("measures again when the theme changes the frame around its buttons", () => {
				desktopHeight = menuBar() + FRAME_ABOVE + BUTTON * 3;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 0]);
				expect(lines()).toBe("");
				// A thicker frame (a Metrics tab edit), the buttons as they were and
				// no observer told: two buttons fit a column now.
				const theme =
					useAppManager.getState().System.Manager.Appearance.activeTheme;
				frameAbove = FRAME_ABOVE + 1;
				act(() => {
					dispatch({
						type: "ClassicyDesktopChangeMetric",
						metricKey: "windowBorderSize",
						value: 3,
					});
				});
				expect(
					useAppManager.getState().System.Manager.Appearance.activeTheme,
				).not.toBe(theme);
				expect(lines()).toBe("2");
			});

			// Re-review IG-C1: the palette's wrap changes how its list lays the
			// buttons out (a browser squeezes them into the grid's tracks), so a
			// count read from their laid-out sizes undid itself on every measure
			// the button watch set off. The count reads their natural sizes.
			const orient = (orientation: "vertical" | "horizontal") =>
				act(() => {
					dispatch({ type: APPLICATION_SWITCHER_SET_PALETTE, orientation });
				});

			it("holds its line count when wrapping squeezes its buttons (vertical)", () => {
				// Room for two of its three 24-pixel buttons; wrapped, the list
				// squeezes them to 18, three of which would fit.
				desktopHeight = menuBar() + FRAME_ABOVE + 60;
				narrowOnWrap = 6;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				tearOff([300, 0]);
				expect(lines()).toBe("2");
				const counted = desktopReads;
				for (let round = 0; round < 4; round++) {
					resize(isButton);
					expect(lines()).toBe("2");
					expect(list().classList).toContain(
						"classicyApplicationSwitcherWrapped",
					);
				}
				// The wrap's own resizes change no natural size: nothing is counted.
				expect(desktopReads).toBe(counted);
			});

			it("holds its line count when wrapping squeezes its buttons (horizontal)", () => {
				// Room for two of its three 112-pixel buttons in a row; wrapped,
				// the list squeezes them to 72, three of which would fit.
				desktopWidth = SIDE_FRAME + BUTTON_WIDTH * 2 + 72;
				narrowOnWrap = 40;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				orient("horizontal");
				tearOff([0, 200]);
				expect(lines()).toBe("2");
				const counted = desktopReads;
				for (let round = 0; round < 4; round++) {
					resize(isButton);
					expect(lines()).toBe("2");
					expect(list().classList).toContain(
						"classicyApplicationSwitcherWrapped",
					);
				}
				// The wrap's own resizes change no natural size: nothing is counted.
				expect(desktopReads).toBe(counted);
			});

			it("keeps in one row a row that fits by the sum of its buttons' widths", () => {
				// Calc, Finder and Notes are 60, 60 and 150 wide: 274 with the
				// frame, in 284. The widest three times over (454) would not fit.
				naturalWidths = { Calc: 60, Finder: 60, Notes: 150 };
				desktopWidth = SIDE_FRAME + 270 + 10;
				setUp();
				render(<ClassicyApplicationSwitcher />);
				orient("horizontal");
				tearOff([0, 200]);
				expect(lines()).toBe("");
				expect(list().classList).not.toContain(
					"classicyApplicationSwitcherWrapped",
				);
				resize(isButton);
				expect(lines()).toBe("");
			});
		});

		it("draws one column while every button fits", () => {
			setUp();
			render(<ClassicyApplicationSwitcher />);
			tearOff();
			const list = palette()?.querySelector(
				".classicyApplicationSwitcherButtons",
			) as HTMLElement;
			// jsdom lays nothing out: no button has a size, so nothing wraps.
			expect(list.classList).not.toContain(
				"classicyApplicationSwitcherWrapped",
			);
			expect(list.style.getPropertyValue("--application-switcher-lines")).toBe(
				"",
			);
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
