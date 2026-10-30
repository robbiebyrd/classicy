import { act, render } from "@testing-library/react";
import { produce } from "immer";
import type { CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyAppearanceLayout,
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Importing the Platinum module registered it; keep that object so every test
// starts from the real Platinum registration (platinum.json's layout), not
// from an empty registry's CLASSICY_DEFAULT_APPEARANCE_LAYOUT fallback.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const mirror: ClassicyAppearanceLayout = {
	window: { growBoxCorner: "bottom-left" },
	menuBar: { placement: "window" },
	desktop: { iconGridOrigin: "top-left" },
};

const registerMirror = () =>
	registerClassicyAppearancePackage({
		id: "test-mirror",
		name: "Mirror",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-mirror-default",
			package: "test-mirror",
		},
		layout: mirror,
	});

const renderDesktop = (style?: CSSProperties) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false} style={style} />
		</ClassicyAppManagerProvider>,
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
		registerMirror();
		const { container } = renderDesktop();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "test-mirror",
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
		registerMirror();
		const { container } = renderDesktop();
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.activeTheme.package = "test-mirror";
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
});
