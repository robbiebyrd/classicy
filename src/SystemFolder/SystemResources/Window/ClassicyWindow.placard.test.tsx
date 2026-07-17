import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Mutable so individual tests can flip the persisted window's collapsed state.
const windowState = vi.hoisted(() => ({ collapsed: false }));

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

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
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											collapsed: windowState.collapsed,
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
										},
									],
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
		useClassicyAnalytics: () => ({ track: vi.fn() }),
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

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
}

describe("ClassicyWindow placard (#196)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		windowState.collapsed = false;
	});

	// #196: the placard node mounts in the bottom-left status region.
	it("renders the placard when provided", () => {
		const { container } = renderWindow({
			placard: <span data-testid="placard-content">100%</span>,
		});
		const bar = container.querySelector(".classicyWindowPlacardBar");
		expect(bar).not.toBeNull();
		expect(bar?.querySelector("[data-testid='placard-content']")).not.toBeNull();
	});

	// Backward compatible: no placard prop means no placard region.
	it("omits the placard region when no placard is given", () => {
		const { container } = renderWindow();
		expect(container.querySelector(".classicyWindowPlacardBar")).toBeNull();
	});

	// #196: the placard is hidden while the window is collapsed.
	it("omits the placard when the window is collapsed", () => {
		windowState.collapsed = true;
		const { container } = renderWindow({
			placard: <span data-testid="placard-content">100%</span>,
		});
		expect(container.querySelector(".classicyWindowPlacardBar")).toBeNull();
	});
});
