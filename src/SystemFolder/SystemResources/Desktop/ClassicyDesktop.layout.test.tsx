import { act, render } from "@testing-library/react";
import { produce } from "immer";
import type { ComponentProps, CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Importing the Platinum module registered it; keep that object so every test
// starts from the real Platinum registration (platinum.json's layout), not
// from an empty registry's CLASSICY_DEFAULT_APPEARANCE_LAYOUT fallback.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const renderDesktop = (style?: CSSProperties) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false} style={style} />
		</ClassicyAppManagerProvider>,
	);

const APP_ID = "T.app";

const fileMenu: ClassicyMenuItem[] = [
	{ id: "file", title: "File", menuChildren: [{ id: "new", title: "New" }] },
];

const openApp = () =>
	useAppManager.setState((state) =>
		produce(state, (draft) => {
			draft.System.Manager.Applications.apps[APP_ID] = {
				id: APP_ID,
				name: "T",
				icon: "",
				windows: {},
				open: true,
				focused: true,
				data: {},
			};
		}),
	);

const renderDesktopWithWindow = (
	windowProps: Partial<ComponentProps<typeof ClassicyWindow>> = {},
) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<ClassicyApp id={APP_ID} name="T" icon="">
					<ClassicyWindow
						id="main"
						appId={APP_ID}
						title="Main"
						appMenu={fileMenu}
						{...windowProps}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyApp>
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const activate = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const desktopRoot = (container: HTMLElement) =>
	container.querySelector(".classicyDesktop") as HTMLElement | null;

describe("ClassicyDesktop layout", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("publishes the layout on the desktop root", () => {
		expect(platinum.layout).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		});
		expect(getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID)).toBe(
			platinum,
		);
		const { container } = renderDesktop();
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-menu-bar-placement"),
		).toBe("screen");
		expect(
			root?.style.getPropertyValue("--classicy-layout-icon-grid-origin"),
		).toBe("top-right");
	});

	it("follows a switch to another package", () => {
		registerTestMirrorPackage();
		const { container } = renderDesktop();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MIRROR_PACKAGE_ID,
			}),
		);
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("window");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-left");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-left");
		expect(
			root?.style.getPropertyValue("--classicy-layout-menu-bar-placement"),
		).toBe("window");
		expect(
			root?.style.getPropertyValue("--classicy-layout-icon-grid-origin"),
		).toBe("top-left");
	});

	// R6: an unregistered packageId resolves to Platinum, and the layout
	// attributes come from the same resolved package as the appearance id.
	it("agrees with data-classicy-appearance for an unregistered packageId", () => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = "nope";
			}),
		);
		const { container } = renderDesktop();
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-appearance")).toBe("platinum");
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
	});

	// R18 / F-R1: the active package is Appearance.packageId; a theme
	// authored for another package does not switch the arrangement.
	it("reads the active package, never activeTheme.package", () => {
		registerTestMirrorPackage();
		const { container } = renderDesktop();
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.activeTheme.package =
						TEST_MIRROR_PACKAGE_ID;
				}),
			),
		);
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-right");
	});

	it("lets the consumer's style override a layout variable", () => {
		const { container } = renderDesktop({
			"--classicy-layout-grow-box-corner": "top-left",
		} as CSSProperties);
		expect(
			desktopRoot(container)?.style.getPropertyValue(
				"--classicy-layout-grow-box-corner",
			),
		).toBe("top-left");
	});

	describe("menuBar.placement", () => {
		it("hides the screen bar when the active package places menus in windows", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop();
			expect(container.querySelector(".classicyDesktopMenuBar")).not.toBeNull();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull();
		});

		// G17: the screen bar is headless under window placement, so its band
		// is 0 on the root; the layout's override follows the theme's 30px,
		// and a host style still beats both.
		it("zeroes --menu-bar-height on the root under window placement", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop();
			const height = () =>
				desktopRoot(container)?.style.getPropertyValue("--menu-bar-height");
			expect(height()).toBe("30px");
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(height()).toBe("0px");
			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(height()).toBe("30px");
		});

		it("lets the host's style override --menu-bar-height under window placement", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop({
				"--menu-bar-height": "42px",
			} as CSSProperties);
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(
				desktopRoot(container)?.style.getPropertyValue("--menu-bar-height"),
			).toBe("42px");
		});

		it("renders each window's menus in the window, and back on the screen bar", () => {
			registerTestMirrorPackage();
			openApp();
			const { container } = renderDesktopWithWindow();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(
				container.querySelector(".classicyWindow .classicyWindowMenuBar"),
			).not.toBeNull();
			expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull();

			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(container.querySelector(".classicyWindowMenuBar")).toBeNull();
			expect(container.querySelector(".classicyDesktopMenuBar")).not.toBeNull();
		});

		// The window's own class keys the bar's height and the contents'
		// shrink, so a browser without :has() still fits the window together.
		it("marks a window that draws a menu bar with classicyWindowWithMenuBar", () => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow();
			const win = () => document.querySelector(".classicyWindow");
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(win()).toHaveClass("classicyWindowWithMenuBar");
			act(() =>
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: APP_ID },
					window: { id: "main" },
				}),
			);
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
		});

		// The slot's negative branches: utility windows, modals (Mac OS 8
		// movable modals have no menu bar), collapsed windows and an empty
		// appMenu get no bar.
		it.each([
			["a utility window", { windowType: "utility" as const }],
			["a modal window", { modal: true }],
			["an empty appMenu", { appMenu: [] }],
		])("draws no window menu bar for %s", (_name, windowProps) => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow(windowProps);
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(document.querySelector(".classicyWindow")).not.toBeNull();
			expect(document.querySelector(".classicyWindowMenuBar")).toBeNull();
			expect(document.querySelector(".classicyWindowWithMenuBar")).toBeNull();
		});

		it("draws no window menu bar while the window is collapsed", () => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(document.querySelector(".classicyWindowMenuBar")).not.toBeNull();
			act(() =>
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: APP_ID },
					window: { id: "main" },
				}),
			);
			expect(document.querySelector(".classicyWindowMenuBar")).toBeNull();
		});
	});
});
