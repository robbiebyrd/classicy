import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * Stacking belongs to the window states (ClassicyWindow.scss: active 300,
 * ActiveApp 150, Floating 350, Backgrounded 20, ModalFront 370, Red 99999).
 * Those rules win by the cascade alone, so an inline z-index would pin a
 * window's stacking in every state; the component drops a consumer's.
 */

const APP = "Stacking.app";

const app: ClassicyStoreSystemApp = {
	id: APP,
	name: "Stacking",
	icon: "",
	open: true,
	focused: true,
	windows: {},
};

// The real store drives focus; sound and analytics are stubbed.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => () => {} }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

beforeEach(() => {
	// jsdom implements neither; stub them so the output stays free of its
	// "Not implemented" notices.
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) => ({
			...state,
			System: {
				...state.System,
				Manager: {
					...state.System.Manager,
					Applications: {
						...state.System.Manager.Applications,
						apps: { ...state.System.Manager.Applications.apps, [APP]: app },
					},
				},
			},
		}));
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ClassicyWindow consumer style and stacking", () => {
	it("never puts a consumer zIndex on the window root, active or inactive", () => {
		render(
			<>
				<ClassicyWindow
					id="back"
					appId={APP}
					title="Back"
					style={{ zIndex: 5, marginTop: 7 }}
				>
					<p>back</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="front"
					appId={APP}
					title="Front"
					style={{ zIndex: 5, marginTop: 7 }}
				>
					<p>front</p>
				</ClassicyWindow>
			</>,
		);
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: APP },
				window: { id: "front" },
			});
		});

		const back = document.getElementById(`${APP}_back`) as HTMLElement;
		const front = document.getElementById(`${APP}_front`) as HTMLElement;
		expect(back.classList.contains("inactive")).toBe(true);
		expect(front.classList.contains("active")).toBe(true);
		for (const root of [back, front]) {
			expect(root.style.zIndex).toBe("");
			// The rest of the consumer style still lands.
			expect(root.style.marginTop).toBe("7px");
		}
	});

	it("keeps an alert in its alert band when given a zIndex", () => {
		render(<ClassicyAlert appId={APP} label="Alert" style={{ zIndex: 1 }} />);

		const root = document.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowRed")).toBe(true);
		expect(root.style.zIndex).toBe("");
	});
});
