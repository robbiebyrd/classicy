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
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// Registers Platinum's sound pack, which the default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
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
	// The window also observes its contents box (scroll bars on overflow);
	// the re-centering observer is the one watching the window element.
	static watching(el: Element): MockResizeObserver {
		const found = MockResizeObserver.instances.find((o) =>
			o.observe.mock.calls.some((call) => call[0] === el),
		);
		if (!found) throw new Error("no ResizeObserver observes the window");
		return found;
	}
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

		const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
		expect(el).toBeTruthy();
		// Simulate the box having actually grown (e.g. an <img> finishing load)
		// to a real measured size, in place of the phantom [0, 0] it was
		// centered against at mount.
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(mockRect(400, 300));

		mockDispatch.mockClear();
		MockResizeObserver.watching(el).callback();

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
		MockResizeObserver.watching(el).callback();

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
		MockResizeObserver.watching(el).callback();

		expect(moveDispatches()).toHaveLength(0);
	});
});

// Plan 0018-dbd: a package may center windows on whole pixels
// (`layout.window.centering: "wholePixel"`, System 7). The core's default,
// `"exact"`, keeps a centered window on a half pixel when the free space is
// odd, so no other package's pixels move.
const WHOLE_PIXEL_PACKAGE = "test-whole-pixel";
const registerWholePixelPackage = () =>
	registerClassicyAppearancePackage({
		id: WHOLE_PIXEL_PACKAGE,
		name: "Whole Pixel",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-whole-pixel-default",
			package: WHOLE_PIXEL_PACKAGE,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			window: { growBoxCorner: "bottom-right", centering: "wholePixel" },
		},
	});

describe("resolvePosition centering", () => {
	afterEach(resetViewport);

	it("centers exactly by default, on a half pixel when the free space is odd", () => {
		setViewport(800, 600);
		expect(resolvePosition(["center", "center"], [101, 51], 20)).toEqual([
			349.5, 274.5,
		]);
		expect(
			resolvePosition(["center", "center"], [101, 51], 20, "exact"),
		).toEqual([349.5, 274.5]);
	});

	it("rounds a centered axis to a whole pixel when asked, and only a centered one", () => {
		setViewport(800, 600);
		expect(
			resolvePosition(["center", "center"], [101, 51], 20, "wholePixel"),
		).toEqual([350, 275]);
		expect(
			resolvePosition([10.5, "center"], [101, 51], 20, "wholePixel"),
		).toEqual([10.5, 275]);
		expect(
			resolvePosition(["right", "bottom"], [100.5, 50.5], 20, "wholePixel"),
		).toEqual([699.5, 549.5]);
	});
});

describe("ClassicyWindow whole-pixel centering (a package's layout)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		MockResizeObserver.instances = [];
		vi.stubGlobal("ResizeObserver", MockResizeObserver);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		resetViewport();
		resetClassicyAppearancePackagesForTests();
	});

	const openedAt = () =>
		(
			mockDispatch.mock.calls.find(
				(call) => (call[0] as { type: string }).type === "ClassicyWindowOpen",
			)?.[0] as { window: { position: [number, number] } }
		).window.position;

	const renderCentered = () =>
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				initialSize={[101, 51]}
				initialPosition={["center", "center"]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

	it("opens and re-centers a centered window on whole pixels under a package that asks", () => {
		resetClassicyAppearancePackagesForTests();
		registerWholePixelPackage();
		setViewport(800, 600);
		const { container } = renderCentered();
		expect(openedAt()).toEqual([350, 275]);

		const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(mockRect(301, 201));
		mockDispatch.mockClear();
		MockResizeObserver.watching(el).callback();
		expect(moveDispatches()[0]?.position).toEqual([250, 200]);
	});

	it("keeps the exact half pixel under a package that does not", () => {
		setViewport(800, 600);
		renderCentered();
		expect(openedAt()).toEqual([349.5, 274.5]);
	});
});
