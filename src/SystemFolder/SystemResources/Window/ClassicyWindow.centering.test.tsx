// #248: an alert (or any window opened with a symbolic initialPosition) is
// centered exactly once, against whatever size it was handed at mount --
// [0, 0] for an auto-sized alert. Nothing re-measured or re-centered after
// mount, so async content growth (an <img> finishing layout) pushed the box
// off-true-center with no floor: a title bar could render above the menu bar
// or a window could hang off the right/bottom edge on a small viewport.
//
// This file covers:
//   - clampWindowPositionToViewport in isolation (pure, no DOM).
//   - its interaction with resolvePosition for a symbolic re-center (pure).
//   - the initial-paint clamp applying to explicit numeric coordinates too.
//   - the ResizeObserver wiring re-centering + clamping on content growth.
//   - that an explicit numeric initialPosition never gets silently moved.
//   - that a manual user drag permanently opts the window out of re-centering.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	ClassicyWindow,
	clampWindowPositionToViewport,
	resolvePosition,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow is used; only its external hooks are mocked. apps: {}
// means no persisted window record, so `ws` always falls back to the
// freshly-resolved (and now clamped) position -- the same shape
// ClassicyAlert.test.tsx uses, and the case this bug actually affects (a
// brand-new alert has no store entry to already hold a corrected position).
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: { apps: {} },
					},
				},
			}),
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

const ORIGINAL_WIDTH = window.innerWidth;
const ORIGINAL_HEIGHT = window.innerHeight;

function setViewport(width: number, height: number) {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: width,
	});
	Object.defineProperty(window, "innerHeight", {
		configurable: true,
		value: height,
	});
}

function resetViewport() {
	setViewport(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
}

type DispatchedMove = {
	type: string;
	moving?: boolean;
	position?: [number, number];
};

const moveDispatches = (): DispatchedMove[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as DispatchedMove)
		.filter((action) => action.type === "ClassicyWindowMove");

// jsdom has no ResizeObserver; this captures the callback ClassicyWindow
// registers so tests can invoke it manually -- the standard workaround given
// jsdom can't actually report a layout change.
class MockResizeObserver {
	static instances: MockResizeObserver[] = [];
	callback: () => void;
	constructor(callback: () => void) {
		this.callback = callback;
		MockResizeObserver.instances.push(this);
	}
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

function mockRect(width: number, height: number): DOMRect {
	return {
		width,
		height,
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	} as DOMRect;
}

describe("clampWindowPositionToViewport", () => {
	afterEach(resetViewport);

	it("leaves a position that already fits the viewport untouched", () => {
		setViewport(1000, 800);
		expect(clampWindowPositionToViewport([100, 100], [300, 200])).toEqual([
			100, 100,
		]);
	});

	it("pulls the right/bottom edge back so it never exceeds the viewport", () => {
		setViewport(800, 600);
		expect(clampWindowPositionToViewport([700, 700], [500, 500])).toEqual([
			300, 100,
		]);
	});

	it("never lets the title bar render above the menu bar", () => {
		setViewport(800, 600);
		expect(clampWindowPositionToViewport([10, -50], [200, 200])).toEqual([
			10, 30,
		]);
	});

	it("never lets the left edge render off the left of the viewport", () => {
		setViewport(800, 600);
		expect(clampWindowPositionToViewport([-50, 100], [200, 200])).toEqual([
			0, 100,
		]);
	});

	it("clamps to the top-left floor when the window is larger than the viewport itself", () => {
		setViewport(400, 300);
		expect(clampWindowPositionToViewport([50, 50], [2000, 2000])).toEqual([
			0, 30,
		]);
	});
});

describe("resolvePosition + clampWindowPositionToViewport interaction", () => {
	afterEach(resetViewport);

	it("re-centers a symbolic position against a newly measured (grown) size", () => {
		setViewport(1000, 800);
		const centered = resolvePosition(["center", "center"], [400, 300]);
		expect(clampWindowPositionToViewport(centered, [400, 300])).toEqual([
			300, 250,
		]);
	});
});

describe("ClassicyWindow initial-paint clamp (#248)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});
	afterEach(resetViewport);

	it("clamps an explicit numeric position that would otherwise render off-screen", () => {
		setViewport(800, 600);
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				initialSize={[500, 500]}
				initialPosition={[700, 700]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		const openCall = mockDispatch.mock.calls.find(
			(call) => (call[0] as { type: string }).type === "ClassicyWindowOpen",
		);
		expect(openCall).toBeDefined();
		const dispatched = openCall?.[0] as {
			window: { position: [number, number] };
		};
		// Uncapped, this would be [700, 700] -- off the bottom-right of an
		// 800x600 viewport. Numeric coordinates aren't exempt from the clamp,
		// only from the ResizeObserver re-center (see below).
		expect(dispatched.window.position).toEqual([300, 100]);
	});
});

describe("ClassicyWindow content-resize re-centering (#248)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		MockResizeObserver.instances = [];
		vi.stubGlobal("ResizeObserver", MockResizeObserver);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		resetViewport();
	});

	it("re-centers and re-clamps when the observed content grows after mount", () => {
		setViewport(1000, 800);
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				initialSize={[0, 0]}
				initialPosition={["center", "center"]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		expect(MockResizeObserver.instances).toHaveLength(1);

		const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
		expect(el).toBeTruthy();
		// Simulate the box having actually grown (e.g. an <img> finishing load)
		// to a real measured size, in place of the phantom [0, 0] it was
		// centered against at mount.
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(mockRect(400, 300));

		mockDispatch.mockClear();
		MockResizeObserver.instances[0].callback();

		const moves = moveDispatches();
		expect(moves).toHaveLength(1);
		expect(moves[0]?.position).toEqual([300, 250]);
	});

	it("never re-centers a window opened at an explicit numeric position", () => {
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				initialSize={[200, 200]}
				initialPosition={[50, 60]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(mockRect(900, 900));

		mockDispatch.mockClear();
		MockResizeObserver.instances[0].callback();

		expect(moveDispatches()).toHaveLength(0);
	});

	it("skips the observer re-center once the user has manually dragged the window", () => {
		const { container } = render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				initialSize={[0, 0]}
				initialPosition={["center", "center"]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		// Past the drag threshold, and released outside the window's own DOM
		// subtree so the document-level handler (docUpHandlerRef) is what
		// commits the move -- exercising the same path the manual-drag flag is
		// set from.
		fireEvent.mouseMove(document.body, { clientX: 200, clientY: 180 });
		fireEvent.mouseUp(document.body, { clientX: 200, clientY: 180 });

		const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(mockRect(400, 300));

		mockDispatch.mockClear();
		MockResizeObserver.instances[0].callback();

		expect(moveDispatches()).toHaveLength(0);
	});
});
