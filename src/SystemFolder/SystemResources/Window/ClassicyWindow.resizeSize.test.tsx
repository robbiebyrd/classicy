// #291: the size a window stores must be the size it applies as its inline
// width/height. `.classicyWindow` is content-box, so its frame padding and
// border sit outside that box; storing the bounding rect instead made the
// window draw larger by its chrome after every click-and-reload.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	ClassicyWindow,
	clampWindowPositionToViewport,
	classicyWindowContentSize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
// The mocked store's window record: `resizing` is what a grow-box press
// writes, and the window's own mousemove handler only resizes while it is set.
const mockWindow = vi.hoisted(() => ({ resizing: false }));

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection (`Appearance.packageId`).
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});

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
										resizing: mockWindow.resizing,
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

const renderWindow = (
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) => {
	const result = render(
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Test"
			resizable
			zoomable
			{...props}
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

	// The zoom target is applied as the content-box size, so it must be worked
	// out in that box: desktop room minus the chrome, and the current content
	// size rather than the rect.
	describe("zoom target", () => {
		// No #classicyDesktop is mounted, so the window falls back to the
		// viewport: 8 px margins all round, below a 30 px menu bar.
		const roomW = () => window.innerWidth - 16 - CHROME;
		const roomH = () => window.innerHeight - 30 - 16 - CHROME;
		const zoom = (container: HTMLElement) =>
			fireEvent.click(
				container.querySelector(".classicyWindowZoomBox") as HTMLElement,
			);
		const setInnerExtent = (
			container: HTMLElement,
			extent: Record<string, number>,
		) => {
			const inner = container.querySelector(
				".classicyWindowContentsInner",
			) as HTMLElement;
			for (const [key, value] of Object.entries(extent)) {
				Object.defineProperty(inner, key, { configurable: true, value });
			}
		};

		it("fills the desktop's room without overflowing it by the chrome", () => {
			const { container, root } = renderWindow();
			// Content far larger than the desktop, so the fit clamps to the room.
			setInnerExtent(container, {
				clientWidth: 400,
				clientHeight: 250,
				scrollWidth: 5000,
				scrollHeight: 5000,
			});
			zoom(container);
			expect(Number.parseFloat(root.style.width)).toBeCloseTo(roomW());
			expect(Number.parseFloat(root.style.height)).toBeCloseTo(roomH());
		});

		it("keeps the height exactly on a horizontal zoom", () => {
			const { container, root } = renderWindow({ zoomMode: "horizontal" });
			zoom(container);
			expect(Number.parseFloat(root.style.width)).toBeCloseTo(roomW());
			expect(root.style.height).toBe("300px");
		});

		it("keeps the width exactly on a vertical zoom", () => {
			const { container, root } = renderWindow({ zoomMode: "vertical" });
			zoom(container);
			expect(root.style.width).toBe("425px");
			expect(Number.parseFloat(root.style.height)).toBeCloseTo(roomH());
		});

		it("fits the content without adding the chrome to the fit", () => {
			const { container, root } = renderWindow();
			// Drawn at 425×300, the inner scroller shows 400×250 of 600×280.
			setInnerExtent(container, {
				clientWidth: 400,
				clientHeight: 250,
				scrollWidth: 600,
				scrollHeight: 280,
			});
			zoom(container);
			// 600 + (425 − 400) by 280 + (300 − 250).
			expect(root.style.width).toBe("625px");
			expect(root.style.height).toBe("330px");
		});
	});
});

// F 4.1: the grip may sit in any corner the active package declares; the
// resize anchors the corner opposite it, so the edges beside the grip move.
describe("ClassicyWindow resize with a mirrored grow box", () => {
	let platinum: ClassicyAppearancePackage | undefined;
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDispatch.mockClear();
		platinum = getClassicyAppearancePackage("platinum");
		registerTestMirrorPackage();
		activePackage.id = TEST_MIRROR_PACKAGE_ID;
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				left: 100,
				top: 100,
				right: 300,
				bottom: 250,
				width: 200,
				height: 150,
				x: 100,
				y: 100,
				toJSON: () => {},
			} as DOMRect);
	});

	afterEach(() => {
		rectSpy.mockRestore();
		mockWindow.resizing = false;
		activePackage.id = "platinum";
		resetClassicyAppearancePackagesForTests();
		if (platinum) registerClassicyAppearancePackage(platinum);
	});

	// The window under test: jsdom computes no chrome, so chrome is [0, 0].
	const renderMirrored = (minimumSize: [number, number]) => {
		// A fresh element each time: React skips a re-render handed the same
		// element object, so `rerenderWindow` really runs ClassicyWindow again.
		const ui = () => (
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				resizable
				zoomable
				minimumSize={minimumSize}
			>
				<p>content</p>
			</ClassicyWindow>
		);
		// Inside the desktop when one is mounted: the window reads theme
		// variables from its own element, which inherits them.
		const view = render(ui(), {
			container: document.getElementById("classicyDesktop") ?? undefined,
		});
		return {
			...view,
			rerenderWindow: () => view.rerender(ui()),
			windowEl: view.container.querySelector(".classicyWindow") as HTMLElement,
			resizer: view.container.querySelector(
				".classicyWindowResizer",
			) as HTMLElement,
		};
	};

	it("a bottom-left grow box moves the left edge while dragging", () => {
		// No minimum, so the brief's numbers are the drawn ones (the default
		// 300 px minimum would hold the window wider than 195px).
		const { container, rerenderWindow } = renderMirrored([0, 0]);
		const windowEl = container.querySelector(".classicyWindow") as HTMLElement;
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;

		mockWindow.resizing = true;
		fireEvent.mouseDown(resizer, { clientX: 100, clientY: 250 });
		fireEvent.mouseMove(windowEl, { clientX: 110, clientY: 260 });
		expect(windowEl.style.width).toBe("195px");
		expect(windowEl.style.height).toBe("165px");
		expect(windowEl.style.left).toBe("105px");
		expect(windowEl.style.top).toBe("100px");

		// A second move, after a re-render, still anchors the right edge.
		rerenderWindow();
		fireEvent.mouseMove(windowEl, { clientX: 90, clientY: 270 });
		expect(windowEl.style.width).toBe("215px");
		expect(windowEl.style.height).toBe("175px");
		expect(windowEl.style.left).toBe("85px");

		// The document listener (pointer outside the window) agrees.
		fireEvent.mouseMove(document.body, { clientX: 120, clientY: 255 });
		expect(windowEl.style.width).toBe("185px");
		expect(windowEl.style.height).toBe("160px");
		expect(windowEl.style.left).toBe("115px");
		expect(windowEl.style.top).toBe("100px");
	});

	// F 4.1 review: the drawn width never goes under the minimum, so the left
	// edge stops where the minimum width puts it and the right edge holds.
	it("stops the left edge at the minimum width", () => {
		const { windowEl, resizer } = renderMirrored([150, 0]);
		mockWindow.resizing = true;
		fireEvent.mouseDown(resizer, { clientX: 100, clientY: 250 });
		fireEvent.mouseMove(windowEl, { clientX: 110, clientY: 260 });
		expect(windowEl.style.left).toBe("105px");
		fireEvent.mouseMove(windowEl, { clientX: 200, clientY: 260 });
		expect(windowEl.style.width).toBe("105px");
		expect(windowEl.style.left).toBe("150px");
		fireEvent.mouseMove(windowEl, { clientX: 250, clientY: 260 });
		expect(windowEl.style.width).toBe("55px");
		expect(windowEl.style.left).toBe("150px");
	});

	// F 4.1 review: a flipped position never passes the floor
	// clampWindowPositionToViewport holds the window to (x >= 0, y >= 30), so
	// the release's re-clamp has nothing to move and the anchor stays put.
	it("stops a left grip at the screen's left edge", () => {
		const { windowEl, resizer } = renderMirrored([0, 0]);
		mockWindow.resizing = true;
		fireEvent.mouseDown(resizer, { clientX: 100, clientY: 250 });
		fireEvent.mouseMove(windowEl, { clientX: 2, clientY: 260 });
		expect(windowEl.style.left).toBe("0px");
		expect(windowEl.style.width).toBe("300px");
		fireEvent.mouseUp(windowEl);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyWindowResize",
				size: [300, 165],
			}),
		);
	});

	it("stops a top grip at the menu bar", () => {
		registerClassicyAppearancePackage({
			id: "test-top",
			name: "Top",
			css: "",
			defaults: {
				...getTheme("default"),
				id: "test-top-default",
				package: "test-top",
			},
			layout: {
				window: { growBoxCorner: "top-left" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		activePackage.id = "test-top";
		const { windowEl, resizer } = renderMirrored([0, 0]);
		mockWindow.resizing = true;
		fireEvent.mouseDown(resizer, { clientX: 100, clientY: 100 });
		fireEvent.mouseMove(windowEl, { clientX: 110, clientY: 10 });
		expect(windowEl.style.top).toBe("30px");
		expect(windowEl.style.height).toBe("220px");
		expect(windowEl.style.left).toBe("105px");
		expect(windowEl.style.width).toBe("195px");
		fireEvent.mouseUp(windowEl);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyWindowResize",
				size: [195, 220],
			}),
		);
	});

	// A theme whose menu bar is not 30 px: the resize floor and the release
	// clamp both read the live `--menu-bar-height`, so a top grip stops where
	// clampWindowPositionToViewport would put the window anyway and the
	// anchored bottom edge does not drift on release. The live
	// `--window-resize-inset` is the resize's fudge.
	it("a top grip and the release clamp agree on a 42 px menu bar", () => {
		registerClassicyAppearancePackage({
			id: "test-top",
			name: "Top",
			css: "",
			defaults: {
				...getTheme("default"),
				id: "test-top-default",
				package: "test-top",
			},
			layout: {
				window: { growBoxCorner: "top-left" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		activePackage.id = "test-top";
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--menu-bar-height", "42px");
		desktop.style.setProperty("--window-resize-inset", "9px");
		document.body.append(desktop);
		try {
			const { windowEl, resizer } = renderMirrored([0, 0]);
			mockWindow.resizing = true;
			fireEvent.mouseDown(resizer, { clientX: 100, clientY: 100 });
			fireEvent.mouseMove(windowEl, { clientX: 110, clientY: 10 });
			// Width: 300 − 110 + 9 = 199, so left = 300 − 199 = 101. Height: the
			// top edge stops at the 42 px floor, so 250 − 42 = 208.
			expect(windowEl.style.top).toBe("42px");
			expect(windowEl.style.height).toBe("208px");
			expect(windowEl.style.left).toBe("101px");
			expect(windowEl.style.width).toBe("199px");
			fireEvent.mouseUp(windowEl);
			expect(mockDispatch).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "ClassicyWindowResize",
					size: [199, 208],
				}),
			);
			// The release clamp reads the same floor: it leaves the resized
			// window where the gesture put it ...
			expect(clampWindowPositionToViewport([101, 42], [199, 208])).toEqual([
				101, 42,
			]);
			// ... where a fixed 30 px floor would have let the top edge reach 30
			// and the clamp then pushed the window down 12 px, off its anchor.
			expect(clampWindowPositionToViewport([101, 30], [199, 220])).toEqual([
				101, 42,
			]);
		} finally {
			desktop.remove();
		}
	});

	// F 4.1 review minor: only a press in this mount resizes; a persisted
	// `resizing: true` left over from a reload must not.
	it("ignores a stale resizing flag with no press", () => {
		mockWindow.resizing = true;
		const { windowEl } = renderMirrored([0, 0]);
		const { left, width } = windowEl.style;
		fireEvent.mouseMove(windowEl, { clientX: 110, clientY: 260 });
		expect(windowEl.style.left).toBe(left);
		expect(windowEl.style.width).toBe(width);
	});
});
