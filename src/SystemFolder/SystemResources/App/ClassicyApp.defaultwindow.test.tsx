import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockAppState = vi.hoisted(() => ({
	defaultWindowClosed: true,
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									name: "Test",
									icon: "",
									open: true,
									focused: true,
									windows: [
										{
											id: "main",
											closed: mockAppState.defaultWindowClosed,
											focused: false,
											size: [350, 200] as [number, number],
											position: [110, 110] as [number, number],
											minimumSize: [0, 0] as [number, number],
										},
									],
									data: {},
								},
							},
						},
						Appearance: {
							activeTheme: {
								color: {
									white: 0xffffff,
									black: 0x000000,
									error: 0xff0000,
									system: [0, 0, 0, 0, 0, 0, 0, 0],
									theme: [0, 0, 0, 0, 0, 0, 0, 0],
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

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: () => null,
}));

function renderApp() {
	return render(
		<ClassicyApp id="TestApp" name="Test" icon="" defaultWindow="main" />,
	);
}

const focusDispatches = () =>
	mockDispatch.mock.calls
		.map((call) => call[0] as { type: string })
		.filter((e) => e.type === "ClassicyWindowFocus");

describe("ClassicyApp default-window focus effect", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("does NOT focus the default window when it is closed", () => {
		mockAppState.defaultWindowClosed = true;
		renderApp();
		expect(focusDispatches()).toHaveLength(0);
	});

	it("focuses the default window when it is open and nothing else is focused", () => {
		mockAppState.defaultWindowClosed = false;
		renderApp();
		expect(focusDispatches().length).toBeGreaterThan(0);
	});
});
