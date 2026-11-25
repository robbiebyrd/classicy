// The window geometry reads the menu-bar height, zoom margin and resize inset
// from the theme variables on #classicyDesktop (readClassicyThemeVar).
// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so these tests set the variables on a real
// #classicyDesktop element; no getComputedStyle stub is needed.
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	ClassicyWindow,
	clampWindowPositionToViewport,
	resolvePosition,
	resolveSize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
// The mocked store record's geometry, so a test can place it low on the
// screen (the taskbar band tests); every other test keeps [110, 110].
const mockRecord = vi.hoisted(() => ({
	position: [110, 110] as [number, number],
	size: [350, 200] as [number, number],
}));

// Pass-through spy, so the resize test can count reads of the inset.
vi.mock(
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader")
			>();
		return {
			...actual,
			readClassicyThemeVar: vi.fn(actual.readClassicyThemeVar),
		};
	},
);

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
										size: mockRecord.size,
										position: mockRecord.position,
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

const mountDesktop = (
	vars: Record<string, string>,
	size?: [number, number],
): HTMLElement => {
	const desktop = document.createElement("div");
	desktop.id = "classicyDesktop";
	for (const [name, value] of Object.entries(vars)) {
		desktop.style.setProperty(name, value);
	}
	if (size) {
		Object.defineProperty(desktop, "clientWidth", { value: size[0] });
		Object.defineProperty(desktop, "clientHeight", { value: size[1] });
	}
	document.body.append(desktop);
	return desktop;
};

const dispatched = () =>
	mockDispatch.mock.calls.map(
		(call) =>
			call[0] as {
				type: string;
				position?: [number, number];
				resizing?: boolean;
				size?: [number, number];
			},
	);

const renderWindow = (
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) =>
	render(
		createElement(
			ClassicyWindow,
			{ id: "TestWindow", appId: "TestApp", title: "Test", ...props },
			createElement("p", null, "content"),
		),
		// Inside the desktop when one is mounted: the window reads theme
		// variables from its own element, which inherits them.
		{ container: document.getElementById("classicyDesktop") ?? undefined },
	);

beforeEach(() => {
	mockDispatch.mockClear();
	vi.mocked(readClassicyThemeVar).mockClear();
	mockRecord.position = [110, 110];
	mockRecord.size = [350, 200];
});

afterEach(() => {
	document.getElementById("classicyDesktop")?.remove();
});

describe("ClassicyWindow geometry from theme variables", () => {
	it("resolveSize subtracts the menu-bar height read from CSS", () => {
		mountDesktop({ "--menu-bar-height": "40px" }, [800, 600]);
		expect(resolveSize(["100%", "100%"])).toEqual([800, 560]);
	});

	it("resolvePosition clamps y to the CSS menu-bar height", () => {
		mountDesktop({ "--menu-bar-height": "25px" });
		expect(resolvePosition(["left", "top"], [100, 100])[1]).toBe(25);
	});

	it("without a desktop the constants equal today's values", () => {
		// jsdom's viewport is 1024×768; pin it to the 800×600 the plan's
		// numbers assume, so 570 = 600 − the default 30 px menu bar.
		const width = Object.getOwnPropertyDescriptor(window, "innerWidth");
		const height = Object.getOwnPropertyDescriptor(window, "innerHeight");
		Object.defineProperty(window, "innerWidth", {
			configurable: true,
			value: 800,
		});
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 600,
		});
		try {
			expect(resolveSize(["100%", "100%"])).toEqual([800, 570]);
			expect(resolvePosition(["left", "top"], [100, 100])).toEqual([0, 30]);
		} finally {
			if (width) Object.defineProperty(window, "innerWidth", width);
			if (height) Object.defineProperty(window, "innerHeight", height);
		}
	});

	it("zoom standard rect uses --window-zoom-margin", () => {
		mountDesktop({ "--window-zoom-margin": "10px" });
		const { container } = renderWindow({ zoomable: true });
		const zoomBox = container.querySelector(
			".classicyWindowZoomBox",
		) as HTMLElement;
		fireEvent.click(zoomBox);
		expect(dispatched()).toContainEqual(
			expect.objectContaining({
				type: "ClassicyWindowMove",
				position: [10, 40],
			}),
		);
	});

	describe("resize inset", () => {
		let rectSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			rectSpy = vi
				.spyOn(Element.prototype, "getBoundingClientRect")
				.mockReturnValue({
					width: 350,
					height: 200,
					top: 110,
					left: 110,
					right: 460,
					bottom: 310,
					x: 110,
					y: 110,
					toJSON: () => {},
				} as DOMRect);
		});

		afterEach(() => {
			rectSpy.mockRestore();
		});

		const insetReads = () =>
			vi
				.mocked(readClassicyThemeVar)
				.mock.calls.filter(([name]) => name === "--window-resize-inset").length;

		it("a resize gesture reads --window-resize-inset once", () => {
			mountDesktop({ "--window-resize-inset": "7px" });
			const { container, unmount } = renderWindow({ resizable: true });
			const resizer = container.querySelector(
				".classicyWindowResizer",
			) as HTMLElement;

			fireEvent.mouseDown(resizer, { clientX: 460, clientY: 310 });
			fireEvent.mouseMove(document.body, { clientX: 480, clientY: 330 });
			fireEvent.mouseMove(document.body, { clientX: 495, clientY: 350 });
			fireEvent.mouseMove(document.body, { clientX: 505, clientY: 365 });
			fireEvent.mouseUp(document.body, { clientX: 505, clientY: 365 });

			expect(insetReads()).toBe(1);
			// |110 − 505| + 7 and |110 − 365| + 7: the inset comes from CSS.
			const last = dispatched()
				.filter((a) => a.type === "ClassicyWindowResize")
				.at(-1);
			expect(last?.size).toEqual([402, 262]);
			unmount();
		});
	});
});

// Plan 0020-w98 §2 "The band": a mounted taskbar's band along the desktop's
// bottom comes out of the room every geometry function gives a window, as
// Windows keeps windows to the work area (WIG Ch.6, p.84). Each function
// defaults the band to 0, and the window reads 0 while no taskbar is
// mounted, so every other desktop computes today's numbers.
describe("ClassicyWindow geometry above the taskbar's band", () => {
	// jsdom's viewport, which these numbers assume.
	beforeEach(() =>
		expect([window.innerWidth, window.innerHeight]).toEqual([1024, 768]),
	);

	describe("resolveSize", () => {
		it("a band of 0 is today's size", () => {
			mountDesktop({}, [800, 600]);
			for (const size of [
				["100%", "100%"],
				["50%", "25%"],
				[320, 240],
			] as Parameters<typeof resolveSize>[0][]) {
				expect(resolveSize(size, 40, 0)).toEqual(resolveSize(size, 40));
			}
		});

		it("takes the band off a percentage height", () => {
			mountDesktop({}, [800, 600]);
			expect(resolveSize(["100%", "100%"], 0, 28)).toEqual([800, 572]);
			expect(resolveSize(["50%", "50%"], 0, 28)).toEqual([400, 286]);
			// Below a menu bar too: the room is what is left between the two.
			expect(resolveSize(["100%", "100%"], 30, 28)).toEqual([800, 542]);
			// A number is a number.
			expect(resolveSize([320, 240], 0, 28)).toEqual([320, 240]);
		});
	});

	describe("resolvePosition", () => {
		const ys = ["top", "center", "bottom", 200] as const;

		it("a band of 0 is today's position", () => {
			for (const y of ys) {
				for (const centering of ["exact", "wholePixel"] as const) {
					expect(
						resolvePosition(["center", y], [300, 101], 30, centering, 0),
					).toEqual(resolvePosition(["center", y], [300, 101], 30, centering));
				}
			}
		});

		it("centers within the height above the band", () => {
			// (768 − 28 − 101) / 2, on the half pixel or rounded.
			expect(
				resolvePosition(["center", "center"], [300, 101], 0, "exact", 28),
			).toEqual([362, 319.5]);
			expect(
				resolvePosition(["center", "center"], [300, 101], 0, "wholePixel", 28),
			).toEqual([362, 320]);
		});

		it("puts a bottom window on the band, and leaves top and numbers alone", () => {
			expect(
				resolvePosition(["left", "bottom"], [300, 100], 0, "exact", 28),
			).toEqual([0, 640]);
			expect(
				resolvePosition(["left", "top"], [300, 100], 0, "exact", 28),
			).toEqual([0, 0]);
			expect(resolvePosition([40, 700], [300, 100], 0, "exact", 28)).toEqual([
				40, 700,
			]);
		});

		it("never goes above the menu bar for a window taller than the room", () =>
			expect(
				resolvePosition(["left", "bottom"], [300, 900], 30, "exact", 28),
			).toEqual([0, 30]));
	});

	describe("clampWindowPositionToViewport", () => {
		it("a band of 0 is today's clamp", () => {
			for (const position of [
				[110, 110],
				[-20, 900],
				[2000, 5],
			] as [number, number][]) {
				expect(
					clampWindowPositionToViewport(position, [350, 200], 30, 0),
				).toEqual(clampWindowPositionToViewport(position, [350, 200], 30));
			}
		});

		it("caps y at the band's top less the window's height", () => {
			expect(
				clampWindowPositionToViewport([110, 700], [350, 200], 0, 28),
			).toEqual([110, 540]);
			// Above that the window stays where it is.
			expect(
				clampWindowPositionToViewport([110, 500], [350, 200], 0, 28),
			).toEqual([110, 500]);
			// Across, nothing changes.
			expect(
				clampWindowPositionToViewport([900, 700], [350, 200], 0, 28),
			).toEqual([674, 540]);
		});

		it("keeps a window taller than the room on the menu bar's floor", () =>
			expect(
				clampWindowPositionToViewport([110, 400], [350, 900], 30, 28),
			).toEqual([110, 30]));
	});

	describe("a mounted window", () => {
		const opened = () =>
			dispatched().find((action) => action.type === "ClassicyWindowOpen") as
				| { window: { position: [number, number] } }
				| undefined;

		it("registers a new centered window within the room above the band", () => {
			mountDesktop({ "--menu-bar-height": "0px" });
			setClassicyTaskbarBand(28);
			renderWindow({
				id: "NewWindow",
				initialSize: [300, 200],
				initialPosition: ["center", "center"],
			});
			// (1024 − 300) / 2 and (768 − 28 − 200) / 2.
			expect(opened()?.window.position).toEqual([362, 270]);
		});

		it("registers the same window at today's place with no band", () => {
			mountDesktop({ "--menu-bar-height": "0px" });
			renderWindow({
				id: "NewWindow",
				initialSize: [300, 200],
				initialPosition: ["center", "center"],
			});
			expect(opened()?.window.position).toEqual([362, 284]);
		});

		it("draws a stored window above the band as soon as it is published", () => {
			mockRecord.position = [110, 560];
			const { container } = renderWindow();
			const root = container.querySelector(".classicyWindow") as HTMLElement;
			// 768 − 200 leaves room for 560 with no taskbar.
			expect(root.style.top).toBe("560px");
			act(() => setClassicyTaskbarBand(28));
			expect(root.style.top).toBe("540px");
			// The taskbar going gives the room back.
			act(() => setClassicyTaskbarBand(0));
			expect(root.style.top).toBe("560px");
		});
	});
});
