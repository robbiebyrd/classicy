import { StrictMode } from "react";
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

describe("ClassicyWindow modal lifecycle under StrictMode", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// StrictMode double-invokes effects on mount in dev: run -> phantom
	// cleanup -> run again, reusing the same component instance (refs
	// survive the phantom cycle). The modal cleanup effect destroys the
	// store record on that phantom teardown; if it doesn't also reset the
	// `windowRegistered` ref, the registration effect's re-run sees the ref
	// already `true` and never re-dispatches ClassicyWindowOpen, so the
	// destroyed record never comes back even though the window stays
	// mounted and visible. This asserts the ref reset keeps registration
	// symmetric with destruction: a ClassicyWindowOpen must follow the
	// phantom ClassicyWindowDestroy.
	it("re-registers after StrictMode's phantom teardown destroys the record", () => {
		render(
			<StrictMode>
				<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
					<p>body</p>
				</ClassicyWindow>
			</StrictMode>,
		);

		const lifecycleTypes = mockDispatch.mock.calls
			.map((c) => (c[0] as { type: string }).type)
			.filter(
				(type) =>
					type === "ClassicyWindowOpen" || type === "ClassicyWindowDestroy",
			);

		expect(lifecycleTypes).toEqual([
			"ClassicyWindowOpen",
			"ClassicyWindowDestroy",
			"ClassicyWindowOpen",
		]);
	});
});
