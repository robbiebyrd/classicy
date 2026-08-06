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
	// NOTE: ClassicyColorPickerDialog is passed `appId={id}`, and its only
	// caller (ClassicyColorPicker) supplies `id={`${id}-dialog`}` with no
	// separate app registered under that id. Because no app with that id ever
	// exists in the store, the real classicyWindowEventHandler's
	// `!apps[action.app.id]` guard makes both ClassicyWindowOpen and
	// ClassicyWindowDestroy no-ops for this dialog — the window record is
	// never actually written or removed from the store. That is out of scope
	// here (fixing the appId would change real behavior); this test only pins
	// that the dispatch is emitted, which is what ClassicyWindow guarantees
	// regardless of what the reducer does with it.
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
