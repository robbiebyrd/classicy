// Both "halt" and "focus" were tracked OUTSIDE guards that already existed
// directly beneath them, so each fired on activity that wasn't the thing the
// event name claims:
//
//   - stopChangeWindow is bound to onMouseUp on the window root, so it runs on
//     every mouse release anywhere in the window. track("halt") sat above the
//     `if (ws.resizing || ws.dragging || ws.moving)` guard, so a plain click
//     counted as a completed drag/resize.
//   - setActive tracked before its own `if (!ws.focused)` guard, so clicking an
//     already-focused window kept emitting "focus" -- an event that should mean
//     "this window BECAME focused".
//
// Measured effect in production GA4 (Jun-Aug 2026): "focus" 187,635 and "halt"
// 87,757 out of 362,588 total classicy_* events -- 76% of all analytics volume
// between them, at a focus:halt ratio of 2.14. That ratio is the signature of
// the defect: the root binds BOTH onMouseUp (which calls setActive internally)
// and onClick (which calls it again), so one ordinary click produced two
// "focus" and one "halt".
//
// The halt guard here reads the REFS, not ws.*: ws is the store's async echo
// and never updates under a static test mock, whereas isDraggingRef is set only
// once a drag passes dragThreshold and isResizingRef only on resize start.
// docUpHandlerRef already gates on those same refs for the same reason.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());
// Mutable so a test can render a window that is ALREADY focused, which is the
// only state in which the setActive guard is observable.
const windowState = vi.hoisted(() => ({ focused: false }));

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
									focused: windowState.focused,
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											collapsed: false,
											focused: windowState.focused,
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

const trackCalls = (name: string) =>
	mockTrack.mock.calls.filter((call) => call[0] === name);

describe("ClassicyWindow analytics fire only on the thing they name", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockTrack.mockClear();
		windowState.focused = false;
	});

	describe('"halt" means a drag or resize completed', () => {
		it("does NOT fire for a plain click that never becomes a drag", () => {
			const { container } = renderWindow();
			const titleBar = container.querySelector(
				".classicyWindowTitle",
			) as HTMLElement;

			// Press and release in place: pendingDragRef is set, but the pointer
			// never passes dragThreshold, so no drag was ever promoted.
			fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
			fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });

			expect(trackCalls("halt")).toHaveLength(0);
		});

		it("does NOT fire for a click on the window body", () => {
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;

			fireEvent.mouseDown(root, { clientX: 200, clientY: 200 });
			fireEvent.mouseUp(root, { clientX: 200, clientY: 200 });

			expect(trackCalls("halt")).toHaveLength(0);
		});

		it("fires exactly once when a real drag ends", () => {
			const { container } = renderWindow();
			const titleBar = container.querySelector(
				".classicyWindowTitle",
			) as HTMLElement;

			fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
			// Past dragThreshold, so promoteDragIfNeeded sets isDraggingRef.
			fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
			fireEvent.mouseUp(titleBar, { clientX: 170, clientY: 140 });

			expect(trackCalls("halt")).toHaveLength(1);
		});

		it("fires exactly once when a real resize ends", () => {
			const { container } = renderWindow({ resizable: true });
			const resizer = container.querySelector(
				".classicyWindowResizer",
			) as HTMLElement;

			fireEvent.mouseDown(resizer, { clientX: 400, clientY: 300 });
			fireEvent.mouseUp(resizer, { clientX: 450, clientY: 350 });

			expect(trackCalls("halt")).toHaveLength(1);
		});
	});

	describe('"focus" means the window BECAME focused', () => {
		it("fires when clicking a window that was not focused", () => {
			windowState.focused = false;
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;

			fireEvent.click(root);

			expect(trackCalls("focus").length).toBeGreaterThan(0);
		});

		it("does NOT fire when clicking a window that is already focused", () => {
			windowState.focused = true;
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;

			fireEvent.click(root);

			expect(trackCalls("focus")).toHaveLength(0);
		});

		it("does NOT fire on a mouse release inside an already-focused window", () => {
			// stopChangeWindow calls setActive() too, so the mouseup path has to
			// respect the same guard -- otherwise every click in the focused
			// window still emits one "focus", which is most of the 187,635.
			windowState.focused = true;
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;

			fireEvent.mouseDown(root, { clientX: 200, clientY: 200 });
			fireEvent.mouseUp(root, { clientX: 200, clientY: 200 });
			fireEvent.click(root);

			expect(trackCalls("focus")).toHaveLength(0);
		});

		it("still dispatches the real focus action when unfocused (tracking guard did not change behavior)", () => {
			windowState.focused = false;
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;

			fireEvent.click(root);

			const focusDispatches = mockDispatch.mock.calls
				.map((call) => call[0] as { type: string })
				.filter((a) => a.type === "ClassicyWindowFocus");
			expect(focusDispatches.length).toBeGreaterThan(0);
		});
	});
});
