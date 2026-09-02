// #248 (Sourcery follow-up): the initial-paint clamp in ClassicyWindow only
// covers the fresh-window branch of the `ws` useMemo (no store entry yet).
// When a window already has a persisted `currentWindow` in the store, the
// early `if (currentWindow) return currentWindow;` handed back its raw,
// unclamped position/size untouched — a window restored with an off-screen
// position stayed off-screen, and the clamp bound itself was computed from
// `resolvedSize` (derived from the `initialSize` prop) rather than the
// window's actual current size, which can differ once a window has been
// user-resized and persisted.
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

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
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											closed: false,
											// The window's real, current size — larger than
											// initialSize below, as it would be after a user
											// resize was persisted to the store.
											size: [500, 500],
											// Off-screen for an 800x600 viewport regardless of
											// which size is used to compute the clamp bound.
											position: [700, 700],
											minimumSize: [0, 0],
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

describe("ClassicyWindow persisted-position clamp (#248 follow-up)", () => {
	it("clamps a restored window's off-screen position using its actual (persisted) size, not initialSize", () => {
		setViewport(800, 600);
		try {
			const { container } = render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Test"
					// Deliberately small/different from the persisted size above —
					// a clamp that (wrongly) bounds itself against resolvedSize
					// (100x100) would compute maxX/maxY of 700/500 and leave the
					// position at [700, 700] untouched (still off-screen for a
					// window whose real box is 500x500). The correct bound, using
					// the persisted 500x500 size, is maxX=300/maxY=100.
					initialSize={[100, 100]}
					initialPosition={[50, 60]}
				>
					<p>content</p>
				</ClassicyWindow>,
			);

			const el = container.querySelector("#TestApp_TestWindow") as HTMLElement;
			expect(el).toBeTruthy();
			expect(el.style.left).toBe("300px");
			expect(el.style.top).toBe("100px");
		} finally {
			setViewport(ORIGINAL_WIDTH, ORIGINAL_HEIGHT);
		}
	});
});
