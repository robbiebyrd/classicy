// Platinum's layout, for the DOM snapshot below.
import "@classicy/appearance-platinum";
import { StrictMode, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { classicyWindowDomSnapshot } from "@/__tests__/windowDomSnapshot";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									focused: false,
									windows: windowsRecord({
										id: "TestWindow",
										appId: "TestApp",
										collapsed: false,
										focused: false,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: false,
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
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("dispatches ClassicyWindowDestroy when a modal window unmounts", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
				<p>body</p>
			</ClassicyWindow>,
		);
		expect(destroyCalls()).toHaveLength(0);
		unmount();
		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "TestWindow" },
		});
	});

	it("dispatches nothing on unmount for a non-modal window", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Doc">
				<p>body</p>
			</ClassicyWindow>,
		);
		unmount();
		expect(destroyCalls()).toHaveLength(0);
	});
});

describe("ClassicyWindow modal lifecycle under StrictMode", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// StrictMode double-invokes effects on mount in dev: run -> phantom
	// cleanup -> run again, reusing the same component instance (refs
	// survive the phantom cycle). The modal cleanup effect destroys the
	// store record on that phantom teardown; if it doesn't also reset the
	// `windowRegistered` ref, the registration effect's re-run sees the ref
	// already `true` and never re-dispatches ClassicyWindowOpen, so the
	// destroyed record never comes back even though the window stays
	// mounted and visible. This asserts the ref reset keeps registration
	// symmetric with destruction: a ClassicyWindowOpen must follow the
	// phantom ClassicyWindowDestroy.
	it("re-registers after StrictMode's phantom teardown destroys the record", () => {
		render(
			<StrictMode>
				<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
					<p>body</p>
				</ClassicyWindow>
			</StrictMode>,
		);

		const lifecycleTypes = mockDispatch.mock.calls
			.map((c) => (c[0] as { type: string }).type)
			.filter(
				(type) =>
					type === "ClassicyWindowOpen" || type === "ClassicyWindowDestroy",
			);

		expect(lifecycleTypes).toEqual([
			"ClassicyWindowOpen",
			"ClassicyWindowDestroy",
			"ClassicyWindowOpen",
		]);
	});
});

describe("ClassicyWindow modal initialFocusRef (#270)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("hands the focus trap's initial focus to initialFocusRef", () => {
		const Dialog = () => {
			const defaultRef = useRef<HTMLButtonElement | null>(null);
			return (
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Dialog"
					modal
					initialFocusRef={defaultRef}
				>
					<button type="button">Cancel</button>
					<button type="button" ref={defaultRef}>
						OK
					</button>
				</ClassicyWindow>
			);
		};
		render(<Dialog />);

		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "OK" }),
		);
	});
});

// Plan 0020-w98 §8: under Platinum's layout a modal draws exactly this root,
// frame and title bar: no Close box when it is not closable, and a fixed
// alert keeps `classicyWindowModalFixed`. Every shell flag is absent here, so
// no step of the plan may change them.
describe("ClassicyWindow modal DOM under Platinum's layout", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("draws a movable modal's root and title bar as before", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Dialog"
				modal
				closable={false}
				collapsable={false}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = document.querySelector(".classicyWindow") as HTMLElement;
		expect(classicyWindowDomSnapshot(root)).toMatchInlineSnapshot(`
			"root: <div id="TestApp_TestWindow" role="application" aria-label="Dialog" style="width: 350px; height: 200px; left: 110px; top: 110px; min-width: 300px; min-height: 0px;" class="classicyWindow classicyWindowDocument active classicyWindowModal classicyWindowModalFront classicyWindowScrollBarsHidden"></div>
			children:
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-top" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-right" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-bottom" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-left" role="presentation"></div>
			  <div class="classicyWindowTitleBar classicyWindowTitleBarModal"></div>
			  <div class="classicyWindowContentsModal"></div>
			  <div class="classicyWindowResizer classicyWindowResizerDimmed" role="presentation"></div>
			titleBar:
			<div class="classicyWindowTitleBar classicyWindowTitleBarModal">
			<div class="classicyWindowTitle" role="presentation">
			<div class="classicyWindowTitleLeft"></div>
			<div class="classicyWindowIcon">
			<img alt="Dialog" src="/assets/img/icons/system/files/file.png"></div>
			<div class="classicyWindowTitleText">
			<p>Dialog</p></div>
			<div class="classicyWindowTitleRight"></div></div></div>"
		`);
	});

	it("draws a fixed alert's root and title bar as before", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title=""
				modal
				type="error"
				closable={false}
				collapsable={false}
				zoomable={false}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = document.querySelector(".classicyWindow") as HTMLElement;
		expect(classicyWindowDomSnapshot(root)).toMatchInlineSnapshot(`
			"root: <div id="TestApp_TestWindow" role="application" style="width: 350px; height: 200px; left: 110px; top: 110px; min-width: 300px; min-height: 0px;" class="classicyWindow classicyWindowDocument active classicyWindowModal classicyWindowRed classicyWindowModalFixed classicyWindowScrollBarsHidden"></div>
			children:
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-top" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-right" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-bottom" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-left" role="presentation"></div>
			  <div class="classicyWindowTitleBar classicyWindowTitleBarModal"></div>
			  <div class="classicyWindowContentsModal"></div>
			  <div class="classicyWindowResizer classicyWindowResizerDimmed" role="presentation"></div>
			titleBar:
			<div class="classicyWindowTitleBar classicyWindowTitleBarModal">
			<div class="classicyWindowTitle" role="presentation">
			<div class="classicyWindowTitleCenter"></div></div></div>"
		`);
	});
});
