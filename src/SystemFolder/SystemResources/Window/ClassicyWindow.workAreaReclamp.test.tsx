// The shell addendum's B14 (audit 10.24; WIG Ch.10 "Plug and Play
// Support", p.213): under a layout with a taskbar, a desktop resize moves
// every open, unmaximized window back into the work area, writing
// `ClassicyWindowMove` only for a window the clamp moves. Absent a taskbar
// (Platinum, System 7) nothing is written, as before.
import "@classicy/appearance-platinum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
// The one window's stored rect.
const mockWindow = vi.hoisted(() => ({
	position: [300, 100] as [number, number],
	size: [400, 300] as [number, number],
	zoomed: false,
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({
			System: {
				Manager: {
					Desktop: { doubleClickTitleToCollapse: true },
					Applications: {
						apps: {
							TestApp: {
								id: "TestApp",
								name: "Test App",
								windows: windowsRecord({
									id: "TestWindow",
									appId: "TestApp",
									closed: false,
									collapsed: false,
									zoomed: mockWindow.zoomed,
									size: mockWindow.size,
									position: mockWindow.position,
									minimumSize: [0, 0],
								}),
							},
						},
					},
				},
			},
		});
		return {
			useAppManager: Object.assign(
				(selector: (s: unknown) => unknown) => selector(state()),
				{ getState: state },
			),
			useAppManagerDispatch: () => mockDispatch,
		};
	},
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});

const ORIGINAL_WIDTH = window.innerWidth;
const ORIGINAL_HEIGHT = window.innerHeight;
const setViewport = (width: number, height: number) => {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		value: width,
	});
	Object.defineProperty(window, "innerHeight", {
		configurable: true,
		value: height,
	});
};

const moves = () =>
	mockDispatch.mock.calls
		.map((c) => c[0] as { type: string; position?: [number, number] })
		.filter((a) => a.type === "ClassicyWindowMove");

const renderWindow = () =>
	render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test">
			<p>content</p>
		</ClassicyWindow>,
	);

describe("ClassicyWindow re-clamping on a desktop resize (B14)", () => {
	beforeEach(() => {
		setViewport(800, 600);
		mockDispatch.mockClear();
		mockWindow.position = [300, 100];
		mockWindow.size = [400, 300];
		mockWindow.zoomed = false;
	});

	afterEach(() => {
		setViewport(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		vi.unstubAllGlobals();
		document.getElementById("classicyDesktop")?.remove();
	});

	describe("under a layout with a taskbar", () => {
		beforeEach(() => {
			registerTestTaskbarPackage();
			activePackage.id = TEST_TASKBAR_PACKAGE_ID;
		});

		it("moves a window the shrunk desktop leaves partly outside back into the work area", () => {
			renderWindow();
			mockDispatch.mockClear();
			setViewport(500, 400);
			act(() => {
				window.dispatchEvent(new Event("resize"));
			});
			expect(moves().map((a) => a.position)).toEqual([[100, 100]]);
		});

		it("writes nothing for a window the clamp does not move", () => {
			mockWindow.position = [50, 60];
			renderWindow();
			mockDispatch.mockClear();
			setViewport(500, 400);
			act(() => {
				window.dispatchEvent(new Event("resize"));
			});
			expect(moves()).toEqual([]);
		});

		it("watches the desktop with a ResizeObserver when there is one", () => {
			const callbacks: (() => void)[] = [];
			const observed: Element[] = [];
			class FakeResizeObserver {
				constructor(callback: () => void) {
					callbacks.push(callback);
				}
				observe(el: Element) {
					observed.push(el);
				}
				disconnect() {}
				unobserve() {}
			}
			vi.stubGlobal("ResizeObserver", FakeResizeObserver);
			const desktop = document.createElement("div");
			desktop.id = "classicyDesktop";
			document.body.appendChild(desktop);
			renderWindow();
			expect(observed).toContain(desktop);
			mockDispatch.mockClear();
			setViewport(500, 400);
			act(() => {
				for (const callback of callbacks) callback();
			});
			expect(moves().map((a) => a.position)).toEqual([[100, 100]]);
		});
	});

	it("writes nothing on a resize under Platinum's layout, as before", () => {
		renderWindow();
		mockDispatch.mockClear();
		setViewport(500, 400);
		act(() => {
			window.dispatchEvent(new Event("resize"));
		});
		expect(moves()).toEqual([]);
	});
});
