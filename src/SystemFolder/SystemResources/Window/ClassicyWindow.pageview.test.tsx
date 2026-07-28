import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockPage = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());
const windowState = vi.hoisted(() => ({ closed: false, focused: true }));

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
									name: "Test App",
									focused: windowState.focused,
									windows: [
										{
											id: "TestApp_1",
											appId: "TestApp",
											collapsed: false,
											focused: windowState.focused,
											dragging: false,
											moving: false,
											resizing: false,
											zoomed: false,
											closed: windowState.closed,
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
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: mockTrack, page: mockPage }),
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

import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const renderWindow = (props: Record<string, unknown> = {}) =>
	render(
		<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);

describe("ClassicyWindow pageview", () => {
	beforeEach(() => {
		mockPage.mockClear();
		mockTrack.mockClear();
		mockDispatch.mockClear();
		windowState.closed = false;
		windowState.focused = true;
	});

	it("emits once for a window that mounts open and focused", () => {
		renderWindow();
		expect(mockPage).toHaveBeenCalledTimes(1);
		expect(mockPage).toHaveBeenCalledWith(
			"/testapp/window-1",
			"Test App — Untitled",
		);
	});

	it("emits nothing for a window that mounts closed", () => {
		windowState.closed = true;
		renderWindow();
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits when a closed window opens", () => {
		windowState.closed = true;
		const { rerender } = renderWindow();
		expect(mockPage).not.toHaveBeenCalled();

		windowState.closed = false;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).toHaveBeenCalledTimes(1);
	});

	it("emits nothing when an open window closes", () => {
		const { rerender } = renderWindow();
		mockPage.mockClear();

		windowState.closed = true;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits nothing when an open window merely loses focus", () => {
		const { rerender } = renderWindow();
		mockPage.mockClear();

		windowState.focused = false;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits again when the window is re-focused after a blur", () => {
		const { rerender } = renderWindow();
		const again = () =>
			rerender(
				<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
					<p>content</p>
				</ClassicyWindow>,
			);

		windowState.focused = false;
		again();
		mockPage.mockClear();

		windowState.focused = true;
		again();
		expect(mockPage).toHaveBeenCalledTimes(1);
	});

	it("uses analyticsPath instead of the derived path", () => {
		renderWindow({ analyticsPath: "/editor/compose" });
		expect(mockPage).toHaveBeenCalledWith(
			"/editor/compose",
			"Test App — Untitled",
		);
	});

	it("emits nothing when analyticsExclude is set", () => {
		renderWindow({ analyticsExclude: true });
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("lets analyticsExclude win over analyticsPath", () => {
		renderWindow({ analyticsExclude: true, analyticsPath: "/editor/compose" });
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("falls back to the path as the title when the window has no title", () => {
		renderWindow({ title: undefined });
		expect(mockPage).toHaveBeenCalledWith("/testapp/window-1", "Test App");
	});

	it("still dispatches ClassicyWindowOpen as before", () => {
		renderWindow();
		const types = mockDispatch.mock.calls.map(
			(call) => (call[0] as { type: string }).type,
		);
		expect(types).toContain("ClassicyWindowOpen");
	});
});
