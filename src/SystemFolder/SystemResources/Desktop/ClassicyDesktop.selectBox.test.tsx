// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { produce } from "immer";
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
		// Drawn once the pointer has traveled past the threshold.
		fireEvent.mouseMove(desktop(), { clientX: 40, clientY: 40 });
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

// Selection by a rectangle over the desktop icons (story 0228-e9l): the
// icons it touches, by their image or label, are selected in the store.
describe("ClassicyDesktop selection rectangle over the icons", () => {
	const icon = (appId: string, label: string) => ({
		appId,
		appName: label,
		label,
		icon: "/i.png",
		kind: "app_shortcut",
		location: [0, 0] as [number, number],
		noLaunch: true,
	});
	const boxes = new Map<string, [number, number, number, number]>();

	beforeEach(() => {
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.icons = [
						icon("Alpha.app", "Alpha"),
						icon("Beta.app", "Beta"),
					];
				}),
			);
		});
		// jsdom lays nothing out: the desktop fills 1024 x 768, Alpha's image
		// is at (900, 40) and Beta's at (900, 120), each label 14 px below.
		boxes.clear();
		boxes.set("#classicyDesktop", [0, 0, 1024, 768]);
		boxes.set('[id="Alpha.app.shortcut"] img', [900, 40, 32, 32]);
		boxes.set('[id="Alpha.app.shortcut"] p', [890, 74, 52, 12]);
		boxes.set('[id="Beta.app.shortcut"] img', [900, 120, 32, 32]);
		boxes.set('[id="Beta.app.shortcut"] p', [890, 154, 52, 12]);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				for (const [selector, [x, y, width, height]] of boxes)
					if (this.matches(selector))
						return DOMRect.fromRect({ x, y, width, height });
				return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
			},
		);
	});

	const selected = () =>
		useAppManager.getState().System.Manager.Desktop.selectedIcons ?? [];
	const select = (ids: string[]) =>
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ids;
				}),
			);
		});
	const move = (x: number, y: number) =>
		fireEvent.mouseMove(document, { clientX: x, clientY: y });
	const press = (x: number, y: number, init: MouseEventInit = {}) =>
		fireEvent.mouseDown(desktop(), {
			button: 0,
			clientX: x,
			clientY: y,
			...init,
		});

	it("selects the icons it touches, live, and draws the package's part", () => {
		renderDesktop();
		select(["Beta.app"]);
		press(860, 20);
		expect(selected()).toEqual([]);
		move(861, 21);
		expect(selectBox()).toBeNull();
		move(910, 60);
		const part = selectBox() as HTMLElement;
		expect(part.getAttribute("data-classicy-part")).toBe("selection-marquee");
		expect(part.classList).toContain("classicySelectionMarquee");
		expect(selected()).toEqual(["Alpha.app"]);
		// Down to Beta's label only.
		move(895, 160);
		expect(selected()).toEqual(["Alpha.app", "Beta.app"]);
		fireEvent.mouseUp(document, { clientX: 895, clientY: 160 });
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual(["Alpha.app", "Beta.app"]);
	});

	it("keeps the selection with Shift and toggles what it touches", () => {
		renderDesktop();
		select(["Alpha.app"]);
		press(860, 20, { shiftKey: true });
		expect(selected()).toEqual(["Alpha.app"]);
		move(895, 160);
		expect(selected()).toEqual(["Beta.app"]);
	});

	it("restores the selection from before the press on Escape", () => {
		renderDesktop();
		select(["Beta.app"]);
		press(860, 20);
		move(910, 60);
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.keyDown(desktop(), { key: "Escape" });
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual(["Beta.app"]);
	});

	it("leaves a press on an icon to the icon: no rectangle", () => {
		renderDesktop();
		const alpha = document.getElementById("Alpha.app.shortcut") as HTMLElement;
		fireEvent.mouseDown(alpha, { button: 0, clientX: 910, clientY: 50 });
		move(980, 200);
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.mouseUp(alpha, { clientX: 980, clientY: 200 });
	});

	it("takes a Control-press as the contextual-menu click: no rectangle, deselected, the desktop's menu", async () => {
		renderDesktop();
		select(["Beta.app"]);
		const menus = vi.fn();
		desktop().addEventListener("contextmenu", menus);
		press(860, 20, { ctrlKey: true });
		expect(selected()).toEqual([]);
		move(910, 60);
		expect(selectBox()).toBeNull();
		expect(selected()).toEqual([]);
		// No macOS browser here to fire one: the press asks for the menu.
		await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
		expect(menus).toHaveBeenCalledTimes(1);
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeNull();
		fireEvent.mouseUp(document, { clientX: 910, clientY: 60 });
	});

	it("takes a right-press as it takes a Control-press: deselected, no rectangle, the desktop's menu", () => {
		renderDesktop();
		select(["Beta.app"]);
		press(860, 20, { button: 2 });
		expect(selected()).toEqual([]);
		move(910, 60);
		expect(selectBox()).toBeNull();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeNull();
		fireEvent.mouseUp(document, { clientX: 910, clientY: 60 });
	});

	it("takes a Control-press on an icon as the contextual-menu click: selected, no drag, the menu", async () => {
		renderDesktop();
		select(["Beta.app"]);
		const menus = vi.fn();
		desktop().addEventListener("contextmenu", menus);
		const alpha = document.getElementById("Alpha.app.shortcut") as HTMLElement;
		const at = () =>
			useAppManager
				.getState()
				.System.Manager.Desktop.icons.find((i) => i.appId === "Alpha.app")
				?.location;
		const before = at();
		fireEvent.mouseDown(alpha, {
			button: 0,
			clientX: 910,
			clientY: 50,
			ctrlKey: true,
		});
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.mouseMove(alpha, { clientX: 980, clientY: 200 });
		fireEvent.mouseUp(alpha, { clientX: 980, clientY: 200 });
		fireEvent.click(alpha, { detail: 1, ctrlKey: true });
		expect(at()).toEqual(before);
		expect(selectBox()).toBeNull();
		await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
		expect(menus).toHaveBeenCalledTimes(1);
		expect(selected()).toEqual(["Alpha.app"]);
	});

	it("holds the arrow keys and type-ahead off while the rectangle lasts", () => {
		renderDesktop();
		press(860, 20);
		move(910, 60);
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.keyDown(desktop(), { key: "ArrowDown" });
		fireEvent.keyDown(desktop(), { key: "b" });
		expect(selected()).toEqual(["Alpha.app"]);
		// The rectangle still selects what it touches.
		move(895, 160);
		expect(selected()).toEqual(["Alpha.app", "Beta.app"]);
		move(910, 60);
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.mouseUp(document, { clientX: 910, clientY: 60 });
		// Over: the keys act again.
		fireEvent.keyDown(desktop(), { key: "ArrowDown" });
		expect(selected()).toEqual(["Beta.app"]);
	});

	it("leaves the keyboard on the desktop, acting on the selection it made", () => {
		renderDesktop();
		press(860, 20);
		move(910, 60);
		fireEvent.mouseUp(document, { clientX: 910, clientY: 60 });
		expect(document.activeElement).toBe(desktop());
		expect(selected()).toEqual(["Alpha.app"]);
		fireEvent.keyDown(desktop(), { key: "ArrowDown" });
		expect(selected()).toEqual(["Beta.app"]);
	});
});
