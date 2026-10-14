import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	renderWithProviders,
	screen,
	waitFor,
} from "@/__tests__/test-utils";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { CONTROL_STRIP_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	ClassicyControlStrip,
	type ClassicyControlStripProps,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	type ClassicyControlStripModuleDefinition,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
	useClassicyControlStripDisabledModules,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
// The built-in modules register when their owners' modules load.
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundControlStripModule";
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule";

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

const BUILT_INS = Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS);

const testModules = (
	onOpen = vi.fn(),
): ClassicyControlStripModuleDefinition[] => [
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
		content: () => <input type="range" aria-label="Level" />,
	},
];

let registered: string[] = [];
const register = (...modules: ClassicyControlStripModuleDefinition[]) => {
	for (const module of modules) {
		registerClassicyControlStripModule(module);
		registered.push(module.id);
	}
};

/** The strip with only the test's own modules: the built-ins host-disabled. */
const renderStrip = (props: ClassicyControlStripProps = {}) =>
	renderWithProviders(
		<ClassicyControlStrip disabledModules={BUILT_INS} {...props} />,
	);

const moduleNames = () =>
	Array.from(
		document.querySelectorAll(".classicyControlStripModules button"),
	).map((b) => b.getAttribute("aria-label"));

const storedStrip = () =>
	useAppManager.getState().System.Manager.Desktop.controlStrip;

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
});

afterEach(() => {
	for (const id of registered) unregisterClassicyControlStripModule(id);
	registered = [];
	vi.restoreAllMocks();
});

describe("ClassicyControlStrip (HIGOS8 Figure 6-15)", () => {
	beforeEach(() => {
		sound.state.disabled = [];
		sound.player.mockClear();
	});
	afterEach(() => vi.restoreAllMocks());

	it("lays out collapse box, scroll arrows, a button per module and the tab", () => {
		register(...testModules());
		renderStrip();
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
		register(...testModules(onOpen));
		renderStrip();
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
		register(...testModules());
		renderStrip();
		click(screen.getByRole("button", { name: "Volume" }));
		expect(screen.getByRole("slider", { name: "Level" })).toBeInTheDocument();
	});

	it("collapses to the tab and expands again from it", () => {
		register(...testModules());
		renderStrip();
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
		register(...testModules());
		renderStrip();
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
		register(...testModules());
		renderStrip({ defaultCollapsed: true });
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
			register(...testModules());
			renderStrip();
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
			register(...testModules());
			renderStrip();
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
			register(...testModules());
			renderStrip();
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
			register(...testModules());
			renderStrip({ defaultWidth: 100 });
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

	it("shows Sound always, and Screen Saver while its extension is mounted", () => {
		renderWithProviders(<ClassicyControlStrip />);
		expect(moduleNames()).toEqual(["Sound"]);
		let unmount = () => {};
		act(() => {
			unmount = markClassicyAppMounted(SCREEN_SAVER_APP_ID);
		});
		expect(moduleNames()).toEqual(["Sound", "Screen Saver"]);
		act(() => unmount());
		expect(moduleNames()).toEqual(["Sound"]);
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
		const unmount = markClassicyAppMounted(SCREEN_SAVER_APP_ID);
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
		unmount();
	});
});

describe("Control Strip module registration", () => {
	const plain = (
		id: string,
		extra: Partial<ClassicyControlStripModuleDefinition> = {},
	): ClassicyControlStripModuleDefinition => ({
		id,
		label: id,
		icon: `${id}.png`,
		menuItems: [{ id: `${id}-item`, title: id }],
		...extra,
	});

	it("shows registered modules alongside the built-ins", () => {
		register(plain("Extra"));
		renderWithProviders(<ClassicyControlStrip />);
		expect(moduleNames()).toEqual(["Sound", "Extra"]);
	});

	it("updates live when a module is registered or unregistered after mount", () => {
		renderStrip();
		expect(moduleNames()).toEqual([]);
		act(() => register(plain("Late")));
		expect(moduleNames()).toEqual(["Late"]);
		act(() => {
			unregisterClassicyControlStripModule("Late");
		});
		expect(moduleNames()).toEqual([]);
	});

	it("orders by `order`, then registration order", () => {
		register(plain("C"), plain("A", { order: 5 }), plain("B"));
		renderStrip();
		expect(moduleNames()).toEqual(["A", "C", "B"]);
	});

	it("lets the owner replace a module, and ignores another owner's claim", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		register(plain("Mine", { appId: "Host.app" }), plain("Other"));
		const unmount = markClassicyAppMounted("Host.app");
		renderStrip();
		expect(moduleNames()).toEqual(["Mine", "Other"]);

		act(() => {
			registerClassicyControlStripModule(
				plain("Mine", { appId: "Host.app", label: "Mine v2" }),
			);
		});
		// Replaced in place: same position, new label.
		expect(moduleNames()).toEqual(["Mine v2", "Other"]);

		const result = registerClassicyControlStripModule(
			plain("Mine", { appId: "Intruder.app", label: "Stolen" }),
		);
		expect(result.label).toBe("Mine v2");
		expect(moduleNames()).toEqual(["Mine v2", "Other"]);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'Module "Mine" is already registered by Host.app',
			),
		);
		act(() => unmount());
	});

	it("shows a module with an appId only while that app is mounted", () => {
		register(plain("Owned", { appId: "Owner.app" }));
		renderStrip();
		expect(moduleNames()).toEqual([]);
		let unmount = () => {};
		act(() => {
			unmount = markClassicyAppMounted("Owner.app");
		});
		expect(moduleNames()).toEqual(["Owned"]);
		act(() => unmount());
		expect(moduleNames()).toEqual([]);
	});

	it("runs hook forms inside the providers and follows their state", () => {
		register({
			id: "Hooked",
			label: "Hooked",
			icon: () =>
				useAppManager((s) =>
					s.System.Manager.Desktop.disableBalloonHelp ? "off.png" : "on.png",
				),
			menuItems: () => [
				{
					id: "hooked-status",
					title: useAppManager(
						(s) => s.System.Manager.Desktop.disableBalloonHelp,
					)
						? "Balloons Off"
						: "Balloons On",
				},
			],
		});
		renderStrip();
		const button = screen.getByRole("button", { name: "Hooked" });
		expect(button.querySelector("img")).toHaveAttribute("src", "on.png");
		act(() =>
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: true,
			}),
		);
		expect(button.querySelector("img")).toHaveAttribute("src", "off.png");
		click(button);
		expect(
			screen.getByRole("menuitem", { name: "Balloons Off" }),
		).toBeInTheDocument();
	});

	it("leaves out host-disabled modules and publishes them for the control panel", () => {
		register(plain("Kept"), plain("Dropped"));
		const Probe = () => (
			<output aria-label="disabled">
				{useClassicyControlStripDisabledModules().join(",")}
			</output>
		);
		const { unmount } = renderWithProviders(
			<>
				<ClassicyControlStrip disabledModules={[...BUILT_INS, "Dropped"]} />
				<Probe />
			</>,
		);
		expect(moduleNames()).toEqual(["Kept"]);
		expect(screen.getByLabelText("disabled")).toHaveTextContent(
			[...BUILT_INS, "Dropped"].join(","),
		);
		unmount();
		renderWithProviders(<Probe />);
		expect(screen.getByLabelText("disabled")).toHaveTextContent("");
	});
});

describe("Control Strip persisted state", () => {
	it("stores collapsing and expanding", () => {
		register(...testModules());
		renderStrip();
		fireEvent.click(
			screen.getByRole("button", { name: "Collapse Control Strip" }),
		);
		expect(storedStrip()?.collapsed).toBe(true);
		click(tab());
		expect(storedStrip()?.collapsed).toBe(false);
	});

	it("prefers the stored collapsed state over defaultCollapsed", () => {
		register(...testModules());
		dispatch({
			type: "ClassicyDesktopControlStripSetCollapsed",
			collapsed: false,
		});
		renderStrip({ defaultCollapsed: true });
		expect(
			screen.getByRole("button", { name: "File Sharing" }),
		).toBeInTheDocument();
	});

	it("stores the width the user drags to, and starts from it", () => {
		vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
		vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(30);
		register(...testModules());
		const { unmount } = renderStrip({ defaultWidth: 300 });
		// A starting width is not a choice the user made: nothing is stored.
		expect(storedStrip()?.width).toBeUndefined();
		fireEvent.mouseDown(tab(), { button: 0, clientX: 200 });
		fireEvent.mouseMove(document, { clientX: 160 });
		fireEvent.mouseUp(document);
		expect(storedStrip()?.width).toBe(60);
		unmount();

		renderStrip({ defaultWidth: 300 });
		const viewport = document.querySelector(
			".classicyControlStripModules",
		) as HTMLElement;
		expect(viewport.style.width).toBe("60px");
	});

	it("leaves out modules the user hid, in the user's order", () => {
		register(...testModules(), {
			id: "third",
			label: "Third",
			icon: "third.png",
			menuItems: [],
		});
		dispatch({
			type: "ClassicyDesktopControlStripSetModuleOrder",
			moduleOrder: ["third", "sharing"],
		});
		dispatch({
			type: "ClassicyDesktopControlStripSetModuleHidden",
			moduleId: "volume",
			hidden: true,
		});
		renderStrip();
		expect(moduleNames()).toEqual(["Third", "File Sharing"]);
	});

	it("draws nothing while hidden from the control panel", () => {
		register(...testModules());
		dispatch({ type: "ClassicyDesktopControlStripSetVisible", visible: false });
		renderStrip();
		expect(screen.queryByRole("toolbar", { name: "Control Strip" })).toBeNull();
	});

	it("offers Hide Control Strip and its control panel from its contextual menu", async () => {
		register(...testModules());
		renderWithProviders(
			<ClassicyContextualMenuProvider>
				<ClassicyControlStrip disabledModules={BUILT_INS} />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(tab(), { clientX: 10, clientY: 10 });
		fireEvent.click(
			screen.getByRole("menuitem", {
				name: "Open Control Strip Control Panel",
			}),
		);
		completeMenuItemFlash("control-strip-open-control-panel");
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Applications.apps[
					CONTROL_STRIP_MANAGER_APP_ID
				]?.open,
			).toBe(true),
		);

		fireEvent.contextMenu(tab(), { clientX: 10, clientY: 10 });
		fireEvent.click(
			screen.getByRole("menuitem", { name: "Hide Control Strip" }),
		);
		completeMenuItemFlash("control-strip-hide");
		await waitFor(() => expect(storedStrip()?.visible).toBe(false));
		expect(screen.queryByRole("toolbar", { name: "Control Strip" })).toBeNull();
	});
});
