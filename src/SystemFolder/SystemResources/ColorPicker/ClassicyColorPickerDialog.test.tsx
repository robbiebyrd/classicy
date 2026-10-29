import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/__tests__/test-utils";
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

describe("ClassicyColorPickerDialog mode list", () => {
	it("is a listbox whose selection the arrow keys, Home and End move", () => {
		render(<ClassicyColorPickerDialog id="mode-list-dialog" open={true} />);
		const list = screen.getByRole("listbox", { name: "Color picker mode" });
		// Query the mode list, not the document: the Crayons panel holds dozens
		// more options, and every role query recomputes jsdom styles for each
		// candidate after a DOM change (hundreds of ms per call over the dialog).
		const selected = () =>
			within(list)
				.getAllByRole("option", { selected: true })
				.map((o) => o.textContent);
		expect(selected()).toEqual(["Crayons"]);
		fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(selected()).toEqual(["RGB"]);
		expect(list.getAttribute("aria-activedescendant")).toBe(
			within(list).getByRole("option", { name: "RGB" }).id,
		);
		fireEvent.keyDown(list, { key: "End" });
		expect(selected()).toEqual(["CMYK"]);
		fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(selected()).toEqual(["CMYK"]); // stays on the last mode
		fireEvent.keyDown(list, { key: "Home" });
		expect(selected()).toEqual(["Crayons"]);
		fireEvent.click(within(list).getByRole("option", { name: "HSV" }));
		expect(selected()).toEqual(["HSV"]);
	});
});
