import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());

// A window whose store state is `closed: true` — i.e. dismissed via
// ClassicyWindowClose but kept mounted (the error-dialog pattern). The modal
// scrim must NOT render for it, or the input-blocking backdrop outlives the
// window and locks the page.
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
										id: "ClosedModal",
										appId: "TestApp",
										collapsed: false,
										focused: false,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: false,
										closed: true,
										size: [320, 160] as [number, number],
										position: [100, 100] as [number, number],
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
	() => ({ useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }) }),
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

describe("ClassicyWindow — modal scrim lifecycle", () => {
	it("renders no scrim (and no window) once a modal is closed", () => {
		render(
			<ClassicyWindow
				id="ClosedModal"
				appId="TestApp"
				title="Closed"
				modal={true}
				type="error"
			>
				<p>content</p>
			</ClassicyWindow>,
		);
		// The input-blocking backdrop must be gone so the page is interactive again.
		expect(document.querySelector(".classicyWindowModalScrim")).toBeNull();
		// And the window content itself is not rendered.
		expect(document.querySelector(".classicyWindow")).toBeNull();
	});
});
