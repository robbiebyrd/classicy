import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

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
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("dispatches ClassicyWindowDestroy when a modal window unmounts", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
				<p>body</p>
			</ClassicyWindow>,
		);
		expect(destroyCalls()).toHaveLength(0);
		unmount();
		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "TestWindow" },
		});
	});

	it("dispatches nothing on unmount for a non-modal window", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Doc">
				<p>body</p>
			</ClassicyWindow>,
		);
		unmount();
		expect(destroyCalls()).toHaveLength(0);
	});
});
