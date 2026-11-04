// A window move or resize follows the pointer with document-level
// listeners. When the pointer stream is lost mid-gesture (the window blurs,
// a pointercancel, the page is hidden), no release may ever arrive, so the
// gesture ends where it is, exactly as a release there would end it: the
// store's gesture flags are cleared and the window keeps the geometry it was
// dragged to. It never resumes following the pointer on return.
import "@/Appearance/Platinum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { fireEvent, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
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
	size?: [number, number];
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

const movingDispatches = () =>
	dispatchedTypes().filter(
		(a) => a.type === "ClassicyWindowMove" && a.moving === true,
	);

const moveStopSounds = () =>
	mockPlayer.mock.calls.filter(
		(call) =>
			(call[0] as { sound?: string }).sound === "ClassicyWindowMoveStop",
	);

describe("ClassicyWindow when the pointer stream is lost", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockTrack.mockClear();
	});
	afterEach(() => vi.restoreAllMocks());

	const titleBarOf = (container: HTMLElement) =>
		container.querySelector(".classicyWindowTitle") as HTMLElement;
	const resizerOf = (container: HTMLElement) =>
		container.querySelector(".classicyWindowResizer") as HTMLElement;

	it.each(POINTER_STREAM_LOSSES)("ends a move where it is on a %s", (loss) => {
		const { container } = renderWindow();
		fireEvent.mouseDown(titleBarOf(container), { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		expect(movingDispatches().length).toBeGreaterThan(0);

		losePointerStream(loss);
		// The store's gesture flags are cleared, once, and the package hears
		// the end (Platinum's dragEnd hook plays the stop sound).
		expect(dragEndDispatches()).toHaveLength(1);
		expect(moveEndDispatches()).toHaveLength(1);
		expect(moveStopSounds()).toHaveLength(1);

		// On return the window does not follow the pointer, and the release
		// that finally comes ends nothing more.
		mockDispatch.mockClear();
		fireEvent.mouseMove(document.body, { clientX: 300, clientY: 300 });
		expect(movingDispatches()).toHaveLength(0);
		fireEvent.mouseUp(document.body, { clientX: 300, clientY: 300 });
		expect(dragEndDispatches()).toHaveLength(0);
		expect(moveStopSounds()).toHaveLength(1);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("forgets a title-bar press that has not dragged yet on a %s", (loss) => {
		const { container } = renderWindow();
		fireEvent.mouseDown(titleBarOf(container), {
			clientX: 150,
			clientY: 120,
		});
		losePointerStream(loss);
		// Moving with no button held must not turn the old press into a drag.
		fireEvent.mouseMove(document.body, { clientX: 300, clientY: 300 });
		expect(movingDispatches()).toHaveLength(0);
		expect(dragEndDispatches()).toHaveLength(0);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a resize at the size it was dragged to on a %s", (loss) => {
		const { container } = renderWindow({ resizable: true });
		const win = container.querySelector(".classicyWindow") as HTMLElement;
		fireEvent.mouseDown(resizerOf(container), {
			clientX: 400,
			clientY: 300,
		});
		fireEvent.mouseMove(document.body, { clientX: 460, clientY: 380 });
		const dragged = [
			Number.parseFloat(win.style.width),
			Number.parseFloat(win.style.height),
		];

		losePointerStream(loss);
		const ends = resizeEndDispatches();
		expect(ends).toHaveLength(1);
		// Where it is, not back where it started.
		expect(ends[0]?.size).toEqual(dragged);
		expect(dragEndDispatches()).toHaveLength(1);

		// The pointer coming back does not resize it any further.
		fireEvent.mouseMove(document.body, { clientX: 600, clientY: 500 });
		expect([
			Number.parseFloat(win.style.width),
			Number.parseFloat(win.style.height),
		]).toEqual(dragged);
		fireEvent.mouseUp(document.body, { clientX: 600, clientY: 500 });
		expect(resizeEndDispatches()).toHaveLength(1);
	});

	it("watches the pointer stream only while a press lasts", () => {
		const live = trackPointerStreamListeners();
		const { container, unmount } = renderWindow({ resizable: true });
		expect(live.size).toBe(0);

		// A move released on the window.
		fireEvent.mouseDown(titleBarOf(container), { clientX: 150, clientY: 120 });
		expect(live.size).toBe(3);
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		fireEvent.mouseUp(titleBarOf(container), { clientX: 170, clientY: 140 });
		expect(live.size).toBe(0);

		// A plain click on the title bar.
		fireEvent.mouseDown(titleBarOf(container), { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBarOf(container), { clientX: 150, clientY: 120 });
		expect(live.size).toBe(0);

		// A resize released outside the window.
		fireEvent.mouseDown(resizerOf(container), { clientX: 400, clientY: 300 });
		expect(live.size).toBe(3);
		fireEvent.mouseUp(document.body, { clientX: 450, clientY: 350 });
		expect(live.size).toBe(0);

		// A move whose stream is lost.
		fireEvent.mouseDown(titleBarOf(container), { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 170, clientY: 140 });
		losePointerStream("blur");
		expect(live.size).toBe(0);

		// Unmounted mid-drag: the listeners go with it.
		fireEvent.mouseDown(titleBarOf(container), { clientX: 150, clientY: 120 });
		expect(live.size).toBe(3);
		unmount();
		expect(live.size).toBe(0);
	});
});
