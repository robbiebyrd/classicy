// Same defect class as ClassicyWindow.analytics.test.tsx, on the other emitter
// of "focus"/"halt". Desktop icons bind onMouseDown/onMouseUp/onClick to the
// root div, and both tracking calls sat outside any gesture check:
//
//   - stopChangeIcon (onMouseUp) tracked "halt" on every release, so a plain
//     click on an icon counted as a completed drag.
//   - clickFocus (onClick) tracked "focus" on every click that wasn't the tail
//     of a drag, including clicks on an icon that was ALREADY selected.
//
// Because classicy_focus and classicy_halt aggregate windows and icons into one
// GA4 event name, leaving the icon unfixed would keep the metric polluted even
// after the window fix.
//
// "halt" gates on didDragRef, NOT the `dragging` state: setDragging(true) runs
// in startDrag on mousedown, so `dragging` is true for a plain click too.
// didDragRef is only set inside changeIcon, i.e. once the pointer actually
// moved while down -- the real "a drag happened" signal.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());
// Mutable so a test can render an icon that is ALREADY selected, the only
// state in which the clickFocus guard is observable.
const desktopState = vi.hoisted(() => ({ selectedIcons: [] as string[] }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: {
							selectedIcons: desktopState.selectedIcons,
							icons: [{ appId: "TestApp", location: [100, 200] }],
						},
						Applications: {
							apps: {
								"Finder.app": { windows: [] as unknown[] },
								TestApp: { open: false },
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
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: mockTrack, page: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
	() => ({}),
);

import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

const defaultProps = {
	appId: "TestApp",
	appName: "Test Application",
	icon: "/icons/test.png",
	kind: "app_shortcut",
};

const renderIcon = () => {
	const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
	return container.querySelector('[role="button"]') as HTMLElement;
};

const trackCalls = (name: string) =>
	mockTrack.mock.calls.filter((call) => call[0] === name);

describe("ClassicyDesktopIcon analytics fire only on the thing they name", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockTrack.mockClear();
		desktopState.selectedIcons = [];
	});

	describe('"halt" means a drag completed', () => {
		it("does NOT fire for a plain click with no pointer movement", () => {
			const icon = renderIcon();

			fireEvent.mouseDown(icon, { clientX: 100, clientY: 200 });
			fireEvent.mouseUp(icon, { clientX: 100, clientY: 200 });

			expect(trackCalls("halt")).toHaveLength(0);
		});

		it("fires exactly once when the icon was actually dragged", () => {
			const icon = renderIcon();

			fireEvent.mouseDown(icon, { clientX: 100, clientY: 200 });
			// changeIcon sets didDragRef only while `dragging` is true.
			fireEvent.mouseMove(icon, { clientX: 160, clientY: 260 });
			fireEvent.mouseUp(icon, { clientX: 160, clientY: 260 });

			expect(trackCalls("halt")).toHaveLength(1);
		});
	});

	describe('"focus" means the icon BECAME selected', () => {
		it("fires when clicking an icon that was not selected", () => {
			desktopState.selectedIcons = [];
			const icon = renderIcon();

			fireEvent.click(icon);

			expect(trackCalls("focus")).toHaveLength(1);
		});

		it("does NOT fire when clicking an icon that is already selected", () => {
			desktopState.selectedIcons = ["TestApp"];
			const icon = renderIcon();

			fireEvent.click(icon);

			expect(trackCalls("focus")).toHaveLength(0);
		});

		it("still dispatches the real selection action when unselected (tracking guard did not change behavior)", () => {
			desktopState.selectedIcons = [];
			const icon = renderIcon();

			fireEvent.click(icon);

			const focusDispatches = mockDispatch.mock.calls
				.map((call) => call[0] as { type: string })
				.filter((a) => a.type === "ClassicyDesktopIconFocus");
			expect(focusDispatches.length).toBeGreaterThan(0);
		});

		it("still dispatches the selection action even when already selected", () => {
			// Only the TRACKING is gated. The dispatch stays unconditional so
			// clicking a selected icon still collapses a multi-icon selection
			// down to just that icon.
			desktopState.selectedIcons = ["TestApp", "OtherApp"];
			const icon = renderIcon();

			fireEvent.click(icon);

			const focusDispatches = mockDispatch.mock.calls
				.map((call) => call[0] as { type: string })
				.filter((a) => a.type === "ClassicyDesktopIconFocus");
			expect(focusDispatches.length).toBeGreaterThan(0);
		});
	});
});
