// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, cleanup, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop menu-bar fallback", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("restores the desktop menu bar (with Special) when focus lands on Finder with no open windows", () => {
		// Simulate the state left immediately after an app quits: Finder is the
		// focused successor but has no windows, and Desktop.appMenu still holds the
		// dead app's menu. The bar should fall back to the desktop default menu.
		useAppManager.setState((s) => ({
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					Desktop: {
						...s.System.Manager.Desktop,
						appMenu: [{ id: "stale_quit_menu", title: "StaleQuitMenu" }],
					},
				},
			},
		}));

		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

		expect(screen.getByText("Special")).toBeInTheDocument();
		expect(screen.queryByText("StaleQuitMenu")).not.toBeInTheDocument();
	});
});

// Plan 0020-w98 §5, "Minimize": under `window.collapse: "minimize"` a
// minimized Finder window is off the screen, so the desktop takes the bar
// back (its menus are the ones keyboard equivalents reach under the shell's
// headless screen bar); under every other package a shaded Finder window
// still holds it, as always.
describe("ClassicyDesktop menu-bar fallback with only collapsed Finder windows", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	afterEach(() => {
		cleanup();
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	// Finder focused, no window focused, one Finder window record open and
	// `collapsed`, and the bar still holding a quit app's menu.
	const seed = (collapsed: boolean) =>
		useAppManager.setState((s) =>
			produce(s, (draft) => {
				const finder = draft.System.Manager.Applications.apps["Finder.app"];
				finder.windows = {
					seeded: {
						id: "seeded",
						closed: false,
						collapsed,
						focused: false,
						size: [300, 200],
						position: [40, 40],
						minimumSize: [0, 0],
					},
				};
				draft.System.Manager.Applications.focusedAppId = "Finder.app";
				draft.System.Manager.Desktop.appMenu = [
					{ id: "stale_quit_menu", title: "StaleQuitMenu" },
				];
			}),
		);

	const menuIds = () =>
		(useAppManager.getState().System.Manager.Desktop.appMenu ?? []).map(
			(item) => item.id,
		);

	const renderDesktop = () =>
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

	it("under the default layout, a shaded Finder window keeps the bar", () => {
		seed(true);
		renderDesktop();
		expect(menuIds()).toEqual(["stale_quit_menu"]);
		expect(screen.getByText("StaleQuitMenu")).toBeInTheDocument();
	});

	it("under minimize, the desktop's menus come back with only minimized Finder windows", () => {
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
		seed(true);
		renderDesktop();
		expect(menuIds()).toContain("finder_special");
		expect(menuIds()).not.toContain("stale_quit_menu");
	});

	it("under minimize, a Finder window on screen keeps the bar", () => {
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
		seed(false);
		renderDesktop();
		expect(menuIds()).toEqual(["stale_quit_menu"]);
	});
});
