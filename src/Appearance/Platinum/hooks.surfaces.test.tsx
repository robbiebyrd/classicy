import "@/Appearance/Platinum";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// The window and menu sprites, and the menu item's flash, now come from
// Platinum's hooks; the sounds must still reach the component's own sound
// dispatch. The window harness is the title-bar test's mocked store.
const { soundSpy, mockDispatch } = vi.hoisted(() => ({
	soundSpy: vi.fn(),
	mockDispatch: vi.fn(),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									focused: false,
									windows: windowsRecord({
										id: "TestWindow",
										appId: "TestApp",
										collapsed: false,
										focused: false,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: false,
										closed: false,
										size: [350, 200] as [number, number],
										position: [110, 110] as [number, number],
										minimumSize: [0, 0] as [number, number],
										menuBar: [] as unknown[],
										default: false,
									}),
								},
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useSoundDispatch: () => soundSpy,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

const play = (sound: string) => ({ type: "ClassicySoundPlay", sound });

const renderWindow = () =>
	render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test">
			<p>content</p>
		</ClassicyWindow>,
	);

/** The clickable box inside the `name` control box. */
const control = (container: HTMLElement, name: string) =>
	container.querySelector(
		`[data-classicy-control="${name}"] [role="button"]`,
	) as HTMLElement;

const renderLeaf = (onClickFunc: () => void) =>
	render(
		<ClassicyMenu
			name="test-menu"
			menuItems={[{ id: "save", title: "Save", onClickFunc }]}
		/>,
	);

// jsdom has no `AnimationEvent`, so React hears an animation's end as
// "webkitAnimationEnd" and `fireEvent.animationEnd` never reaches the
// handler: dispatch the real, bubbling event, as a browser would.
const animationEnd = (el: Element, animationName: string) => {
	const event = new Event("webkitAnimationEnd", {
		bubbles: true,
		cancelable: true,
	});
	Object.defineProperty(event, "animationName", { value: animationName });
	act(() => {
		el.dispatchEvent(event);
	});
};

const source = (path: string) =>
	readFileSync(resolve(__dirname, "../..", path), "utf8");

beforeEach(() => {
	soundSpy.mockReset();
	mockDispatch.mockReset();
});

describe("Platinum window and menu feedback through the appearance hooks", () => {
	it("collapse still plays its sound through the hook", () => {
		const { container } = renderWindow();
		fireEvent.click(control(container, "collapse"));
		expect(soundSpy).toHaveBeenCalledWith(play("ClassicyWindowCollapse"));
	});

	it("zoom still plays", () => {
		const { container } = renderWindow();
		fireEvent.click(control(container, "zoom"));
		expect(soundSpy).toHaveBeenCalledWith(play("ClassicyWindowZoomMaximize"));
	});

	it("the flash class comes from the package and goes away when the action runs", async () => {
		const onClickFunc = vi.fn();
		renderLeaf(onClickFunc);
		const li = screen.getByRole("menuitem");
		fireEvent.click(li);
		expect(li.classList.contains("classicyMenuItemFlash")).toBe(true);
		expect(soundSpy).toHaveBeenCalledWith(play("ClassicyMenuItemClick"));
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1), {
			timeout: 2000,
		});
		expect(li.classList.contains("classicyMenuItemFlash")).toBe(false);
	});

	it("animationend of any name finishes the flash exactly once", async () => {
		const onClickFunc = vi.fn();
		renderLeaf(onClickFunc);
		const li = screen.getByRole("menuitem");
		fireEvent.click(li);
		animationEnd(li, "somethingElse");
		// The event, not the 400 ms fallback, ended the flash.
		expect(li.classList.contains("classicyMenuItemFlash")).toBe(false);
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1));
		await new Promise((done) => setTimeout(done, 600));
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	it("component sources no longer dispatch the window and menu sprites", () => {
		const windowSource = source(
			"SystemFolder/SystemResources/Window/ClassicyWindow.tsx",
		);
		expect(windowSource).not.toMatch(
			/sound: "ClassicyWindow(Focus|Collapse|Expand|Zoom|Close|Move)/,
		);
		// The ternary forms (zoom, Option-click collapse) and every other
		// feedback play: only the error beeps are left in the window.
		expect(windowSource).not.toMatch(/"ClassicySoundPlay(Interrupt)?"/);
		expect(windowSource).not.toMatch(
			/"ClassicyWindow(ZoomMaximize|ZoomMinimize|MoveIdle|MoveMoving|MoveStop)"/,
		);
		expect(windowSource).toMatch(/"ClassicySoundPlayError"/);

		const menuSource = source(
			"SystemFolder/SystemResources/Menu/ClassicyMenu.tsx",
		);
		expect(menuSource).not.toMatch(/"ClassicySoundPlay(Interrupt)?"/);
		// The sprites (the analytics type "ClassicyMenuItem" stays).
		expect(menuSource).not.toMatch(
			/"ClassicyMenu(Open|ItemClick|ItemHover|ItemBlur)"/,
		);
		expect(
			source("SystemFolder/SystemResources/Menu/ClassicyMenu.scss"),
		).not.toContain("classicyMenuItemFlash");
	});
});
