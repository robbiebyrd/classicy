import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlStrip } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
// The built-in modules register when their owners' modules load.
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundControlStripModule";
import "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverControlStripModule";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSound: () => ({ disabled: [] as string[], volume: 100 }),
		useSoundDispatch: () => mockPlayer,
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

const APP = "Surfaces.app";

const seedStore = (apps: Record<string, ClassicyStoreSystemApp> = {}) => {
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
						apps: { ...state.System.Manager.Applications.apps, ...apps },
					},
				},
			},
		}));
	});
};

const app = (open: boolean): ClassicyStoreSystemApp => ({
	id: APP,
	name: "Surfaces",
	icon: "",
	open,
	focused: true,
	windows: {},
});

/** Select (or deselect) the test icon, placing it on the desktop. */
const selectIcon = (selected: boolean) => {
	act(() => {
		useAppManager.setState((state) => ({
			...state,
			System: {
				...state.System,
				Manager: {
					...state.System.Manager,
					Desktop: {
						...state.System.Manager.Desktop,
						selectedIcons: selected ? [APP] : [],
						icons: [
							{
								appId: APP,
								appName: "Surfaces",
								icon: "/icons/surfaces.png",
								kind: "app_shortcut",
								location: [100, 200],
							},
						],
					},
				},
			},
		}));
	});
};

const launchApp = () => {
	act(() => {
		useAppManager.setState((state) => ({
			...state,
			System: {
				...state.System,
				Manager: {
					...state.System.Manager,
					Applications: {
						...state.System.Manager.Applications,
						apps: {
							...state.System.Manager.Applications.apps,
							[APP]: app(true),
						},
					},
				},
			},
		}));
	});
};

beforeEach(() => {
	mockPlayer.mockClear();
});

describe("shared bare state classes on windows, icons, the Control Strip and the menu bar", () => {
	it("ClassicyWindow contents carry collapsed while collapsed and never 'block'", () => {
		seedStore({ [APP]: app(true) });
		const { container } = render(
			<ClassicyWindow id="w" appId={APP} title="W">
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		const contents = container.querySelector(
			".classicyWindowContents",
		) as HTMLElement;
		expect(contents).not.toHaveClass("collapsed");
		expect(contents).not.toHaveClass("block");
		expect(contents).not.toHaveClass("hidden");
		expect(root).not.toHaveClass("collapsed");

		fireEvent.click(
			container.querySelector(".classicyWindowCollapseBox") as HTMLElement,
		);

		expect(root).toHaveClass("classicyWindow", "collapsed");
		expect(contents).toHaveClass("classicyWindowContents", "collapsed");
		expect(contents).not.toHaveClass("block");
		expect(contents).not.toHaveClass("hidden");
		expect(root).not.toHaveClass("classicyWindowCollapsed");
		expect(root).not.toHaveClass("classicyWindowZoomed");
	});

	it("DesktopIcon selected+launched → selected open", () => {
		seedStore({ [APP]: app(true) });
		selectIcon(true);
		const { container } = render(
			<ClassicyDesktopIcon
				appId={APP}
				appName="Surfaces"
				icon="/icons/surfaces.png"
				kind="app_shortcut"
			/>,
		);
		const icon = container.querySelector(".classicyDesktopIcon") as HTMLElement;
		expect(icon).toHaveClass("classicyDesktopIcon", "selected", "open");
		for (const legacy of [
			"classicyDesktopIconActive",
			"classicyDesktopIconOpen",
			"classicyDesktopIconActiveAndOpen",
			"classicyDesktopIconDragging",
		]) {
			expect(icon).not.toHaveClass(legacy);
		}
	});

	it("DesktopIcon selected only → selected; launched only → open", () => {
		seedStore({ [APP]: app(false) });
		selectIcon(true);
		const { container } = render(
			<ClassicyDesktopIcon
				appId={APP}
				appName="Surfaces"
				icon="/icons/surfaces.png"
				kind="app_shortcut"
			/>,
		);
		const icon = container.querySelector(".classicyDesktopIcon") as HTMLElement;
		expect(icon).toHaveClass("selected");
		expect(icon).not.toHaveClass("open");
		selectIcon(false);
		launchApp();
		expect(icon).toHaveClass("open");
		expect(icon).not.toHaveClass("selected");
	});

	it("menu bar Apple menu item carries classicyDesktopMenuApple", () => {
		seedStore();
		render(<ClassicyDesktopMenuBar />);
		const apple = document.getElementById("apple-menu") as HTMLElement;
		expect(apple).toHaveClass("classicyDesktopMenuApple");
		expect(apple).not.toHaveClass("classicyDesktopMenuAppleMenu");
	});
});

describe("ClassicyControlStrip state classes", () => {
	const DESKTOP = { left: 0, top: 0, width: 800, height: 600 };
	const STRIP_TOP = 576;
	let desktop: HTMLElement;
	let registered: string[] = [];

	beforeEach(() => {
		seedStore();
		registerClassicyControlStripModule({
			id: "surfaces-module",
			label: "Surfaces Module",
			icon: "surfaces.png",
			content: () => <input type="range" aria-label="Level" />,
		});
		registered = ["surfaces-module"];
		desktop = document.createElement("div");
		document.body.appendChild(desktop);
		// jsdom runs no layout: stand in the desktop as the strip's offset
		// parent, with the strip at its bottom edge.
		vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(
			desktop,
		);
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(24);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const rect =
					this === desktop
						? DESKTOP
						: this.classList.contains("classicyDesktopMenuBar")
							? { left: 0, top: 0, width: 800, height: 20 }
							: { left: 0, top: STRIP_TOP, width: 200, height: 24 };
				return {
					...rect,
					right: rect.left + rect.width,
					bottom: rect.top + rect.height,
					x: rect.left,
					y: rect.top,
					toJSON: () => {},
				} as DOMRect;
			},
		);
	});

	afterEach(() => {
		for (const id of registered) unregisterClassicyControlStripModule(id);
		desktop.remove();
		vi.restoreAllMocks();
	});

	const renderStrip = () =>
		render(
			<ClassicyControlStrip
				disabledModules={Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS)}
			/>,
		);
	const strip = () => screen.getByRole("toolbar", { name: "Control Strip" });

	it("ControlStrip collapsed → collapsed; dragging the tab → dragging", () => {
		renderStrip();
		expect(strip()).not.toHaveClass("collapsed");
		expect(strip()).not.toHaveClass("dragging");

		fireEvent.click(
			screen.getByRole("button", { name: "Collapse Control Strip" }),
			{ detail: 1 },
		);
		expect(strip()).toHaveClass("classicyControlStrip", "collapsed");
		expect(strip()).not.toHaveClass("classicyControlStripCollapsed");
		// The tab keeps announcing the state to assistive technology.
		expect(
			screen.getByRole("button", { name: "Expand Control Strip" }),
		).toHaveAttribute("aria-expanded", "false");
		const tab = screen.getByRole("button", { name: "Expand Control Strip" });
		fireEvent.mouseDown(tab, { button: 0, clientX: 0 });
		fireEvent.mouseUp(tab, { button: 0, clientX: 0 });
		fireEvent.click(tab, { detail: 1 });
		expect(strip()).not.toHaveClass("collapsed");

		// Control-dragging the strip moves it: the strip is `dragging` while the
		// preview follows the pointer, and stops being so on release.
		fireEvent.mouseDown(
			screen.getByRole("button", { name: "Collapse Control Strip" }),
			{ button: 0, ctrlKey: true, clientX: 5, clientY: STRIP_TOP + 12 },
		);
		fireEvent.mouseMove(document, { clientX: 700, clientY: 300 });
		expect(strip()).toHaveClass("classicyControlStrip", "dragging");
		expect(strip()).not.toHaveClass("classicyControlStripMoving");
		fireEvent.mouseUp(document);
		expect(strip()).not.toHaveClass("dragging");
	});
});

const root = process.cwd();
const R = "src/SystemFolder/SystemResources/";
const compile = (relative: string) =>
	sass.compile(resolve(root, relative), {
		style: "expanded",
		loadPaths: [resolve(root, "src")],
	}).css;
const source = (relative: string) =>
	readFileSync(resolve(root, relative), "utf8");

describe("compiled SCSS of the touched surfaces", () => {
	it("BevelButton: no data-state, state rules keyed on the bare classes", () => {
		const scss = source(`${R}BevelButton/ClassicyBevelButton.scss`);
		const css = compile(`${R}BevelButton/ClassicyBevelButton.scss`);
		expect(scss).not.toContain("data-state");
		expect(css).not.toContain("data-state");
		for (const selector of [
			".classicyBevelButton.checked",
			".classicyBevelButton.pressed",
			".classicyBevelButton.mixed",
			".classicyBevelButton.disabled",
			".classicyBevelButton.disabled.checked",
		]) {
			expect(css).toContain(selector);
		}
	});

	it("Placard and ImageWell: no data-state, bare state classes", () => {
		const placard = compile(`${R}Placard/ClassicyPlacard.scss`);
		expect(placard).not.toContain("data-state");
		expect(placard).toContain(".classicyPlacard.pressed {");
		expect(placard).toContain(".classicyPlacard.disabled {");
		const well = compile(`${R}ImageWell/ClassicyImageWell.scss`);
		expect(well).toContain(":where(.classicyImageWell).selected {");
		expect(well).toContain(":where(.classicyImageWell).disabled {");
		expect(well).not.toMatch(/ImageWell(Selected|Disabled)/);
	});

	it("ControlStrip: no aria-expanded or data-state selector", () => {
		const scss = source(`${R}ControlStrip/ClassicyControlStrip.scss`);
		const css = compile(`${R}ControlStrip/ClassicyControlStrip.scss`);
		expect(scss).not.toContain("aria-expanded");
		expect(css).not.toContain("aria-expanded");
		expect(css).not.toContain("data-state");
		expect(css).toContain(
			".classicyBevelButton.classicyControlStripModule.pressed",
		);
		expect(css).toContain(
			".classicyBevelButton.classicyControlStripModule.open",
		);
		expect(css).toContain(":where(.classicyControlStrip).dragging {");
		expect(css).toContain(
			":where(.classicyControlStrip).collapsed .classicyControlStripTab {",
		);
		expect(css).not.toMatch(/classicyControlStrip(Moving|Collapsed)/);
	});

	it("MenuBar: one top-level .classicyDesktopMenuApple block, no AppleMenu", () => {
		const scss = source(`${R}Desktop/MenuBar/ClassicyDesktopMenuBar.scss`);
		const css = compile(`${R}Desktop/MenuBar/ClassicyDesktopMenuBar.scss`);
		expect(scss).not.toContain("classicyDesktopMenuAppleMenu");
		expect(css).not.toContain("classicyDesktopMenuAppleMenu");
		expect(css.match(/^\.classicyDesktopMenuApple \{/gm)).toHaveLength(1);
		// Every declaration of the two merged blocks survives in the one.
		const block = css.match(/^\.classicyDesktopMenuApple \{[^}]*\}/m)?.[0];
		expect(block).toContain("margin-left: 0;");
	});

	it("Window: bare state rules, no legacy state selectors", () => {
		const css = compile(`${R}Window/ClassicyWindow.scss`);
		expect(css).not.toMatch(
			/\.classicyWindow(Active|Inactive|Collapsed|Dragging|Zoomed)\b/,
		);
		expect(css).toContain(":where(.classicyWindow).inactive {");
		expect(css).toContain(":where(.classicyWindow).active {");
		expect(css).toContain(":where(.classicyWindow).collapsed {");
		expect(css).toContain(":where(.classicyWindow).dragging {");
		expect(css).toContain(".classicyWindowUtility.collapsed {");
		expect(css).toContain(
			":where(.classicyWindowContents, .classicyWindowContentsModal).collapsed {",
		);
		// The ActiveApp, Resizing and Invisible hooks are kept.
		expect(css).toContain(".classicyWindowActiveApp {");
		expect(css).toContain(".classicyWindowResizing {");
		expect(css).toContain(".classicyWindowInvisible {");
	});

	it("appearance.scss no longer ships the global .hidden utility", () => {
		const css = compile(`${R}Window/ClassicyWindow.scss`);
		expect(css).not.toMatch(/^\.hidden \{/m);
		expect(
			source(
				"src/SystemFolder/ControlPanels/AppearanceManager/styles/appearance.scss",
			),
		).not.toMatch(/^\.hidden \{/m);
	});

	it.each([
		["Icon/ClassicyIcon.scss", "classicyIcon"],
		["Desktop/ClassicyDesktopIcon.scss", "classicyDesktopIcon"],
	])("%s: .selected.open comes after .selected and .open", (file, rootClass) => {
		const css = compile(`${R}${file}`);
		expect(css).not.toMatch(
			new RegExp(`\\.${rootClass}(Active|ActiveAndOpen|Open|Dragging)\\b`),
		);
		const selected = css.indexOf(`:where(.${rootClass}).selected p {`);
		const open = css.indexOf(`:where(.${rootClass}).open {`);
		const both = css.indexOf(`.${rootClass}.selected.open {`);
		expect(selected).toBeGreaterThan(-1);
		expect(open).toBeGreaterThan(-1);
		expect(both).toBeGreaterThan(selected);
		expect(both).toBeGreaterThan(open);
		expect(css).toContain(`:where(.${rootClass}).dragging {`);
	});
});
