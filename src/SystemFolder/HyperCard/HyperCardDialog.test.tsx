import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
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
