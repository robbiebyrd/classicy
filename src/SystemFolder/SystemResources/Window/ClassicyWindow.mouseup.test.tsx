// Regression coverage for the duplicate-binding defect: stopChangeWindow was
// previously bound as onMouseUp on FOUR nested elements (the root, each of
// the four frame edges, the title bar, and the resizer). Because those
// elements nest inside the root, a single mouse release bubbled through more
// than one binding and fired the handler twice -- duplicate "halt" analytics,
// duplicate sound-stop, and duplicate move/resize/focus dispatches per click.
// The fix keeps exactly one binding, on the outermost (root) element.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());

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
									windows: [
										{
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
										},
									],
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
		useClassicyAnalytics: () => ({ track: mockTrack, page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
}

type DispatchedAction = {
	type: string;
	dragging?: boolean;
	moving?: boolean;
	resizing?: boolean;
};

const dispatchedTypes = (): DispatchedAction[] =>
	mockDispatch.mock.calls.map((call) => call[0] as DispatchedAction);

// setDragging(false) and setMoving(false, ...) are called unconditionally at
// the end of both stopChangeWindow and the document-level docUpHandlerRef, so
// a "drag ended" ClassicyWindowDrag{dragging:false} dispatch is a reliable
// one-dispatch-per-invocation signal, unlike ClassicyWindowResize (gated
// behind resizable/!collapsed) or the focus dispatch (gated behind
// !ws.focused).
const dragEndDispatches = () =>
	dispatchedTypes().filter(
		(a) => a.type === "ClassicyWindowDrag" && a.dragging === false,
	);

const moveEndDispatches = () =>
	dispatchedTypes().filter(
		(a) => a.type === "ClassicyWindowMove" && a.moving === false,
	);

const resizeEndDispatches = () =>
	dispatchedTypes().filter(
		(a) => a.type === "ClassicyWindowResize" && a.resizing === false,
	);

const haltTrackCalls = () =>
	mockTrack.mock.calls.filter((call) => call[0] === "halt");

describe("ClassicyWindow stopChangeWindow single-binding (#codebase-review-remediation-12)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockTrack.mockClear();
	});

	it("fires stopChangeWindow exactly once for a mouse release on the title bar after a drag", () => {
		const { container } = renderWindow();
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;

		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		// Past the drag threshold, so this is a real drag, not a bare click.
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		fireEvent.mouseUp(titleBar, { clientX: 170, clientY: 140 });

		expect(dragEndDispatches()).toHaveLength(1);
		expect(moveEndDispatches()).toHaveLength(1);
		expect(haltTrackCalls()).toHaveLength(1);
	});

	it("fires stopChangeWindow exactly once for a mouse release on a frame edge after a drag", () => {
		const { container } = renderWindow();
		const edge = container.querySelector(
			".classicyWindowFrameEdge-top",
		) as HTMLElement;

		fireEvent.mouseDown(edge, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		fireEvent.mouseUp(edge, { clientX: 170, clientY: 140 });

		expect(dragEndDispatches()).toHaveLength(1);
		expect(moveEndDispatches()).toHaveLength(1);
		expect(haltTrackCalls()).toHaveLength(1);
	});

	it("fires stopChangeWindow exactly once for a mouse release on the resizer after a resize", () => {
		const { container } = renderWindow({ resizable: true });
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		fireEvent.mouseDown(resizer, { clientX: 400, clientY: 300 });
		fireEvent.mouseUp(resizer, { clientX: 450, clientY: 350 });

		expect(resizeEndDispatches()).toHaveLength(1);
		expect(dragEndDispatches()).toHaveLength(1);
		expect(haltTrackCalls()).toHaveLength(1);
	});

	it("still ends a title-bar drag correctly (dispatches the final position exactly once)", () => {
		const { container } = renderWindow();
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;

		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		fireEvent.mouseUp(titleBar, { clientX: 170, clientY: 140 });

		// A single final-position dispatch (moving: false) -- not zero (drag
		// never ended) and not two (double-fired) -- is what "ends correctly"
		// means here: exactly one release, one settle.
		expect(moveEndDispatches()).toHaveLength(1);
		expect(dragEndDispatches()).toHaveLength(1);
	});

	it("still ends a resize from the grow box correctly (dispatches the final size once)", () => {
		const { container } = renderWindow({ resizable: true });
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		fireEvent.mouseDown(resizer, { clientX: 400, clientY: 300 });
		fireEvent.mouseUp(resizer, { clientX: 450, clientY: 350 });

		const resizes = resizeEndDispatches();
		expect(resizes).toHaveLength(1);
		expect(resizes[0]?.type).toBe("ClassicyWindowResize");
	});

	// The handler also coordinates with a document-level mouseup listener
	// (docMoveHandlerRef/docUpHandlerRef, driven by pendingDragRef/
	// isDraggingRef/isResizingRef) for releases that land outside the window's
	// own DOM subtree entirely. That path is untouched by this fix -- it was
	// never one of the four nested bindings -- but must keep working, and must
	// not itself double-fire.
	it("still ends a drag via the document-level mouseup listener when the release lands outside the window", () => {
		const { container } = renderWindow();
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;

		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		// Promote to a real drag via the document-level mousemove listener.
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });

		// Release on document.body itself: not a descendant of the window root,
		// so React's onMouseUp binding on the window never sees this event --
		// only the native document-level listener (docUpHandlerRef) does.
		fireEvent.mouseUp(document.body, { clientX: 170, clientY: 140 });

		expect(dragEndDispatches()).toHaveLength(1);
		expect(moveEndDispatches()).toHaveLength(1);
		// docUpHandlerRef's stop-sound call is gated only by isDraggingRef, not
		// by store state (unlike the React-bound stopChangeWindow), so it's a
		// direct signal that this code path -- not the React one -- handled it.
		expect(mockPlayer).toHaveBeenCalledWith(
			expect.objectContaining({ sound: "ClassicyWindowMoveStop" }),
		);

		// pendingDragRef/isDraggingRef were reset by the document-level handler,
		// so further movement must not resume the drag.
		mockDispatch.mockClear();
		fireEvent.mouseMove(document.body, { clientX: 300, clientY: 300 });
		const resumedDrags = dispatchedTypes().filter(
			(a) => a.type === "ClassicyWindowMove" && a.moving === true,
		);
		expect(resumedDrags).toHaveLength(0);
	});
});
