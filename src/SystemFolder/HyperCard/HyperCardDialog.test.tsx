import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_DIALOG_CAPTION_LAYOUT,
	TEST_DIALOG_CAPTION_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import { HyperCardAppInfo } from "@/SystemFolder/HyperCard/HyperCardUtils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow + inner controls are used; only their external hooks are
// mocked so the modal renders (and portals to document.body) without a
// provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					// The Desktop slice: the caption buttons' tooltips (a titled
					// dialog layout's) read balloon help's toggle from it.
					Manager: { Desktop: {}, Applications: { apps: {} } },
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

describe("HyperCardDialog modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// HyperCardDialog is always modal={true} — ClassicyWindow's cleanup effect
	// must dispatch ClassicyWindowDestroy for it on unmount (#222/#223), so a
	// dismissed dialog reopening (e.g. a second `ask`) takes focus rather than
	// silently reusing a stale store record.
	it("dispatches ClassicyWindowDestroy for the dialog window on unmount", () => {
		const { unmount } = render(
			<HyperCardDialog
				dialog={{ kind: "answer", message: "Hello", token: "t1" }}
				stackId="demo"
			/>,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: HyperCardAppInfo.id },
			window: { id: "hypercard_dialog" },
		});
	});
});

// Plan 0020-w98 §6: under a layout whose `dialog.caption` is `"titled"`
// (Windows 98) the dialog's caption has a Close box: an ask's Cancel, an
// answer's Cancel button, else its only button, and unavailable with
// neither (Yes/No), as Windows' message box maps its Close. Under every
// other layout it has none.
describe("HyperCardDialog's caption Close box", () => {
	const closeBox = () =>
		document.querySelector<HTMLElement>(
			".classicyWindow > .classicyWindowTitleBar .classicyWindowCloseBox",
		);
	const responses = () =>
		mockDispatch.mock.calls
			.map((c) => c[0] as { type: string; result?: string })
			.filter((a) => a.type === "ClassicyAppHyperCardDialogResponse")
			.map((a) => a.result);

	beforeEach(() => {
		mockDispatch.mockClear();
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_DIALOG_CAPTION_PACKAGE_ID);
	});

	it("is not drawn under a layout without titled captions", () => {
		render(
			<HyperCardDialog
				dialog={{ kind: "answer", message: "Hello", token: "t1" }}
				stackId="demo"
			/>,
		);
		expect(closeBox()).toBeNull();
	});

	describe('under dialog.caption: "titled"', () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_DIALOG_CAPTION_LAYOUT,
				TEST_DIALOG_CAPTION_PACKAGE_ID,
			);
		});

		it("answers an ask with Cancel's empty answer", () => {
			render(
				<HyperCardDialog
					dialog={{ kind: "ask", message: "Name?", token: "t1" }}
					stackId="demo"
				/>,
			);
			fireEvent.click(closeBox() as HTMLElement);
			expect(responses()).toEqual([""]);
		});

		it("answers with the Cancel button, else the only button", () => {
			const { unmount } = render(
				<HyperCardDialog
					dialog={{
						kind: "answer",
						message: "Save?",
						buttons: ["Save", "Cancel"],
						token: "t1",
					}}
					stackId="demo"
				/>,
			);
			fireEvent.click(closeBox() as HTMLElement);
			unmount();
			render(
				<HyperCardDialog
					dialog={{ kind: "answer", message: "Hello", token: "t2" }}
					stackId="demo"
				/>,
			);
			fireEvent.click(closeBox() as HTMLElement);
			expect(responses()).toEqual(["Cancel", "OK"]);
		});

		it("is unavailable on a Yes/No answer, and answers nothing", () => {
			render(
				<HyperCardDialog
					dialog={{
						kind: "answer",
						message: "Sure?",
						buttons: ["Yes", "No"],
						token: "t1",
					}}
					stackId="demo"
				/>,
			);
			expect(closeBox()).toHaveAttribute("aria-disabled", "true");
			fireEvent.click(closeBox() as HTMLElement);
			expect(responses()).toEqual([]);
		});
	});
});
