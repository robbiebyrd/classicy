// #291: the size a window stores must be the size it applies as its inline
// width/height. `.classicyWindow` is content-box, so its frame padding and
// border sit outside that box; storing the bounding rect instead made the
// window draw larger by its chrome after every click-and-reload.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import {
	ClassicyWindow,
	classicyWindowContentSize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
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
										size: [425, 300] as [number, number],
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
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

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

// The window's chrome per side, as the SCSS would apply it: a fractional
// frame inset (padding) plus a 1 px border.
const PADDING = 4.8;
const BORDER = 1;
const CHROME = 2 * (PADDING + BORDER);

// jsdom runs no layout, so stand in for a content-box element: the rect is
// the inline width/height plus padding and border on both sides.
const applyChrome = (el: HTMLElement) => {
	el.style.padding = `${PADDING}px`;
	el.style.border = `${BORDER}px solid black`;
};

const resizeDispatches = () =>
	mockDispatch.mock.calls
		.map(
			(call) =>
				call[0] as {
					type: string;
					resizing?: boolean;
					size?: [number, number];
				},
		)
		.filter((action) => action.type === "ClassicyWindowResize");

const renderWindow = () => {
	const result = render(
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Test"
			resizable
			zoomable
		>
			<p>content</p>
		</ClassicyWindow>,
	);
	const root = result.container.querySelector(".classicyWindow") as HTMLElement;
	applyChrome(root);
	return { ...result, root };
};

describe("classicyWindowContentSize", () => {
	it("subtracts padding and border from the bounding rect", () => {
		const el = document.createElement("div");
		applyChrome(el);
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			width: 425 + CHROME,
			height: 300 + CHROME,
		} as DOMRect);
		const [w, h] = classicyWindowContentSize(el);
		expect(w).toBeCloseTo(425);
		expect(h).toBeCloseTo(300);
	});

	it("never returns a negative size", () => {
		const el = document.createElement("div");
		applyChrome(el);
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			width: 0,
			height: 0,
		} as DOMRect);
		expect(classicyWindowContentSize(el)).toEqual([0, 0]);
	});
});

describe("ClassicyWindow stored size (#291)", () => {
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDispatch.mockClear();
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const width = (Number.parseFloat(this.style.width) || 0) + CHROME;
				const height = (Number.parseFloat(this.style.height) || 0) + CHROME;
				return {
					width,
					height,
					top: 110,
					left: 110,
					right: 110 + width,
					bottom: 110 + height,
					x: 110,
					y: 110,
					toJSON: () => {},
				} as DOMRect;
			});
	});

	afterEach(() => {
		rectSpy.mockRestore();
	});

	it("does not write a size for a plain title-bar click", () => {
		const { container, root } = renderWindow();
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;

		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(root);

		expect(resizeDispatches()).toHaveLength(0);
	});

	it("stores the unchanged size for a grow-box press that never moves", () => {
		const { container, root } = renderWindow();
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		fireEvent.mouseDown(resizer, { clientX: 530, clientY: 410 });
		fireEvent.mouseUp(resizer, { clientX: 530, clientY: 410 });

		// Exact, not approximate: a known size is reused rather than re-measured,
		// so the browser's sub-pixel rounding can't nudge it on every press.
		const dispatches = resizeDispatches();
		expect(dispatches.map((a) => a.resizing)).toEqual([true, false]);
		expect(dispatches.map((a) => a.size)).toEqual([
			[425, 300],
			[425, 300],
		]);
		// The window is drawn at the same size it started at — no jump.
		expect(root.style.width).toBe("425px");
		expect(root.style.height).toBe("300px");
	});

	it("stores the size the window is drawn at after a resize drag", () => {
		const { container, root } = renderWindow();
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		fireEvent.mouseDown(resizer, { clientX: 530, clientY: 410 });
		fireEvent.mouseMove(document.body, { clientX: 505, clientY: 365 });
		fireEvent.mouseUp(root);

		const last = resizeDispatches().at(-1);
		expect(last?.resizing).toBe(false);
		expect(last?.size).toEqual([400, 260]);
		expect(root.style.width).toBe("400px");
		expect(root.style.height).toBe("260px");
	});

	it("stores the drawn size when the release lands outside the window", () => {
		const { container } = renderWindow();
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		fireEvent.mouseDown(resizer, { clientX: 530, clientY: 410 });
		fireEvent.mouseMove(document.body, { clientX: 605, clientY: 465 });
		fireEvent.mouseUp(document.body, { clientX: 605, clientY: 465 });

		const last = resizeDispatches().at(-1);
		expect(last?.resizing).toBe(false);
		expect(last?.size).toEqual([500, 360]);
	});

	// Clicks used to persist a zoomed window's size as a side effect; with that
	// gone, zoom must store the size it draws itself.
	it("stores the size a zoom draws the window at", () => {
		const { container, root } = renderWindow();
		const zoomBox = container.querySelector(
			".classicyWindowZoomBox",
		) as HTMLElement;

		fireEvent.click(zoomBox);

		const last = resizeDispatches().at(-1);
		expect(last?.resizing).toBe(false);
		expect(last?.size).toEqual([
			Number.parseFloat(root.style.width),
			Number.parseFloat(root.style.height),
		]);
	});
});
