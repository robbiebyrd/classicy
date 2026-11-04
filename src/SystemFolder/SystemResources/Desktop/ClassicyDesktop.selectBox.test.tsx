import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// The desktop's selection rectangle follows the pointer from a press on the
// bare desktop. When the pointer stream is lost (the window blurs, a
// pointercancel, the page is hidden) it ends where it is: the rectangle goes
// away, and the icons it had selected stay selected.

// jsdom plays no audio, so the full desktop's sound manager would log a
// "Failed to load audio sprite" error for every Howl it builds.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

beforeEach(() => {
	localStorage.clear();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

const desktop = () => document.getElementById("classicyDesktop") as HTMLElement;
const selectBox = () => document.querySelector(".classicyDesktopSelect");

describe("ClassicyDesktop selection rectangle when the pointer stream is lost", () => {
	it.each(POINTER_STREAM_LOSSES)("ends on a %s", (loss) => {
		renderDesktop();
		fireEvent.mouseDown(desktop(), { button: 0, clientX: 10, clientY: 10 });
		expect(selectBox()).not.toBeNull();
		losePointerStream(loss);
		expect(selectBox()).toBeNull();
		// The pointer coming back does not draw it again.
		fireEvent.mouseMove(desktop(), { clientX: 200, clientY: 200 });
		expect(selectBox()).toBeNull();
	});

	it("watches the pointer stream only while the rectangle is drawn", () => {
		const live = trackPointerStreamListeners();
		const { unmount } = renderDesktop();
		const before = live.size;
		fireEvent.mouseDown(desktop(), { button: 0, clientX: 10, clientY: 10 });
		expect(live.size).toBe(before + 3);
		fireEvent.mouseUp(desktop());
		expect(live.size).toBe(before);
		fireEvent.mouseDown(desktop(), { button: 0, clientX: 10, clientY: 10 });
		expect(live.size).toBe(before + 3);
		unmount();
		expect(live.size).toBe(0);
	});
});
