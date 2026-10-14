import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	fireEvent,
	renderWithProviders,
	screen,
	waitFor,
} from "@/__tests__/test-utils";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	ClassicyControlStrip,
	type ClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";

const sound = vi.hoisted(() => ({
	state: { disabled: [] as string[], volume: 100 as number | undefined },
	player: vi.fn(),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSound: () => sound.state,
		useSoundDispatch: () => sound.player,
	}),
);

// ClassicyMenu runs a chosen item once its flash animation ends; jsdom has no
// AnimationEvent, so React listens for the prefixed event (see
// ClassicyDesktopMenuBar.help.test.tsx).
const completeMenuItemFlash = (id: string) => {
	const event = new Event("webkitAnimationEnd", {
		bubbles: true,
		cancelable: true,
	});
	Object.defineProperty(event, "animationName", {
		value: "classicyMenuItemFlashKeyframes",
	});
	document.getElementById(id)?.dispatchEvent(event);
};

/** A mouse click: press and release on one element, then its click. */
const click = (el: Element) => {
	fireEvent.mouseDown(el, { button: 0, clientX: 0 });
	fireEvent.mouseUp(el, { button: 0, clientX: 0 });
	fireEvent.click(el, { detail: 1 });
};

const tab = () =>
	document.querySelector(".classicyControlStripTab") as HTMLButtonElement;

const testModules = (onOpen = vi.fn()): ClassicyControlStripModule[] => [
	{
		id: "sharing",
		label: "File Sharing",
		icon: "sharing.png",
		menuItems: [
			{
				id: "sharing-status",
				title: "No Users Connected",
				disabled: true,
				className: "classicyControlStripStatus",
			},
			{ id: "spacer" },
			{
				id: "sharing-open",
				title: "Open File Sharing Control Panel",
				onClickFunc: onOpen,
			},
		],
	},
	{
		id: "volume",
		label: "Volume",
		icon: "volume.png",
		content: <input type="range" aria-label="Level" />,
	},
];

describe("ClassicyControlStrip (HIGOS8 Figure 6-15)", () => {
	beforeEach(() => {
		sound.state.disabled = [];
		sound.player.mockClear();
	});
	afterEach(() => vi.restoreAllMocks());

	it("lays out collapse box, scroll arrows, a button per module and the tab", () => {
		renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
		const strip = screen.getByRole("toolbar", { name: "Control Strip" });
		const names = Array.from(strip.querySelectorAll("button")).map((b) =>
			b.getAttribute("aria-label"),
		);
		expect(names).toEqual([
			"Collapse Control Strip",
			"Scroll Control Strip left",
			"File Sharing",
			"Volume",
			"Scroll Control Strip right",
			"Collapse or resize Control Strip",
		]);
	});

	it("opens a module's menu, with its italic status line and control panel command", async () => {
		const onOpen = vi.fn();
		renderWithProviders(<ClassicyControlStrip modules={testModules(onOpen)} />);
		click(screen.getByRole("button", { name: "File Sharing" }));
		const status = screen.getByRole("menuitem", { name: "No Users Connected" });
		expect(status).toHaveClass(
			"classicyControlStripStatus",
			"classicyMenuItemDisabled",
		);
		fireEvent.click(
			screen.getByRole("menuitem", { name: "Open File Sharing Control Panel" }),
		);
		completeMenuItemFlash("sharing-open");
		await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
	});

	it("pops up a module's own surface instead of a menu (Figure 2-16)", () => {
		renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
		click(screen.getByRole("button", { name: "Volume" }));
		expect(screen.getByRole("slider", { name: "Level" })).toBeInTheDocument();
	});

	it("collapses to the tab and expands again from it", () => {
		renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
		fireEvent.click(
			screen.getByRole("button", { name: "Collapse Control Strip" }),
		);
		expect(
			screen.queryByRole("button", { name: "File Sharing" }),
		).not.toBeInTheDocument();
		const collapsedTab = screen.getByRole("button", {
			name: "Expand Control Strip",
		});
		expect(collapsedTab).toHaveAttribute("aria-expanded", "false");

		click(collapsedTab);
		expect(
			screen.getByRole("button", { name: "File Sharing" }),
		).toBeInTheDocument();

		// A click on the tab of an open strip collapses it.
		click(tab());
		expect(
			screen.getByRole("button", { name: "Expand Control Strip" }),
		).toBeInTheDocument();
	});

	it("toggles from the keyboard: Enter or Space on the tab", () => {
		renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
		fireEvent.click(tab(), { detail: 0 });
		expect(
			screen.getByRole("button", { name: "Expand Control Strip" }),
		).toBeInTheDocument();
		fireEvent.click(tab(), { detail: 0 });
		expect(
			screen.getByRole("button", { name: "File Sharing" }),
		).toBeInTheDocument();
	});

	it("starts collapsed when asked", () => {
		renderWithProviders(
			<ClassicyControlStrip modules={testModules()} defaultCollapsed />,
		);
		expect(
			screen.getByRole("button", { name: "Expand Control Strip" }),
		).toBeInTheDocument();
	});

	describe("when the modules do not fit", () => {
		// jsdom does no layout: a 100px window onto 300px of 30px modules.
		beforeEach(() => {
			vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
				300,
			);
			vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
				100,
			);
			vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(30);
		});

		it("steps through them one module at a time with the scroll arrows", () => {
			renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
			const left = screen.getByRole("button", {
				name: "Scroll Control Strip left",
			});
			const right = screen.getByRole("button", {
				name: "Scroll Control Strip right",
			});
			expect(left).toBeDisabled();
			expect(right).toBeEnabled();

			fireEvent.click(right);
			const viewport = document.querySelector(
				".classicyControlStripModules",
			) as HTMLElement;
			expect(viewport.scrollLeft).toBe(30);
			expect(left).toBeEnabled();
		});

		it("is sized by dragging the tab, between one module and all of them", () => {
			renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
			const viewport = document.querySelector(
				".classicyControlStripModules",
			) as HTMLElement;
			fireEvent.mouseDown(tab(), { button: 0, clientX: 200 });
			fireEvent.mouseMove(document, { clientX: 160 });
			expect(viewport.style.width).toBe("60px");
			// Widths snap to whole modules: 72 px shows two, 78 px three.
			fireEvent.mouseMove(document, { clientX: 172 });
			expect(viewport.style.width).toBe("60px");
			fireEvent.mouseMove(document, { clientX: 178 });
			expect(viewport.style.width).toBe("90px");
			fireEvent.mouseMove(document, { clientX: 0 });
			expect(viewport.style.width).toBe("30px"); // never narrower than a module
			fireEvent.mouseMove(document, { clientX: 900 });
			expect(viewport.style.width).toBe("300px"); // never wider than them all
			fireEvent.mouseUp(document);
			// A drag is not a click: the strip stays open.
			expect(
				screen.getByRole("button", { name: "File Sharing" }),
			).toBeInTheDocument();
		});

		it("is sized a module at a time from the keyboard with the arrow keys on the tab", () => {
			renderWithProviders(<ClassicyControlStrip modules={testModules()} />);
			const viewport = document.querySelector(
				".classicyControlStripModules",
			) as HTMLElement;
			// From the measured 100 px: 130 snaps to four modules, 70 to two.
			fireEvent.keyDown(tab(), { key: "ArrowRight" });
			expect(viewport.style.width).toBe("120px");
			fireEvent.keyDown(tab(), { key: "ArrowLeft" });
			expect(viewport.style.width).toBe("60px");
		});

		it("snaps a starting width to whole modules", () => {
			renderWithProviders(
				<ClassicyControlStrip modules={testModules()} defaultWidth={100} />,
			);
			const viewport = document.querySelector(
				".classicyControlStripModules",
			) as HTMLElement;
			expect(viewport.style.width).toBe("90px");
		});
	});
});

describe("built-in control strip modules", () => {
	beforeEach(() => {
		sound.state.disabled = [];
		sound.state.volume = 100;
		sound.player.mockClear();
	});

	it("defaults to the Sound and Screen Saver modules", () => {
		renderWithProviders(<ClassicyControlStrip />);
		expect(screen.getByRole("button", { name: "Sound" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Screen Saver" }),
		).toBeInTheDocument();
	});

	it("Sound pops up the volume slider (Figure 2-16) and sets the volume", () => {
		sound.state.volume = 60;
		renderWithProviders(<ClassicyControlStrip />);
		const button = screen.getByRole("button", { name: "Sound" });
		expect(button.querySelector("img")).toHaveAttribute(
			"src",
			ClassicyIcons.system.controlStrip.sound,
		);
		click(button);
		const slider = screen.getByRole("slider", { name: "Volume" });
		expect(slider).toHaveAttribute("aria-valuenow", "60");
		fireEvent.keyDown(slider, { key: "ArrowUp" });
		expect(sound.player).toHaveBeenCalledWith({
			type: "ClassicyVolumeSet",
			volume: 61,
		});
		// Sound is on, so the mute flag is left alone.
		expect(sound.player).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicySoundEnableOne" }),
		);
	});

	it("raising the volume while sound is off turns sound back on", () => {
		sound.state.disabled = ["*", "ClassicyWindowOpen"];
		sound.state.volume = 60;
		renderWithProviders(<ClassicyControlStrip />);
		click(screen.getByRole("button", { name: "Sound" }));
		const slider = screen.getByRole("slider", { name: "Volume" });
		expect(slider).toHaveAttribute("aria-valuenow", "0"); // reads as silent
		fireEvent.keyDown(slider, { key: "End" });
		expect(sound.player).toHaveBeenCalledWith({
			type: "ClassicyVolumeSet",
			volume: 100,
		});
		// Only the "*" flag: per-sound choices stay disabled.
		expect(sound.player).toHaveBeenCalledWith({
			type: "ClassicySoundEnableOne",
			enabled: "*",
		});
	});

	it("Sound shows the speaker without its waves at zero volume", () => {
		sound.state.volume = 0;
		renderWithProviders(<ClassicyControlStrip />);
		expect(
			screen.getByRole("button", { name: "Sound" }).querySelector("img"),
		).toHaveAttribute("src", ClassicyIcons.system.controlStrip.soundOff);
	});

	it("Sound shows the speaker without its waves while sound is off", () => {
		sound.state.disabled = ["*"];
		renderWithProviders(<ClassicyControlStrip />);
		const button = screen.getByRole("button", { name: "Sound" });
		expect(button.querySelector("img")).toHaveAttribute(
			"src",
			ClassicyIcons.system.controlStrip.soundOff,
		);
	});

	it("Screen Saver reports when it starts and can be switched off", async () => {
		// ClassicyDesktop mounts the Screen Saver extension, which registers its
		// app; its reducer ignores actions until then.
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: SCREEN_SAVER_APP_ID, name: "Screen Saver", icon: "" },
		});
		renderWithProviders(<ClassicyControlStrip />);
		click(screen.getByRole("button", { name: "Screen Saver" }));
		expect(
			screen.getByRole("menuitem", { name: "Starts After 5 Minutes Idle" }),
		).toHaveClass("classicyControlStripStatus");
		expect(
			screen.getByRole("menuitem", {
				name: "Open Screen Saver Control Panel",
			}),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("menuitem", { name: "Screen Saver On" }));
		completeMenuItemFlash("screen-saver-enabled");
		await waitFor(() =>
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						SCREEN_SAVER_APP_ID
					]?.data as { enabled?: boolean } | undefined
				)?.enabled,
			).toBe(false),
		);
	});
});
