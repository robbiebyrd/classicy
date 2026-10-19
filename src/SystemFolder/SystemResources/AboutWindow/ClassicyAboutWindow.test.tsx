import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";

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

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyAboutWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// ClassicyAboutWindow is always modal={true} — ClassicyWindow's cleanup
	// effect must dispatch ClassicyWindowDestroy for it on unmount (#222/#223),
	// so reopening About from the Apple menu takes focus rather than silently
	// reusing a stale store record.
	it("dispatches ClassicyWindowDestroy for the about window on unmount", () => {
		const { unmount } = render(
			<ClassicyAboutWindow
				appId="Finder.app"
				appName="Finder"
				appIcon="finder.png"
				hideFunc={() => {}}
			/>,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "Finder.app" },
			window: { id: "Finder.app_about" },
		});
	});
});

// HIGOS8 Ch.3 (p.23/p.57): the About box's OK is the default button and a key
// dismisses the box (Return via the default; Escape as the sole acknowledgement).
describe("ClassicyAboutWindow default button + keyboard dismissal", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	const renderAbout = (hideFunc: () => void) =>
		render(
			<ClassicyAboutWindow
				appId="Finder.app"
				appName="Finder"
				appIcon="finder.png"
				hideFunc={hideFunc}
			/>,
		);

	it("marks OK as the default button", () => {
		const { getByRole } = renderAbout(() => {});
		expect(getByRole("button", { name: "OK" })).toHaveClass(
			"classicyButtonDefault",
		);
	});

	it("dismisses on Escape (routed through the OK button)", () => {
		const { getByRole } = renderAbout(() => {});
		const ok = getByRole("button", { name: "OK" }) as HTMLButtonElement;
		const clickSpy = vi.spyOn(ok, "click");
		fireEvent.keyDown(ok, { key: "Escape" });
		expect(clickSpy).toHaveBeenCalled();
	});
});
