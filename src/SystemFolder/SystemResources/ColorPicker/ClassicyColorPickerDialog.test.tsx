import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyColorPickerDialog } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow is used; only its external hooks are mocked so the
// modal renders (and portals to document.body) without a provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Applications: { apps: {} } },
				},
			}),
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

describe("ClassicyColorPickerDialog modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// ClassicyColorPickerDialog is always modal={true} — ClassicyWindow's
	// cleanup effect must dispatch ClassicyWindowDestroy for it on unmount
	// (#222/#223). This asserts the dispatch itself, which is the component's
	// actual contract.
	//
	// NOTE: this test mocks useAppManager's `apps` selector to an empty
	// object, so the real classicyWindowEventHandler's `!apps[action.app.id]`
	// guard is irrelevant here — dispatch is asserted directly against the
	// mock, not against reducer-driven store state. ClassicyColorPickerDialog
	// resolves a real `appId` (an explicit prop, falling back to the
	// lexically enclosing ClassicyAppIdContext — see
	// ClassicyColorPickerDialog.appId.test.tsx), so when a caller supplies an
	// `appId` naming a registered app, ClassicyWindowOpen and
	// ClassicyWindowDestroy are no longer no-ops and the window record is
	// genuinely written to and removed from the store.
	it("dispatches ClassicyWindowDestroy for the dialog window on unmount", () => {
		const { unmount } = render(
			<ClassicyColorPickerDialog id="theme-accent-dialog" open={true} />,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "theme-accent-dialog" },
			window: { id: "theme-accent-dialog" },
		});
	});
});
