// The window geometry reads the menu-bar height, zoom margin and resize inset
// from the theme variables on #classicyDesktop (readClassicyThemeVar).
// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so these tests set the variables on a real
// #classicyDesktop element; no getComputedStyle stub is needed.
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	ClassicyWindow,
	resolvePosition,
	resolveSize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());

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
