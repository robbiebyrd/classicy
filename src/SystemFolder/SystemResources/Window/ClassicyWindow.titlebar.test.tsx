// The window sounds come from Platinum's hooks. ClassicyIcons is not mocked:
// the icon tree registers itself in ClassicyIcons.ts, which Platinum's assets
// import and read at load, and a mock of a different shape broke that module.
import "@classicy/appearance-platinum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MAXIMIZE_LAYOUT,
	TEST_MAXIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { classicyWindowDomSnapshot } from "@/__tests__/windowDomSnapshot";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockWindowState = vi.hoisted(() => ({ collapsed: false, zoomed: false }));
const mockDesktop = vi.hoisted(() => ({ doubleClickTitleToCollapse: true }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: {
							doubleClickTitleToCollapse:
								mockDesktop.doubleClickTitleToCollapse,
						},
						Applications: {
							apps: {
								TestApp: {
									focused: false,
									windows: windowsRecord({
										id: "TestWindow",
										appId: "TestApp",
										collapsed: mockWindowState.collapsed,
										focused: false,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: mockWindowState.zoomed,
										closed: false,
										size: [350, 200] as [number, number],
										position: [110, 110] as [number, number],
										minimumSize: [0, 0] as [number, number],
										menuBar: [] as unknown[],
										default: false,
									}),
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
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

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection (`Appearance.packageId`), Platinum's unless a
// case switches it.
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	const result = render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
	const titleBar = result.container.querySelector(
		".classicyWindowTitle",
	) as HTMLElement;
	return { ...result, titleBar };
}

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => call[0] as { type: string });

const dragStartEvents = () =>
	dispatchedTypes().filter(
		(e: { type: string; dragging?: boolean; moving?: boolean }) =>
			(e.type === "ClassicyWindowDrag" && e.dragging === true) ||
			(e.type === "ClassicyWindowMove" && e.moving === true),
	);

describe("ClassicyWindow title bar", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindowState.collapsed = false;
		mockDesktop.doubleClickTitleToCollapse = true;
	});

	it("does not start a drag on a bare click", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });
		expect(dragStartEvents()).toHaveLength(0);
		expect(mockPlayer).not.toHaveBeenCalledWith(
			expect.objectContaining({ sound: "ClassicyWindowMoveIdle" }),
		);
	});

	it("does not start a drag when movement stays under the threshold", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 152, clientY: 121 });
		fireEvent.mouseUp(document.body, { clientX: 152, clientY: 121 });
		expect(dragStartEvents()).toHaveLength(0);
	});

	it("starts a drag once movement exceeds the threshold", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 160, clientY: 130 });
		expect(dragStartEvents().length).toBeGreaterThan(0);
		expect(mockPlayer).toHaveBeenCalledWith(
			expect.objectContaining({ sound: "ClassicyWindowMoveIdle" }),
		);
		// The promotion event must carry the pointer-derived position so a
		// drag delivered in a single fast mousemove is not lost (jsdom rects
		// are all zeros, so the offset equals the mousedown coordinates).
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({
				type: "ClassicyWindowMove",
				moving: true,
				position: [10, 10],
			}),
		);
	});

	it("does not start a drag on movement after the button is released", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 200, clientY: 200 });
		expect(dragStartEvents()).toHaveLength(0);
	});

	it("collapses the window on double-click", () => {
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowCollapse" }),
		);
	});

	it("expands a collapsed window on double-click", () => {
		mockWindowState.collapsed = true;
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowExpand" }),
		);
	});

	it("ignores double-click when the window is not collapsable", () => {
		const { titleBar } = renderWindow({ collapsable: false });
		fireEvent.dblClick(titleBar);
		const collapseEvents = dispatchedTypes().filter(
			(e) =>
				e.type === "ClassicyWindowCollapse" ||
				e.type === "ClassicyWindowExpand",
		);
		expect(collapseEvents).toHaveLength(0);
	});

	// #206: double-click-title-to-collapse is gated behind a desktop preference.
	it("does not collapse on double-click when the desktop preference is off", () => {
		mockDesktop.doubleClickTitleToCollapse = false;
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		const collapseEvents = dispatchedTypes().filter(
			(e) =>
				e.type === "ClassicyWindowCollapse" ||
				e.type === "ClassicyWindowExpand",
		);
		expect(collapseEvents).toHaveLength(0);
	});

	// #206: a plain collapse-box click still collapses the window.
	it("collapses on a plain collapse-box click", () => {
		const { container } = renderWindow();
		const box = container.querySelector(
			".classicyWindowCollapseBox",
		) as HTMLElement;
		fireEvent.click(box);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowCollapse" }),
		);
	});

	// #206: Option-clicking the collapse box drives the collapse-all path.
	it("collapses on an option-click of the collapse box", () => {
		const { container } = renderWindow();
		const box = container.querySelector(
			".classicyWindowCollapseBox",
		) as HTMLElement;
		fireEvent.click(box, { altKey: true });
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowCollapse" }),
		);
	});

	// The wrapper is the title bar's flex item, so it carries the part
	// attribute the base `order` rules (and a package) key on.
	it("tags each control wrapper", () => {
		const { container } = renderWindow();
		for (const c of ["close", "zoom", "collapse"])
			expect(
				container.querySelector(
					`.classicyWindowControlBox[data-classicy-control="${c}"]`,
				),
			).not.toBeNull();
	});
});

// Plan 0020-w98 §8: under Platinum's layout (this file registers Platinum)
// a document window draws exactly this root, frame and title bar. Every
// shell flag is absent here, so no step of the plan may change it.
describe("ClassicyWindow DOM under Platinum's layout", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockWindowState.collapsed = false;
		mockDesktop.doubleClickTitleToCollapse = true;
	});

	it("draws a document window's root and title bar as before", () => {
		const { container } = renderWindow({ icon: "doc.png" });
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(classicyWindowDomSnapshot(root)).toMatchInlineSnapshot(`
			"root: <div id="TestApp_TestWindow" role="application" aria-label="Test" style="width: 350px; height: 200px; left: 110px; top: 110px; min-width: 300px; min-height: 0px;" class="classicyWindow classicyWindowDocument inactive classicyWindowScrollBarsHidden"></div>
			children:
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-top" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-right" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-bottom" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-left" role="presentation"></div>
			  <div class="classicyWindowTitleBar"></div>
			  <div class="classicyScrollArea inactive classicyWindowContentsDimmed classicyWindowContents"></div>
			  <div class="classicyWindowResizer classicyWindowResizerDimmed" role="presentation"></div>
			titleBar:
			<div class="classicyWindowTitleBar">
			<div class="classicyWindowControlBox" data-classicy-control="close">
			<div class="classicyWindowCloseBox" role="button" aria-label="Close" tabindex="0"></div></div>
			<div class="classicyWindowTitle" role="presentation">
			<div class="classicyWindowTitleLeft"></div>
			<div class="classicyWindowIcon">
			<img alt="Test" src="doc.png"></div>
			<div class="classicyWindowTitleText">
			<p>Test</p></div>
			<div class="classicyWindowTitleRight"></div></div>
			<div class="classicyWindowControlBox" data-classicy-control="zoom">
			<div class="classicyWindowZoomBox" role="button" aria-label="Zoom" tabindex="0"></div></div>
			<div class="classicyWindowControlBox" data-classicy-control="collapse">
			<div class="classicyWindowCollapseBox" role="button" aria-label="Collapse" tabindex="0"></div></div></div>"
		`);
	});
});

// Plan 0020-w98 §5, "The caption's double-click": `layout.window
// .titleDoubleClick` decides what a double-click on the caption does.
describe("ClassicyWindow caption double-click under window.titleDoubleClick", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockWindowState.collapsed = false;
		mockWindowState.zoomed = false;
		mockDesktop.doubleClickTitleToCollapse = true;
	});

	afterEach(() => {
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_MAXIMIZE_PACKAGE_ID);
	});

	const zooming = () => {
		registerTestTaskbarPackage(TEST_MAXIMIZE_LAYOUT, TEST_MAXIMIZE_PACKAGE_ID);
		activePackage.id = TEST_MAXIMIZE_PACKAGE_ID;
	};

	const zoomAndCollapseEvents = () =>
		dispatchedTypes().filter((e) =>
			[
				"ClassicyWindowZoom",
				"ClassicyWindowCollapse",
				"ClassicyWindowExpand",
			].includes(e.type),
		);

	it("collapses, never zooms, under the default layout", () => {
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		// A collapse clears the zoom flag, as it always has; nothing zooms in.
		expect(dispatchedTypes()).not.toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowZoom", zoomed: true }),
		);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowCollapse" }),
		);
	});

	describe('under "zoom"', () => {
		beforeEach(zooming);

		it("maximizes the window, never collapsing it", () => {
			const { titleBar } = renderWindow();
			fireEvent.dblClick(titleBar);
			expect(zoomAndCollapseEvents()).toEqual([
				expect.objectContaining({
					type: "ClassicyWindowZoom",
					zoomed: true,
					restore: { position: [110, 110], size: [350, 200] },
				}),
			]);
		});

		it("zooms whatever the desktop's collapse preference says", () => {
			mockDesktop.doubleClickTitleToCollapse = false;
			const { titleBar } = renderWindow();
			fireEvent.dblClick(titleBar);
			expect(zoomAndCollapseEvents()).toEqual([
				expect.objectContaining({ type: "ClassicyWindowZoom", zoomed: true }),
			]);
		});

		it("restores a maximized window", () => {
			mockWindowState.zoomed = true;
			const { titleBar } = renderWindow();
			fireEvent.dblClick(titleBar);
			expect(zoomAndCollapseEvents()).toEqual([
				expect.objectContaining({ type: "ClassicyWindowZoom", zoomed: false }),
			]);
		});

		it("does nothing on a window that cannot zoom, not even a collapse", () => {
			const { titleBar } = renderWindow({ zoomable: false });
			fireEvent.dblClick(titleBar);
			expect(zoomAndCollapseEvents()).toHaveLength(0);
		});

		it("does nothing on a palette, which has no Maximize button", () => {
			const { container } = renderWindow({ windowType: "utility" });
			const title = container.querySelector(
				".classicyWindowTitle",
			) as HTMLElement;
			fireEvent.dblClick(title);
			expect(zoomAndCollapseEvents()).toHaveLength(0);
		});

		it("does nothing on a modal's caption", () => {
			renderWindow({ modal: true });
			const title = document.querySelector(
				".classicyWindowModal .classicyWindowTitle",
			) as HTMLElement;
			fireEvent.dblClick(title);
			expect(zoomAndCollapseEvents()).toHaveLength(0);
		});
	});
});
