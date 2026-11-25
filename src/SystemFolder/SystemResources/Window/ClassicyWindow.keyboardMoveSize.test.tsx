import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_FRAME_EDGES_LAYOUT,
	TEST_FRAME_EDGES_PACKAGE_ID,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { isClassicyWindowKeyboardModeActive } from "@/SystemFolder/SystemResources/Window/ClassicyWindowKeyboardMove.internal";
import {
	type ClassicyWindowCommand,
	runClassicyWindowCommand,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

// Plan 0020-w98 §5 "Keyboard Move and Size": the window registry's `move`
// and `size` commands (WIG Ch.6 "Moving Windows" and "Sizing Borders",
// p.83; Windows' SC_MOVE/SC_SIZE loop, Wine's `WINPOS_SysCommandSizeMove`).
// The window runs on the real store and reducer, so each case pins the rect
// the window stores.

const track = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track, page: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const APP = "Keys.app";
// jsdom's viewport.
const VIEWPORT: [number, number] = [1024, 768];
// The window's frame, 4 px on each side (Windows 98's SM_CXFRAME), given by
// an inline padding that jsdom's computed style reports.
const FRAME = 4;
const FRAME_STYLE = { padding: `${FRAME}px` };
const CHROME = 2 * FRAME;
// The window opens at (50, 200), its content 400 x 300: its outer rect is
// 50..458 across and 200..508 down.
const LEFT = 50;
const TOP = 200;
const WIDTH = 400;
const HEIGHT = 300;
const RIGHT = LEFT + WIDTH + CHROME;
const BOTTOM = TOP + HEIGHT + CHROME;
const STEP = 8;

// jsdom lays nothing out: a window's rect is its inline left/top/width/height
// plus its frame on both sides, as a content-box element's would be.
const rectOf = (el: HTMLElement): DOMRect => {
	const isWindow = el.classList.contains("classicyWindow");
	const left = isWindow ? Number.parseFloat(el.style.left) || 0 : 0;
	const top = isWindow ? Number.parseFloat(el.style.top) || 0 : 0;
	const width = isWindow
		? (Number.parseFloat(el.style.width) || 0) + CHROME
		: 0;
	const height = isWindow
		? (Number.parseFloat(el.style.height) || 0) + CHROME
		: 0;
	return {
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		x: left,
		y: top,
		toJSON: () => {},
	} as DOMRect;
};

const record = (id = "main") =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		id,
	);

const root = (id = "main") =>
	document.getElementById(`${APP}_${id}`) as HTMLElement;

const keysWindow = (
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) => (
	<ClassicyWindow
		id="main"
		appId={APP}
		title="Main"
		initialSize={[WIDTH, HEIGHT]}
		initialPosition={[LEFT, TOP]}
		minimumSize={[0, 0]}
		style={FRAME_STYLE}
		{...props}
	>
		<p>main content</p>
	</ClassicyWindow>
);

const run = (command: ClassicyWindowCommand, id = "main") => {
	let result = false;
	act(() => {
		result = runClassicyWindowCommand(APP, id, command);
	});
	return result;
};

const press = (...keys: string[]) => {
	for (const key of keys) fireEvent.keyDown(document.body, { key });
};

const pointer = (x: number, y: number) =>
	fireEvent.mouseMove(document.body, { clientX: x, clientY: y });

const usePackage = (id: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: id }),
	);

// The menu bar's band the window keeps below: the active theme's
// `--menu-bar-height`.
const menuBarHeight = () =>
	Number.parseFloat(
		(
			getThemeVars(
				useAppManager.getState().System.Manager.Appearance
					.activeTheme as ClassicyTheme,
			) as Record<string, string>
		)["--menu-bar-height"],
	);

// The layouts every behavior holds under: the core's default (Mac OS 8's
// windows) and Windows 98's window behavior (maximize, a sizing border).
const LAYOUTS: [string, (() => void) | null][] = [
	["the default layout", null],
	[
		"Windows 98's window layout",
		() => {
			registerTestTaskbarPackage(
				TEST_FRAME_EDGES_LAYOUT,
				TEST_FRAME_EDGES_PACKAGE_ID,
			);
			usePackage(TEST_FRAME_EDGES_PACKAGE_ID);
		},
	],
];

describe("ClassicyWindow's keyboard Move and Size", () => {
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		localStorage.clear();
		track.mockClear();
		Object.assign(window, {
			innerWidth: VIEWPORT[0],
			innerHeight: VIEWPORT[1],
		});
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP] = {
						id: APP,
						name: "Keys",
						icon: "",
						windows: {},
						open: true,
						data: {},
					};
				}),
			),
		);
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: Element) {
				return rectOf(this as HTMLElement);
			});
	});

	afterEach(() => {
		cleanup();
		rectSpy.mockRestore();
		unregisterClassicyAppearancePackage(TEST_FRAME_EDGES_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe.each(LAYOUTS)("under %s", (_name, setUp) => {
		beforeEach(() => setUp?.());

		describe("Move", () => {
			it("starts on the command, activating the window and showing the drag band", () => {
				render(
					<>
						{keysWindow()}
						{keysWindow({ id: "other", initialPosition: [600, 100] })}
					</>,
				);
				expect(record("other")?.focused).toBe(true);
				expect(run({ type: "move" })).toBe(true);
				expect(record()).toMatchObject({
					focused: true,
					moving: true,
					position: [LEFT, TOP],
				});
				expect(root()).toHaveClass("dragging");
				expect(isClassicyWindowKeyboardModeActive()).toBe(true);
				expect(track).toHaveBeenCalledWith(
					"move",
					expect.objectContaining({ type: "ClassicyWindow", id: "main" }),
				);
				press("Escape");
			});

			it("moves 8 px an arrow, and ENTER keeps it there", () => {
				render(keysWindow());
				run({ type: "move" });
				press("ArrowLeft", "ArrowLeft", "ArrowUp");
				expect(record()).toMatchObject({
					position: [LEFT - 2 * STEP, TOP - STEP],
					moving: true,
				});
				press("ArrowRight", "ArrowDown", "ArrowDown");
				expect(record()?.position).toEqual([LEFT - STEP, TOP + STEP]);
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT - STEP, TOP + STEP],
					moving: false,
				});
				expect(root()).not.toHaveClass("dragging");
				expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			});

			it("goes back where it started on ESC", () => {
				render(keysWindow());
				run({ type: "move" });
				press("ArrowRight", "ArrowRight", "ArrowDown");
				press("Escape");
				expect(record()).toMatchObject({
					position: [LEFT, TOP],
					moving: false,
				});
			});

			it("follows the mouse's travel since its first move, and a click ends it there", () => {
				const click = vi.fn();
				document.body.addEventListener("click", click);
				try {
					render(keysWindow());
					run({ type: "move" });
					pointer(700, 600);
					expect(record()?.position).toEqual([LEFT, TOP]);
					pointer(730, 620);
					expect(record()?.position).toEqual([LEFT + 30, TOP + 20]);
					// An arrow carries on from there, and the mouse from the arrow.
					press("ArrowRight");
					expect(record()?.position).toEqual([LEFT + 30 + STEP, TOP + 20]);
					pointer(500, 500);
					pointer(490, 510);
					expect(record()?.position).toEqual([LEFT + 20 + STEP, TOP + 30]);
					fireEvent.mouseDown(document.body, { button: 0 });
					fireEvent.mouseUp(document.body, { button: 0 });
					fireEvent.click(document.body);
					expect(record()).toMatchObject({
						position: [LEFT + 20 + STEP, TOP + 30],
						moving: false,
					});
					// The click that ended it pressed nothing.
					expect(click).not.toHaveBeenCalled();
				} finally {
					document.body.removeEventListener("click", click);
				}
			});

			it("ends where it is when the pointer stream is lost", () => {
				render(keysWindow());
				run({ type: "move" });
				press("ArrowDown");
				act(() => {
					window.dispatchEvent(new Event("blur"));
				});
				expect(record()).toMatchObject({
					position: [LEFT, TOP + STEP],
					moving: false,
				});
			});

			it("holds the keys while it lasts", () => {
				const page = vi.fn();
				document.addEventListener("keydown", page);
				try {
					render(keysWindow());
					run({ type: "move" });
					press("ArrowLeft", "a", "Tab", "Enter");
					expect(page).not.toHaveBeenCalled();
					press("ArrowLeft");
					expect(page).toHaveBeenCalledOnce();
					expect(record()?.position).toEqual([LEFT - STEP, TOP]);
				} finally {
					document.removeEventListener("keydown", page);
				}
			});

			it("holds a modal's ESC: the mode takes it, the dialog stays open", () => {
				render(keysWindow({ modal: true, closable: true }));
				run({ type: "move" });
				press("ArrowRight", "Escape");
				expect(record()).toMatchObject({
					closed: false,
					position: [LEFT, TOP],
					moving: false,
				});
			});

			// Windows clamps its tracking point to the work area, so an arrow
			// at the edge moves nothing and the next one back moves at once.
			it("stops at the screen's left and the menu bar's underside", () => {
				const floor = menuBarHeight();
				render(keysWindow({ initialPosition: [4, floor + 4] }));
				run({ type: "move" });
				press("ArrowLeft", "ArrowLeft", "ArrowUp", "ArrowUp");
				expect(record()?.position).toEqual([0, floor]);
				press("ArrowRight", "ArrowDown");
				expect(record()?.position).toEqual([STEP, floor + STEP]);
				press("Enter");
			});

			it("keeps it on the screen when the mouse carried it off", () => {
				render(keysWindow());
				run({ type: "move" });
				pointer(500, 500);
				pointer(5000, 500);
				press("Enter");
				expect(record()).toMatchObject({
					position: [VIEWPORT[0] - WIDTH, TOP],
					moving: false,
				});
			});

			it("is refused for a fixed modal", () => {
				render(
					<>
						{keysWindow({ id: "alert", modal: true, type: "error" })}
						{keysWindow({ id: "fixed", modal: true, movable: false })}
					</>,
				);
				expect(run({ type: "move" }, "alert")).toBe(false);
				expect(run({ type: "move" }, "fixed")).toBe(false);
				expect(isClassicyWindowKeyboardModeActive()).toBe(false);
				expect(record("alert")?.moving).toBe(false);
			});

			it("moves a movable modal", () => {
				render(keysWindow({ modal: true }));
				expect(run({ type: "move" })).toBe(true);
				press("ArrowDown", "Enter");
				expect(record()?.position).toEqual([LEFT, TOP + STEP]);
			});

			it("moves a shaded window, as by its title bar", () => {
				render(keysWindow());
				run({ type: "minimize" });
				expect(record()?.collapsed).toBe(true);
				expect(run({ type: "move" })).toBe(true);
				press("ArrowUp", "Enter");
				expect(record()).toMatchObject({
					collapsed: true,
					position: [LEFT, TOP - STEP],
				});
			});
		});

		describe("Size", () => {
			it("starts on the command with the drag band, no edge chosen yet", () => {
				render(
					<>
						{keysWindow()}
						{keysWindow({ id: "other", initialPosition: [600, 100] })}
					</>,
				);
				expect(run({ type: "size" })).toBe(true);
				expect(record()).toMatchObject({
					focused: true,
					resizing: true,
					position: [LEFT, TOP],
					size: [WIDTH, HEIGHT],
				});
				expect(root()).toHaveClass("classicyWindowResizing");
				expect(track).toHaveBeenCalledWith(
					"resize",
					expect.objectContaining({ type: "ClassicyWindow", id: "main" }),
				);
				press("Escape");
				expect(record()?.resizing).toBe(false);
				expect(root()).not.toHaveClass("classicyWindowResizing");
			});

			// The first arrow picks its edge and moves nothing; the next one
			// moves that edge 8 px, the opposite edge kept.
			it.each<[string, [number, number], [number, number]]>([
				["ArrowUp", [LEFT, TOP - STEP], [WIDTH, HEIGHT + STEP]],
				["ArrowDown", [LEFT, TOP], [WIDTH, HEIGHT + STEP]],
				["ArrowLeft", [LEFT - STEP, TOP], [WIDTH + STEP, HEIGHT]],
				["ArrowRight", [LEFT, TOP], [WIDTH + STEP, HEIGHT]],
			])("%s picks its edge, then moves it out 8 px", (key, position, size) => {
				render(keysWindow());
				run({ type: "size" });
				press(key);
				expect(root().style.width).toBe(`${WIDTH}px`);
				expect(root().style.height).toBe(`${HEIGHT}px`);
				press(key);
				expect(root().style.width).toBe(`${size[0]}px`);
				expect(root().style.height).toBe(`${size[1]}px`);
				expect(root().style.left).toBe(`${position[0]}px`);
				expect(root().style.top).toBe(`${position[1]}px`);
				press("Enter");
				expect(record()).toMatchObject({ position, size, resizing: false });
			});

			it("moves the chosen edge back with the opposite arrow", () => {
				render(keysWindow());
				run({ type: "size" });
				press("ArrowUp", "ArrowDown", "ArrowDown");
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT, TOP + 2 * STEP],
					size: [WIDTH, HEIGHT - 2 * STEP],
				});
			});

			it("makes a corner of the chosen edge and an arrow across it", () => {
				render(keysWindow());
				run({ type: "size" });
				// Up picks the top; Left adds the left, moving nothing.
				press("ArrowUp", "ArrowLeft");
				expect(root().style.width).toBe(`${WIDTH}px`);
				press("ArrowLeft", "ArrowUp");
				expect(root().style.left).toBe(`${LEFT - STEP}px`);
				expect(root().style.top).toBe(`${TOP - STEP}px`);
				// Both edges move from here: Right takes the left edge back in.
				press("ArrowRight", "ArrowRight");
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT + STEP, TOP - STEP],
					size: [WIDTH - STEP, HEIGHT + STEP],
				});
			});

			it("holds the minimum size, the opposite edge kept", () => {
				render(keysWindow({ minimumSize: [WIDTH - STEP, HEIGHT] }));
				run({ type: "size" });
				press("ArrowLeft", "ArrowRight", "ArrowRight", "ArrowRight");
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT + STEP, TOP],
					size: [WIDTH - STEP, HEIGHT],
				});
				run({ type: "size" });
				press("ArrowUp", "ArrowDown");
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT + STEP, TOP],
					size: [WIDTH - STEP, HEIGHT],
				});
			});

			it("stops at the work area's bottom and the screen's right", () => {
				render(keysWindow());
				run({ type: "size" });
				press("ArrowDown", ...Array(100).fill("ArrowDown"));
				press("ArrowRight", ...Array(100).fill("ArrowRight"));
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT, TOP],
					size: [VIEWPORT[0] - LEFT, VIEWPORT[1] - TOP],
				});
			});

			it("stops a top edge at the menu bar's underside", () => {
				render(keysWindow());
				run({ type: "size" });
				press("ArrowUp", ...Array(100).fill("ArrowUp"));
				press("Enter");
				const floor = menuBarHeight();
				expect(record()).toMatchObject({
					position: [LEFT, floor],
					size: [WIDTH, BOTTOM - CHROME - floor],
				});
			});

			it("goes back to its rect on ESC", () => {
				render(keysWindow());
				run({ type: "size" });
				press("ArrowLeft", "ArrowLeft", "ArrowLeft");
				expect(root().style.left).toBe(`${LEFT - 2 * STEP}px`);
				press("Escape");
				expect(root().style.left).toBe(`${LEFT}px`);
				expect(root().style.width).toBe(`${WIDTH}px`);
				expect(record()).toMatchObject({
					position: [LEFT, TOP],
					size: [WIDTH, HEIGHT],
					resizing: false,
				});
			});

			// Wine's and ReactOS's start_size_move: before an arrow has, the
			// mouse picks the sizing border it crosses (the pointer clamped to
			// the window's rect), then sizes it by its travel.
			it("lets the mouse pick the edge it crosses, then size it by its travel", () => {
				const click = vi.fn();
				document.body.addEventListener("click", click);
				try {
					render(keysWindow());
					run({ type: "size" });
					// Over the window: no edge.
					pointer(300, 350);
					pointer(320, 360);
					expect(root().style.width).toBe(`${WIDTH}px`);
					// Past the right edge, at mid-height: the right edge.
					pointer(RIGHT + 20, 350);
					expect(root().style.width).toBe(`${WIDTH}px`);
					pointer(RIGHT + 50, 340);
					expect(root().style.width).toBe(`${WIDTH + 30}px`);
					expect(root().style.height).toBe(`${HEIGHT}px`);
					fireEvent.mouseUp(document.body, { button: 0 });
					fireEvent.click(document.body);
					expect(record()).toMatchObject({
						position: [LEFT, TOP],
						size: [WIDTH + 30, HEIGHT],
						resizing: false,
					});
					expect(click).not.toHaveBeenCalled();
				} finally {
					document.body.removeEventListener("click", click);
				}
			});

			it("lets the mouse pick a corner from beyond it", () => {
				render(keysWindow());
				run({ type: "size" });
				pointer(LEFT - 30, TOP - 30);
				pointer(LEFT - 40, TOP - 35);
				press("Enter");
				expect(record()).toMatchObject({
					position: [LEFT - 10, TOP - 5],
					size: [WIDTH + 10, HEIGHT + 5],
				});
			});

			it("ends where it is when the pointer stream is lost", () => {
				render(keysWindow());
				run({ type: "size" });
				press("ArrowRight", "ArrowRight");
				act(() => {
					window.dispatchEvent(new Event("blur"));
				});
				expect(record()).toMatchObject({
					size: [WIDTH + STEP, HEIGHT],
					resizing: false,
				});
			});

			it("is refused for a window that cannot be sized, and a shaded one", () => {
				render(
					<>
						{keysWindow({ id: "fixed", resizable: false })}
						{keysWindow({ id: "shaded" })}
					</>,
				);
				expect(run({ type: "size" }, "fixed")).toBe(false);
				run({ type: "minimize" }, "shaded");
				expect(record("shaded")?.collapsed).toBe(true);
				expect(run({ type: "size" }, "shaded")).toBe(false);
				expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			});
		});

		it("runs one mode at a time", () => {
			render(
				<>
					{keysWindow()}
					{keysWindow({ id: "other", initialPosition: [600, 100] })}
				</>,
			);
			expect(run({ type: "move" })).toBe(true);
			expect(run({ type: "move" })).toBe(false);
			expect(run({ type: "size" })).toBe(false);
			expect(run({ type: "size" }, "other")).toBe(false);
			expect(record("other")?.resizing).toBe(false);
			press("Enter");
			expect(run({ type: "size" }, "other")).toBe(true);
			press("Escape");
		});

		it("ends the mode where it is before another command runs", () => {
			render(keysWindow());
			run({ type: "move" });
			press("ArrowDown");
			expect(run({ type: "close" })).toBe(true);
			expect(record()).toMatchObject({
				closed: true,
				moving: false,
				position: [LEFT, TOP + STEP],
			});
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
		});

		it("ends the mode when the window unmounts, and gives the keys back", () => {
			const page = vi.fn();
			document.addEventListener("keydown", page);
			try {
				const { unmount } = render(keysWindow());
				run({ type: "move" });
				unmount();
				expect(isClassicyWindowKeyboardModeActive()).toBe(false);
				press("ArrowLeft");
				expect(page).toHaveBeenCalledOnce();
			} finally {
				document.removeEventListener("keydown", page);
			}
		});

		it("ends the mode when another path closes the window", () => {
			render(keysWindow());
			run({ type: "size" });
			press("ArrowRight", "ArrowRight");
			act(() =>
				dispatch({
					type: "ClassicyWindowClose",
					app: { id: APP },
					window: { id: "main" },
				}),
			);
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			expect(record()).toMatchObject({
				closed: true,
				resizing: false,
				size: [WIDTH + STEP, HEIGHT],
			});
		});
	});

	describe("under the default layout", () => {
		// Mac OS 8's zoom is a standard state, not a maximized window: a
		// keyboard size leaves it, as a grow-box resize does, and ESC keeps it.
		it("sizes a zoomed window, leaving its standard state", () => {
			render(keysWindow());
			fireEvent.click(
				root().querySelector(".classicyWindowZoomBox") as HTMLElement,
			);
			expect(record()?.zoomed).toBe(true);
			expect(run({ type: "size" })).toBe(true);
			press("ArrowRight", "ArrowLeft", "Escape");
			expect(record()?.zoomed).toBe(true);
			expect(run({ type: "size" })).toBe(true);
			press("ArrowRight", "ArrowLeft", "Enter");
			expect(record()?.zoomed).toBe(false);
		});
	});

	describe("under Windows 98's window layout", () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_FRAME_EDGES_LAYOUT,
				TEST_FRAME_EDGES_PACKAGE_ID,
			);
			usePackage(TEST_FRAME_EDGES_PACKAGE_ID);
		});

		// Wine's WINPOS_SysCommandSizeMove returns at once for a zoomed window.
		it("refuses both modes while the window is maximized", () => {
			render(keysWindow());
			expect(run({ type: "maximize" })).toBe(true);
			expect(root()).toHaveClass("classicyWindowMaximized");
			expect(run({ type: "move" })).toBe(false);
			expect(run({ type: "size" })).toBe(false);
			expect(record()).toMatchObject({ moving: false, resizing: false });
		});

		it("ends a mode when another path maximizes the window, its rect winning", () => {
			render(keysWindow());
			run({ type: "move" });
			press("ArrowDown");
			act(() =>
				dispatch({
					type: "ClassicyWindowZoom",
					zoomed: true,
					app: { id: APP },
					window: { id: "main" },
				}),
			);
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			expect(root()).toHaveClass("classicyWindowMaximized");
			expect(record()).toMatchObject({
				moving: false,
				position: [-FRAME, menuBarHeight() - FRAME],
			});
		});
	});

	describe('under window.collapse: "minimize"', () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_MINIMIZE_LAYOUT,
				TEST_MINIMIZE_PACKAGE_ID,
			);
			usePackage(TEST_MINIMIZE_PACKAGE_ID);
		});

		it("refuses both modes while the window is minimized", () => {
			render(keysWindow());
			expect(run({ type: "minimize" })).toBe(true);
			expect(root()).toHaveClass("classicyWindowMinimized");
			expect(run({ type: "move" })).toBe(false);
			expect(run({ type: "size" })).toBe(false);
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
		});

		it("ends a mode when another path minimizes the window", () => {
			render(keysWindow());
			run({ type: "move" });
			press("ArrowRight");
			act(() =>
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: APP },
					window: { id: "main" },
				}),
			);
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			expect(record()).toMatchObject({
				collapsed: true,
				moving: false,
				position: [LEFT + STEP, TOP],
			});
		});
	});

	describe("its appearance events", () => {
		let probe: ReturnType<typeof installClassicyAppearanceProbe>;
		beforeEach(() => {
			probe = installClassicyAppearanceProbe();
		});
		afterEach(() => probe.uninstall());

		const drags = () =>
			probe.events
				.filter(
					(e) =>
						e.component === "Window" &&
						["dragStart", "change", "dragEnd"].includes(e.event),
				)
				.map(({ event, detail }) => ({ event, detail }));

		it("brackets a keyboard Move: dragStart, a change a step, one dragEnd", () => {
			render(keysWindow());
			run({ type: "move" });
			press("ArrowLeft", "ArrowUp", "Enter");
			expect(drags()).toEqual([
				{ event: "dragStart", detail: { kind: "move", input: "keyboard" } },
				{ event: "change", detail: { kind: "move", input: "keyboard" } },
				{ event: "change", detail: { kind: "move", input: "keyboard" } },
				{
					event: "dragEnd",
					detail: {
						kind: "move",
						lost: false,
						canceled: false,
						input: "keyboard",
					},
				},
			]);
		});

		it("marks a keyboard Size ended by ESC canceled", () => {
			render(keysWindow());
			run({ type: "size" });
			press("ArrowRight", "ArrowRight", "Escape");
			expect(drags()).toEqual([
				{ event: "dragStart", detail: { kind: "resize", input: "keyboard" } },
				{ event: "change", detail: { kind: "resize", input: "keyboard" } },
				{
					event: "dragEnd",
					detail: {
						kind: "resize",
						lost: false,
						canceled: true,
						input: "keyboard",
					},
				},
			]);
		});
	});
});
