// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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

// Hand-offs C2 and C3 (the remaining chapters' audit's 5.6, 5.7, 4.10, 5.11,
// A.7, 5.13, 1.18, 4.16, 5.16, 5.17, 5.18, B.2): the desktop's press rules
// (`classicyDesktopSelectPress`), its rectangle against the selection the
// press found (`classicyDesktopBoxSelection`), Escape's take-back
// (`input.escapeCancels`) and its keys (`classicyDesktopKeyCommand`), each
// by its Windows layout key; Platinum keeps today's rules.
describe("ClassicyDesktop's Windows selection rules (C2, C3)", () => {
	const WINDOWS_SELECTION = {
		mouse: "windows",
		contextMenu: { openOn: "release" },
		input: { escapeCancels: true },
		selection: {
			secondaryButton: "select",
			modifiers: "windows",
			keyboard: "windows",
			iconNavigation: "roving",
		},
	} as const;
	let restore: (() => void) | null = null;
	// Three app icons in a row, 40 px square, 100 px apart; the Trash out of
	// the way.
	const ICONS: Record<string, [number, number]> = {
		"A.app": [100, 100],
		"B.app": [200, 100],
		"C.app": [300, 100],
	};
	const seedIcons = () => {
		for (const [id, location] of Object.entries(ICONS))
			act(() =>
				dispatch({
					type: "ClassicyDesktopIconAdd",
					app: { id, name: id.replace(".app", ""), icon: "" },
					kind: "app_shortcut",
					location,
				}),
			);
	};
	const selected = () =>
		useAppManager.getState().System.Manager.Desktop.selectedIcons ?? [];
	const select = (ids: string[]) =>
		act(() => {
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ids;
				}),
			);
		});
	const press = (init: Record<string, unknown>) =>
		fireEvent.mouseDown(desktop(), { clientX: 90, clientY: 90, ...init });
	const moveTo = (clientX: number, clientY: number) =>
		fireEvent.mouseMove(desktop(), { clientX, clientY });

	beforeEach(() => {
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			cb(0);
			return 0;
		});
		const original = Element.prototype.getBoundingClientRect;
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const id = this.id.replace(/\.shortcut$/, "");
				const at = this.classList.contains("classicyDesktopIcon")
					? (ICONS[id] ?? [900, 900])
					: null;
				return at ? new DOMRect(at[0], at[1], 40, 40) : original.call(this);
			},
		);
	});
	afterEach(() => {
		restore?.();
		restore = null;
	});

	const useWindows = () => {
		restore = activateTestWindowsKeysPackage(
			WINDOWS_SELECTION as unknown as Parameters<
				typeof activateTestWindowsKeysPackage
			>[0],
		);
	};

	it("opens the menu at a button-2 press and selects with the middle button under Platinum", () => {
		renderDesktop();
		seedIcons();
		press({ button: 2 });
		expect(selectBox()).toBeNull();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeNull();
		fireEvent.mouseDown(document.body);
		press({ button: 1 });
		expect(selectBox()).not.toBeNull();
	});

	it("starts the rectangle at a button-2 press, leaves the menu to the release and ignores the middle button under the Windows keys", () => {
		useWindows();
		renderDesktop();
		seedIcons();
		select(["A.app"]);
		press({ button: 1 });
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual(["A.app"]);
		press({ button: 2 });
		expect(selectBox()).not.toBeNull();
		expect(selected()).toEqual([]);
		expect(document.querySelector(".classicyContextMenuWrapper")).toBeNull();
		fireEvent.mouseUp(desktop());
	});

	it("marks the outline empty until it has a size", () => {
		renderDesktop();
		seedIcons();
		press({ button: 0 });
		expect(selectBox()).toHaveClass("classicyDesktopSelectEmpty");
		moveTo(150, 150);
		expect(selectBox()).not.toHaveClass("classicyDesktopSelectEmpty");
	});

	it("adds to the selection with Shift and toggles with Control under the Windows keys, and replaces it under Platinum", () => {
		renderDesktop();
		seedIcons();
		select(["A.app"]);
		press({ button: 0, shiftKey: true, clientX: 190 });
		moveTo(250, 150);
		expect(selected()).toEqual(["B.app"]);
		fireEvent.mouseUp(desktop());

		useWindows();
		select(["A.app"]);
		press({ button: 0, shiftKey: true, clientX: 190 });
		moveTo(250, 150);
		expect(selected()).toEqual(["A.app", "B.app"]);
		fireEvent.mouseUp(desktop());

		// Control: the first icon covered was selected, so the rectangle
		// takes the icons it covers out.
		select(["A.app", "B.app"]);
		press({ button: 0, ctrlKey: true });
		moveTo(150, 150);
		expect(selected()).toEqual(["B.app"]);
		fireEvent.mouseUp(desktop());
	});

	it("takes the rectangle back on Escape under the Windows keys, and not under Platinum", () => {
		renderDesktop();
		seedIcons();
		press({ button: 0 });
		moveTo(150, 150);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(selectBox()).not.toBeNull();
		expect(selected()).toEqual(["A.app"]);
		fireEvent.mouseUp(desktop());

		useWindows();
		select(["A.app"]);
		press({ button: 0, shiftKey: true, clientX: 190 });
		moveTo(250, 150);
		expect(selected()).toEqual(["A.app", "B.app"]);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual(["A.app"]);
		// The pointer moving on selects nothing more.
		moveTo(350, 150);
		expect(selected()).toEqual(["A.app"]);

		// A plain press cleared the selection: Escape leaves none.
		press({ button: 0 });
		moveTo(150, 150);
		expect(selected()).toEqual(["A.app"]);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(selected()).toEqual([]);
	});

	it("moves the focus icon with Home, End and Control under the Windows keys, and leaves Home to Platinum's type-select", () => {
		renderDesktop();
		seedIcons();
		select(["B.app"]);
		desktop().focus();
		fireEvent.keyDown(desktop(), { key: "Home" });
		expect(selected()).toEqual(["B.app"]);
		cleanup();

		useWindows();
		renderDesktop();
		const order = useAppManager
			.getState()
			.System.Manager.Desktop.icons.filter((i) => !i.hidden)
			.map((i) => i.appId);
		const first = order[0];
		const last = order[order.length - 1];
		desktop().focus();
		fireEvent.keyDown(desktop(), { key: "Home" });
		expect(selected()).toEqual([first]);
		expect(document.activeElement?.id).toBe(`${first}.shortcut`);
		// Control moves the focus alone.
		desktop().focus();
		fireEvent.keyDown(desktop(), { key: "End", ctrlKey: true });
		expect(selected()).toEqual([first]);
		expect(useAppManager.getState().System.Manager.Desktop.focusIcon).toBe(
			last,
		);
		// Control+Space toggles the focus icon into the selection.
		desktop().focus();
		fireEvent.keyDown(desktop(), { key: " ", ctrlKey: true });
		expect(selected()).toEqual([first, last]);
	});
});
