import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_FRAME_EDGES_LAYOUT,
	TEST_FRAME_EDGES_PACKAGE_ID,
	TEST_MAXIMIZE_LAYOUT,
	TEST_MAXIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
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
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import type { ClassicyWindowSizingEdges } from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";

// Plan 0020-w98 §5 "Frame-edge sizing" (`layout.window.frameEdges`; WIG Ch.6
// "Sizing Borders", p.83). The window runs on the real store and reducer, so
// each case pins the rect the window stores after a gesture.

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const APP = "Sizing.app";
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

// jsdom lays nothing out: a window's rect is its inline left/top/width/height
// plus its frame on both sides, as a content-box element's would be.
const rectOf = (el: HTMLElement): DOMRect => {
	if (!el.classList.contains("classicyWindow"))
		return {
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			toJSON: () => {},
		} as DOMRect;
	const left = Number.parseFloat(el.style.left) || 0;
	const top = Number.parseFloat(el.style.top) || 0;
	const width = (Number.parseFloat(el.style.width) || 0) + CHROME;
	const height = (Number.parseFloat(el.style.height) || 0) + CHROME;
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
const part = (selector: string, id = "main") =>
	root(id).querySelector(selector) as HTMLElement;
const edgeOf = (edge: string, id = "main") =>
	part(`.classicyWindowFrameEdge-${edge}`, id);

const sizingWindow = (
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

// A press at `from`, a move to `to` outside the window (the document's
// listener) and a release there.
const drag = (
	target: HTMLElement,
	from: [number, number],
	to: [number, number],
) => {
	fireEvent.mouseDown(target, { clientX: from[0], clientY: from[1] });
	fireEvent.mouseMove(document.body, { clientX: to[0], clientY: to[1] });
	fireEvent.mouseUp(document.body, { clientX: to[0], clientY: to[1] });
};

const usePackage = (id: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: id }),
	);

const sizing = () => {
	registerTestTaskbarPackage(
		TEST_FRAME_EDGES_LAYOUT,
		TEST_FRAME_EDGES_PACKAGE_ID,
	);
	usePackage(TEST_FRAME_EDGES_PACKAGE_ID);
};

// The menu bar's band the window keeps below (the layout keeps the screen
// bar): the active theme's `--menu-bar-height`.
const menuBarHeight = () =>
	Number.parseFloat(
		(
			getThemeVars(
				useAppManager.getState().System.Manager.Appearance
					.activeTheme as ClassicyTheme,
			) as Record<string, string>
		)["--menu-bar-height"],
	);

const CORNERS: [string, ClassicyWindowSizingEdges][] = [
	["top-left-h", "top-left"],
	["top-left-v", "top-left"],
	["top-right-h", "top-right"],
	["top-right-v", "top-right"],
	["bottom-left-h", "bottom-left"],
	["bottom-left-v", "bottom-left"],
	["bottom-right-h", "bottom-right"],
	["bottom-right-v", "bottom-right"],
];

describe("ClassicyWindow under window.frameEdges", () => {
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		localStorage.clear();
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
						name: "Sizing",
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
		act(() => setClassicyTaskbarBand(0));
		unregisterClassicyAppearancePackage(TEST_FRAME_EDGES_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_MAXIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		Object.assign(window, {
			innerWidth: VIEWPORT[0],
			innerHeight: VIEWPORT[1],
		});
	});

	describe("under the default layout (the frame moves the window)", () => {
		it("draws no sizing border and no corner arms", () => {
			render(sizingWindow());
			expect(root()).not.toHaveClass("classicyWindowSizingBorder");
			expect(root().querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
				4,
			);
			expect(
				root().querySelectorAll(".classicyWindowFrameCorner"),
			).toHaveLength(0);
		});

		it.each([
			"top",
			"right",
			"bottom",
			"left",
		])("a drag on the %s edge moves the window and keeps its size", (edge) => {
			render(sizingWindow());
			const at: [number, number] =
				edge === "top"
					? [200, TOP + 1]
					: edge === "bottom"
						? [200, BOTTOM - 1]
						: edge === "left"
							? [LEFT + 1, 300]
							: [RIGHT - 1, 300];
			drag(edgeOf(edge), at, [at[0] + 20, at[1] + 30]);
			expect(record()).toMatchObject({
				position: [LEFT + 20, TOP + 30],
				size: [WIDTH, HEIGHT],
				resizing: false,
			});
		});

		it("takes no pointer capture", () => {
			const capture = vi.fn();
			Object.assign(HTMLElement.prototype, { setPointerCapture: capture });
			try {
				render(sizingWindow());
				fireEvent.pointerDown(edgeOf("right"), { pointerId: 7, button: 0 });
				expect(capture).not.toHaveBeenCalled();
			} finally {
				delete (HTMLElement.prototype as { setPointerCapture?: unknown })
					.setPointerCapture;
			}
		});
	});

	describe('under window.frameEdges: "resize"', () => {
		beforeEach(sizing);

		it("gives a resizable window a sizing border and eight corner arms", () => {
			render(sizingWindow());
			expect(root()).toHaveClass("classicyWindowSizingBorder");
			expect(root().querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
				4,
			);
			const arms = [
				...root().querySelectorAll<HTMLElement>(".classicyWindowFrameCorner"),
			];
			expect(arms.map((arm) => arm.className)).toEqual(
				CORNERS.map(
					([arm]) =>
						`classicyWindowFrameCorner classicyWindowFrameCorner-${arm}`,
				),
			);
			for (const arm of arms)
				expect(arm).toHaveAttribute("role", "presentation");
		});

		// Each edge moves alone; the opposite edge stays where it was.
		it.each<[string, [number, number], [number, number], number[], number[]]>([
			["right", [RIGHT - 1, 300], [RIGHT + 39, 330], [LEFT, TOP], [440, 300]],
			["left", [LEFT + 1, 300], [LEFT - 19, 330], [LEFT - 20, TOP], [420, 300]],
			[
				"bottom",
				[200, BOTTOM - 1],
				[230, BOTTOM + 29],
				[LEFT, TOP],
				[400, 330],
			],
			["top", [200, TOP + 1], [230, TOP - 19], [LEFT, TOP - 20], [400, 320]],
		])("a drag on the %s edge sizes the window from that edge", (edge, from, to, position, size) => {
			render(sizingWindow());
			drag(edgeOf(edge), from, to);
			expect(record()).toMatchObject({ position, size, resizing: false });
			expect(root().style.width).toBe(`${size[0]}px`);
			expect(root().style.height).toBe(`${size[1]}px`);
			expect(root().style.left).toBe(`${position[0]}px`);
			expect(root().style.top).toBe(`${position[1]}px`);
		});

		// Both of a corner's edges move, from either of its arms.
		it.each(
			CORNERS,
		)("the %s arm sizes both edges of its corner", (arm, corner) => {
			render(sizingWindow());
			const left = corner.endsWith("left");
			const top = corner.startsWith("top");
			const from: [number, number] = [
				left ? LEFT + 1 : RIGHT - 1,
				top ? TOP + 1 : BOTTOM - 1,
			];
			// Outward by 20 across and 10 down.
			const to: [number, number] = [
				from[0] + (left ? -20 : 20),
				from[1] + (top ? -10 : 10),
			];
			drag(part(`.classicyWindowFrameCorner-${arm}`), from, to);
			expect(record()).toMatchObject({
				position: [left ? LEFT - 20 : LEFT, top ? TOP - 10 : TOP],
				size: [WIDTH + 20, HEIGHT + 10],
				resizing: false,
			});
		});

		it("resizes while the pointer stays inside the window too", () => {
			render(sizingWindow());
			fireEvent.mouseDown(edgeOf("right"), {
				clientX: RIGHT - 1,
				clientY: 300,
			});
			fireEvent.mouseMove(root(), { clientX: RIGHT - 101, clientY: 300 });
			expect(root().style.width).toBe("300px");
			expect(record()?.resizing).toBe(true);
			fireEvent.mouseUp(root(), { clientX: RIGHT - 101, clientY: 300 });
			expect(record()).toMatchObject({ size: [300, HEIGHT], resizing: false });
		});

		it("stops a moving edge at the minimum, the opposite edge kept", () => {
			render(sizingWindow({ minimumSize: [300, 250] }));
			drag(edgeOf("left"), [LEFT + 1, 300], [LEFT + 201, 300]);
			expect(record()).toMatchObject({
				position: [RIGHT - CHROME - 300, TOP],
				size: [300, HEIGHT],
			});
			drag(edgeOf("top"), [200, TOP + 1], [200, TOP + 201]);
			expect(record()).toMatchObject({
				position: [RIGHT - CHROME - 300, BOTTOM - CHROME - 250],
				size: [300, 250],
			});
		});

		it("stops a top edge at the menu bar's underside and a left edge at the screen's left", () => {
			render(sizingWindow());
			drag(edgeOf("top"), [200, TOP + 1], [200, -500]);
			const floor = menuBarHeight();
			expect(record()).toMatchObject({
				position: [LEFT, floor],
				size: [WIDTH, BOTTOM - CHROME - floor],
			});
			drag(edgeOf("left"), [LEFT + 1, 300], [-500, 300]);
			expect(record()).toMatchObject({
				position: [0, floor],
				size: [RIGHT - CHROME, BOTTOM - CHROME - floor],
			});
		});

		// The work area's right and bottom, measured as the release clamp
		// measures them (the left or top plus the content size), so the clamp
		// leaves the window where the drag left it.
		it("stops a right edge at the screen's right and a bottom edge at its bottom", () => {
			render(sizingWindow());
			drag(edgeOf("right"), [RIGHT - 1, 300], [5000, 300]);
			drag(edgeOf("bottom"), [200, BOTTOM - 1], [200, 5000]);
			expect(record()).toMatchObject({
				position: [LEFT, TOP],
				size: [VIEWPORT[0] - LEFT, VIEWPORT[1] - TOP],
			});
		});

		it("stops a bottom edge at the taskbar's top", () => {
			act(() => setClassicyTaskbarBand(28));
			render(sizingWindow());
			drag(edgeOf("bottom"), [200, BOTTOM - 1], [200, 5000]);
			expect(record()).toMatchObject({
				position: [LEFT, TOP],
				size: [WIDTH, VIEWPORT[1] - 28 - TOP],
			});
		});

		// The height CSS draws a window at most (`max-height: calc(100% -
		// var(--window-max-height-reserve))`, of its containing block): a top
		// drag stops there, so the bottom edge stays where it was.
		it("stops at the height reserve's cap, the opposite edge kept", () => {
			render(
				sizingWindow({
					style: {
						...FRAME_STYLE,
						["--window-max-height-reserve" as string]: "53px",
					},
				}),
			);
			const block = root().parentElement as HTMLElement;
			Object.defineProperty(block, "clientHeight", { value: 453 });
			Object.defineProperty(root(), "offsetParent", { value: block });
			drag(edgeOf("top"), [200, TOP + 1], [200, TOP - 150]);
			// 453 − 53: the content stops at 400 tall, its bottom at 508.
			expect(record()).toMatchObject({
				position: [LEFT, BOTTOM - CHROME - 400],
				size: [WIDTH, 400],
			});
		});

		it("activates the window on the press, as sizing does in Windows", () => {
			render(
				<>
					{sizingWindow()}
					{sizingWindow({ id: "other", initialPosition: [600, 100] })}
				</>,
			);
			expect(record("other")?.focused).toBe(true);
			expect(record()?.focused).toBe(false);
			fireEvent.mouseDown(edgeOf("right"), {
				clientX: RIGHT - 1,
				clientY: 300,
			});
			expect(record()?.focused).toBe(true);
			fireEvent.mouseUp(document.body);
		});

		it("ends the gesture where it is when the pointer stream is lost", () => {
			render(sizingWindow());
			fireEvent.mouseDown(edgeOf("bottom"), {
				clientX: 200,
				clientY: BOTTOM - 1,
			});
			fireEvent.mouseMove(document.body, {
				clientX: 200,
				clientY: BOTTOM + 49,
			});
			act(() => {
				window.dispatchEvent(new Event("blur"));
			});
			expect(record()).toMatchObject({
				size: [WIDTH, HEIGHT + 50],
				resizing: false,
			});
			// The pointer returning with no button held sizes nothing.
			fireEvent.mouseMove(document.body, { clientX: 200, clientY: 700 });
			expect(root().style.height).toBe(`${HEIGHT + 50}px`);
		});

		it("ignores a press with another button", () => {
			render(sizingWindow());
			fireEvent.mouseDown(edgeOf("right"), {
				clientX: RIGHT - 1,
				clientY: 300,
				button: 2,
			});
			fireEvent.mouseMove(document.body, { clientX: RIGHT + 99, clientY: 300 });
			fireEvent.mouseUp(document.body);
			expect(record()).toMatchObject({
				position: [LEFT, TOP],
				size: [WIDTH, HEIGHT],
				resizing: false,
			});
		});

		// The browser keeps the edge's resize cursor however far the pointer
		// outruns it, as Windows keeps the sizing cursor through a drag.
		it("captures the pointer on a button-1 press of an edge or corner arm", () => {
			const capture = vi.fn();
			Object.assign(HTMLElement.prototype, { setPointerCapture: capture });
			try {
				render(sizingWindow());
				fireEvent.pointerDown(edgeOf("right"), { pointerId: 7, button: 0 });
				fireEvent.pointerDown(part(".classicyWindowFrameCorner-top-left-h"), {
					pointerId: 8,
					button: 0,
				});
				fireEvent.pointerDown(edgeOf("left"), { pointerId: 9, button: 2 });
				expect(capture.mock.calls).toEqual([[7], [8]]);
			} finally {
				delete (HTMLElement.prototype as { setPointerCapture?: unknown })
					.setPointerCapture;
			}
		});

		// A fixed border neither moves nor sizes a window in Windows (WIG Ch.6
		// "Window Frames", p.76).
		it("leaves a non-resizable window's edges inert", () => {
			render(sizingWindow({ resizable: false }));
			expect(root()).not.toHaveClass("classicyWindowSizingBorder");
			expect(
				root().querySelectorAll(".classicyWindowFrameCorner"),
			).toHaveLength(0);
			for (const edge of ["top", "right", "bottom", "left"]) {
				drag(edgeOf(edge), [200, TOP + 1], [260, TOP + 61]);
				expect(record()).toMatchObject({
					position: [LEFT, TOP],
					size: [WIDTH, HEIGHT],
					moving: false,
					resizing: false,
				});
			}
		});

		it("leaves a non-resizable modal's edges inert", () => {
			render(sizingWindow({ modal: true, resizable: false }));
			const modal = document.getElementById(`${APP}_main`) as HTMLElement;
			expect(modal).not.toHaveClass("classicyWindowSizingBorder");
			drag(edgeOf("right"), [RIGHT - 1, 300], [RIGHT + 59, 360]);
			expect(record()).toMatchObject({
				position: [LEFT, TOP],
				size: [WIDTH, HEIGHT],
			});
		});

		it("draws no edges, arms or sizing border while maximized", () => {
			render(sizingWindow());
			fireEvent.click(part(".classicyWindowZoomBox"));
			expect(root()).toHaveClass("classicyWindowMaximized");
			expect(root()).not.toHaveClass("classicyWindowSizingBorder");
			expect(root().querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
				0,
			);
			expect(
				root().querySelectorAll(".classicyWindowFrameCorner"),
			).toHaveLength(0);
			// Restored, the border is back.
			fireEvent.click(part(".classicyWindowZoomBox"));
			expect(root()).toHaveClass("classicyWindowSizingBorder");
			expect(
				root().querySelectorAll(".classicyWindowFrameCorner"),
			).toHaveLength(8);
		});
	});

	// A maximizing package without the flag keeps the default's moving frame.
	it("leaves the frame moving the window under a layout without the flag", () => {
		registerTestTaskbarPackage(TEST_MAXIMIZE_LAYOUT, TEST_MAXIMIZE_PACKAGE_ID);
		usePackage(TEST_MAXIMIZE_PACKAGE_ID);
		render(sizingWindow());
		expect(root()).not.toHaveClass("classicyWindowSizingBorder");
		expect(root().querySelectorAll(".classicyWindowFrameCorner")).toHaveLength(
			0,
		);
		drag(edgeOf("right"), [RIGHT - 1, 300], [RIGHT + 19, 330]);
		expect(record()).toMatchObject({
			position: [LEFT + 20, TOP + 30],
			size: [WIDTH, HEIGHT],
		});
	});
});
