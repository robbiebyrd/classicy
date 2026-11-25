import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	classicyTaskbarEdge,
	classicyTaskbarOptions,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import {
	getClassicyTaskbarBand,
	getClassicyTaskbarInsets,
	resetClassicyTaskbarBandForTests,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS,
	CLASSICY_TASKBAR_AUTOHIDE_SHOW_DELAY_MS,
	CLASSICY_TASKBAR_DRAG_THRESHOLD_PX,
	classicyTaskbarAutoHideDuration,
	classicyTaskbarEdgeAt,
	classicyTaskbarHiddenTranslate,
	isClassicyTaskbarVertical,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarDock.internal";

// Plan 0020-w98 E4, "Taskbar Properties and docking": the taskbar moves to
// any edge by a drag of its empty area, slides away under Auto hide, goes
// behind the windows with Always on top off, and drops its clock with Show
// Clock off. jsdom lays nothing out: the desktop's box (640 × 480) and the
// taskbar's thickness (28) are stubbed.

const DESKTOP = { left: 0, top: 0, width: 640, height: 480 };
const THICKNESS = 28;

describe("classicyTaskbarEdgeAt", () => {
	const rect = { left: 0, top: 0, width: 640, height: 480 };
	it("docks to the edge whose quarter of the desktop, cut by its diagonals, holds the pointer", () => {
		expect(classicyTaskbarEdgeAt([320, 470], rect)).toBe("bottom");
		expect(classicyTaskbarEdgeAt([320, 10], rect)).toBe("top");
		expect(classicyTaskbarEdgeAt([10, 240], rect)).toBe("left");
		expect(classicyTaskbarEdgeAt([630, 240], rect)).toBe("right");
		// Proportions, not pixels: 100 px from the left of a wide desktop is
		// nearer, relatively, than 100 px from its top.
		expect(classicyTaskbarEdgeAt([100, 100], rect)).toBe("left");
		expect(classicyTaskbarEdgeAt([200, 60], rect)).toBe("top");
	});

	it("goes to the bottom or top before a side on a diagonal, and to the bottom without a desktop", () => {
		expect(classicyTaskbarEdgeAt([320, 240], rect)).toBe("bottom");
		expect(classicyTaskbarEdgeAt([0, 0], rect)).toBe("top");
		expect(
			classicyTaskbarEdgeAt([5, 5], { left: 0, top: 0, width: 0, height: 0 }),
		).toBe("bottom");
	});

	it("measures from the desktop's own corner", () => {
		const offset = { left: 100, top: 50, width: 640, height: 480 };
		expect(classicyTaskbarEdgeAt([110, 290], offset)).toBe("left");
		expect(classicyTaskbarEdgeAt([420, 520], offset)).toBe("bottom");
	});
});

describe("auto hide's slide", () => {
	it("leaves a 2 px strip on the edge", () => {
		expect(classicyTaskbarHiddenTranslate("bottom", 28)).toBe("0 26px");
		expect(classicyTaskbarHiddenTranslate("top", 28)).toBe("0 -26px");
		expect(classicyTaskbarHiddenTranslate("left", 60)).toBe("-58px 0");
		expect(classicyTaskbarHiddenTranslate("right", 60)).toBe("58px 0");
		expect(classicyTaskbarHiddenTranslate("bottom", 0)).toBe("0 0px");
	});

	it("slides away at 1 px per 10 ms and back at 10 px per 10 ms (ReactOS's speeds)", () => {
		expect(classicyTaskbarAutoHideDuration(28, true)).toBe(260);
		expect(classicyTaskbarAutoHideDuration(28, false)).toBe(30);
		expect(classicyTaskbarAutoHideDuration(0, true)).toBe(0);
	});

	it("knows a side taskbar stands upright", () => {
		expect(isClassicyTaskbarVertical("left")).toBe(true);
		expect(isClassicyTaskbarVertical("right")).toBe(true);
		expect(isClassicyTaskbarVertical("top")).toBe(false);
		expect(isClassicyTaskbarVertical("bottom")).toBe(false);
	});
});

describe("the taskbar's stored settings", () => {
	beforeEach(() =>
		useAppManager.setState(structuredClone(DefaultAppManagerState), true),
	);
	const taskbar = () => useAppManager.getState().System.Manager.Desktop.taskbar;

	it("start as Windows 98 installs them: bottom, on top, shown, large icons, the clock", () => {
		expect(classicyTaskbarEdge(taskbar())).toBe("bottom");
		expect(classicyTaskbarOptions(taskbar())).toEqual({
			alwaysOnTop: true,
			autoHide: false,
			smallStartMenuIcons: false,
			showClock: true,
		});
	});

	it("store the edge a drag docks it to, and refuse one that is not an edge", () => {
		dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "left" });
		expect(taskbar()?.edge).toBe("left");
		dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "middle" });
		expect(taskbar()?.edge).toBe("left");
		expect(classicyTaskbarEdge({ edge: "middle" as never })).toBe("bottom");
	});

	it("store Taskbar Properties' options, the booleans given and nothing else", () => {
		dispatch({
			type: "ClassicyDesktopTaskbarSetOptions",
			options: {
				alwaysOnTop: false,
				autoHide: true,
				showClock: "no",
				extra: true,
			},
		});
		expect(taskbar()).toEqual({ alwaysOnTop: false, autoHide: true });
		dispatch({ type: "ClassicyDesktopTaskbarSetOptions", options: null });
		expect(taskbar()).toEqual({ alwaysOnTop: false, autoHide: true });
		expect(classicyTaskbarOptions(taskbar())).toEqual({
			alwaysOnTop: false,
			autoHide: true,
			smallStartMenuIcons: false,
			showClock: true,
		});
	});

	it("clear the Run history on Clear", () => {
		dispatch({
			type: "ClassicyDesktopTaskbarAddRunCommand",
			command: "notepad",
		});
		expect(taskbar()?.runHistory).toEqual(["notepad"]);
		dispatch({ type: "ClassicyDesktopTaskbarClearHistory" });
		expect(taskbar()?.runHistory).toBeUndefined();
	});

	it("persist with the desktop", () => {
		dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "top" });
		dispatch({
			type: "ClassicyDesktopTaskbarSetOptions",
			options: { autoHide: true },
		});
		const saved = sanitizeStateForPersistence(useAppManager.getState());
		expect(saved.System.Manager.Desktop.taskbar).toMatchObject({
			edge: "top",
			autoHide: true,
		});
	});
});

describe("ClassicyTaskbar docked and hidden", () => {
	const restore: (() => void)[] = [];
	const stubSize = (prop: "offsetHeight" | "offsetWidth", value: number) => {
		const original = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			prop,
		);
		Object.defineProperty(HTMLElement.prototype, prop, {
			configurable: true,
			get(this: HTMLElement) {
				return this.classList.contains("classicyTaskbar") ? value : 0;
			},
		});
		restore.push(() => {
			if (original)
				Object.defineProperty(HTMLElement.prototype, prop, original);
		});
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		registerTestTaskbarPackage();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_TASKBAR_PACKAGE_ID,
			}),
		);
		stubSize("offsetHeight", THICKNESS);
		stubSize("offsetWidth", 60);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				return this.classList.contains("classicyDesktop")
					? DOMRect.fromRect({
							x: DESKTOP.left,
							y: DESKTOP.top,
							width: DESKTOP.width,
							height: DESKTOP.height,
						})
					: DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			},
		);
	});

	afterEach(() => {
		for (const undo of restore.splice(0)) undo();
		vi.restoreAllMocks();
		vi.useRealTimers();
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		resetClassicyTaskbarBandForTests();
	});

	const renderTaskbar = () =>
		render(
			<div className="classicyDesktop" id="classicyDesktop">
				<ClassicyTaskbar />
			</div>,
		);
	const bar = () =>
		document.querySelector("nav.classicyTaskbar") as HTMLElement;
	const stored = () => useAppManager.getState().System.Manager.Desktop.taskbar;

	describe("docking", () => {
		it("sits at the bottom by default, and takes its band there", () => {
			renderTaskbar();
			expect(bar()).toHaveClass("classicyTaskbarEdgeBottom");
			expect(bar()).not.toHaveClass("classicyTaskbarVertical");
			expect(getClassicyTaskbarBand()).toBe(THICKNESS);
		});

		it("draws itself on the stored edge, a side's band its width", () => {
			act(() =>
				dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "left" }),
			);
			renderTaskbar();
			expect(bar()).toHaveClass(
				"classicyTaskbarEdgeLeft",
				"classicyTaskbarVertical",
			);
			expect(getClassicyTaskbarInsets()).toEqual({
				top: 0,
				right: 0,
				bottom: 0,
				left: 60,
			});
			act(() =>
				dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "top" }),
			);
			expect(bar()).toHaveClass("classicyTaskbarEdgeTop");
			expect(getClassicyTaskbarInsets()).toEqual({
				top: THICKNESS,
				right: 0,
				bottom: 0,
				left: 0,
			});
		});

		it("follows a drag of its empty area to another edge, and docks there at the release", () => {
			renderTaskbar();
			fireEvent.mouseDown(bar(), { button: 0, clientX: 300, clientY: 470 });
			// Within the drag rectangle nothing moves.
			fireEvent.mouseMove(document, {
				clientX: 300 + CLASSICY_TASKBAR_DRAG_THRESHOLD_PX - 1,
				clientY: 470,
			});
			expect(bar()).not.toHaveClass("dragging");
			fireEvent.mouseMove(document, { clientX: 630, clientY: 240 });
			expect(bar()).toHaveClass("dragging", "classicyTaskbarEdgeRight");
			expect(stored()?.edge).toBeUndefined();
			fireEvent.mouseMove(document, { clientX: 320, clientY: 8 });
			expect(bar()).toHaveClass("classicyTaskbarEdgeTop");
			fireEvent.mouseUp(document, { clientX: 320, clientY: 8 });
			expect(bar()).not.toHaveClass("dragging");
			expect(stored()?.edge).toBe("top");
			expect(bar()).toHaveClass("classicyTaskbarEdgeTop");
		});

		it("stores nothing for a drag that ends on its own edge, or a click", () => {
			renderTaskbar();
			fireEvent.mouseDown(bar(), { button: 0, clientX: 300, clientY: 470 });
			fireEvent.mouseMove(document, { clientX: 400, clientY: 460 });
			fireEvent.mouseUp(document);
			fireEvent.mouseDown(bar(), { button: 0, clientX: 300, clientY: 470 });
			fireEvent.mouseUp(document);
			expect(stored()?.edge).toBeUndefined();
		});

		it("moves from the bands' and the status area's empty space, never from a button, a gripper or with button 2", () => {
			renderTaskbar();
			const drag = (target: Element, button = 0) => {
				fireEvent.mouseDown(target, { button, clientX: 300, clientY: 470 });
				fireEvent.mouseMove(document, { clientX: 10, clientY: 240 });
				const moved = bar().classList.contains("dragging");
				fireEvent.mouseUp(document);
				return moved;
			};
			expect(
				drag(document.querySelector(".classicyTaskbarStart") as Element),
			).toBe(false);
			expect(
				drag(document.querySelector(".classicyTaskbarGripper") as Element),
			).toBe(false);
			expect(drag(bar(), 2)).toBe(false);
			expect(stored()?.edge).toBeUndefined();
			expect(
				drag(document.querySelector(".classicyTaskbarTray") as Element),
			).toBe(true);
			expect(stored()?.edge).toBe("left");
		});

		it("docks where it is when the pointer stream is lost", () => {
			renderTaskbar();
			fireEvent.mouseDown(bar(), { button: 0, clientX: 300, clientY: 470 });
			fireEvent.mouseMove(document, { clientX: 10, clientY: 240 });
			act(() => {
				window.dispatchEvent(new Event("blur"));
			});
			expect(stored()?.edge).toBe("left");
		});
	});

	describe("Auto hide", () => {
		const enable = () =>
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { autoHide: true },
				}),
			);

		it("slides off its edge to a 2 px strip, taking no band", () => {
			vi.useFakeTimers();
			enable();
			renderTaskbar();
			expect(bar()).toHaveClass("classicyTaskbarAutoHide", "collapsed");
			expect(bar().style.translate).toBe("0 26px");
			expect(bar().style.transitionDuration).toBe("260ms");
			expect(getClassicyTaskbarBand()).toBe(0);
		});

		it("comes in when the pointer reaches it and goes 2 s after it leaves", () => {
			vi.useFakeTimers();
			enable();
			renderTaskbar();
			fireEvent.mouseEnter(bar());
			act(() =>
				vi.advanceTimersByTime(CLASSICY_TASKBAR_AUTOHIDE_SHOW_DELAY_MS),
			);
			expect(bar()).not.toHaveClass("collapsed");
			expect(bar().style.translate).toBe("0 0");
			expect(bar().style.transitionDuration).toBe("30ms");
			fireEvent.mouseLeave(bar());
			act(() =>
				vi.advanceTimersByTime(CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS - 1),
			);
			expect(bar()).not.toHaveClass("collapsed");
			act(() => vi.advanceTimersByTime(1));
			expect(bar()).toHaveClass("collapsed");
		});

		it("stays while its Start menu is open, and comes in when it opens", () => {
			vi.useFakeTimers();
			enable();
			renderTaskbar();
			fireEvent.keyDown(document.body, {
				key: "Escape",
				code: "Escape",
				ctrlKey: true,
			});
			expect(bar()).not.toHaveClass("collapsed");
			act(() =>
				vi.advanceTimersByTime(CLASSICY_TASKBAR_AUTOHIDE_HIDE_DELAY_MS * 2),
			);
			expect(bar()).not.toHaveClass("collapsed");
		});

		it("slides off the side it is docked to", () => {
			vi.useFakeTimers();
			act(() =>
				dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge: "right" }),
			);
			enable();
			renderTaskbar();
			expect(bar().style.translate).toBe("58px 0");
		});

		it("comes back for good when turned off", () => {
			vi.useFakeTimers();
			enable();
			renderTaskbar();
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { autoHide: false },
				}),
			);
			expect(bar()).not.toHaveClass("collapsed");
			expect(bar()).not.toHaveClass("classicyTaskbarAutoHide");
			expect(bar().style.translate).toBe("");
			expect(getClassicyTaskbarBand()).toBe(THICKNESS);
		});
	});

	describe("Always on top", () => {
		it("is on by default: never behind the windows", () => {
			renderTaskbar();
			expect(bar()).not.toHaveClass("classicyTaskbarBelow");
		});

		it("off, goes behind the windows until pressed, and back when a window is activated", () => {
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { alwaysOnTop: false },
				}),
			);
			renderTaskbar();
			expect(bar()).toHaveClass("classicyTaskbarBelow");
			fireEvent.mouseDown(bar(), { button: 0 });
			fireEvent.mouseUp(document);
			expect(bar()).not.toHaveClass("classicyTaskbarBelow");
			act(() =>
				dispatch({
					type: "ClassicyWindowOpen",
					app: { id: "Finder.app", name: "Finder", icon: "" },
					window: {
						id: "w1",
						appId: "Finder.app",
						position: [10, 10],
						size: [100, 100],
						minimumSize: [0, 0],
						closed: false,
					},
				}),
			);
			expect(bar()).toHaveClass("classicyTaskbarBelow");
		});
	});

	describe("Show Clock", () => {
		it("draws the clock by default and none while it is off", () => {
			renderTaskbar();
			expect(document.querySelector(".classicyTaskbarClock")).not.toBeNull();
			act(() =>
				dispatch({
					type: "ClassicyDesktopTaskbarSetOptions",
					options: { showClock: false },
				}),
			);
			expect(document.querySelector(".classicyTaskbarClock")).toBeNull();
			expect(document.querySelector(".classicyTaskbarTray")).not.toBeNull();
		});
	});
});
