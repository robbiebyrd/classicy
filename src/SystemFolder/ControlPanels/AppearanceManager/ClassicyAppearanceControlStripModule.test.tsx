import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import "@/__tests__/withPlatinum";
import {
	act,
	fireEvent,
	renderWithProviders,
	screen,
	waitFor,
} from "@/__tests__/test-utils";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyControlStrip } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import { CLASSICY_CONTROL_STRIP_MODULE_IDS } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceControlStripModule";

const OTHER_PACKAGE: ClassicyAppearancePackage = {
	id: "strip-test-pack",
	name: "Strip Test Pack",
	css: "",
	defaults: {
		...getTheme("default"),
		id: "strip-test-default",
		name: "Strip Test Default",
		package: "strip-test-pack",
	},
	presets: [],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
	options: z.looseObject({}),
};

/** Only the Appearance module: the other built-ins are host-disabled. */
const renderStrip = () =>
	renderWithProviders(
		<ClassicyControlStrip
			disabledModules={Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS).filter(
				(id) => id !== CLASSICY_CONTROL_STRIP_MODULE_IDS.appearance,
			)}
		/>,
	);

const moduleButton = () => screen.queryByRole("button", { name: "Appearance" });

/** Click a menu item and let its flash finish, which runs its action. */
const choose = (name: string, id: string) => {
	fireEvent.click(screen.getByRole("menuitemcheckbox", { name }));
	dispatchAnimationEnd(document.getElementById(id));
};

const appearance = () => useAppManager.getState().System.Manager.Appearance;

let unmountPanel = () => {};
const mountPanel = () => {
	unmountPanel = markClassicyAppMounted(APPEARANCE_MANAGER_APP_ID);
};

afterEach(() => {
	unmountPanel();
	unmountPanel = () => {};
	unregisterClassicyAppearancePackage(OTHER_PACKAGE.id);
});

describe("Appearance Control Strip module", () => {
	it("shows while the Appearance control panel is mounted", () => {
		renderStrip();
		expect(moduleButton()).toBeNull();
		act(() => mountPanel());
		expect(moduleButton()?.querySelector("img")).toHaveAttribute(
			"src",
			ClassicyIcons.system.controlStrip.appearance,
		);
	});

	it("lists the package's themes, the active one checked, and switches theme", async () => {
		mountPanel();
		renderStrip();
		fireEvent.click(moduleButton() as HTMLElement);
		expect(
			screen.getByRole("menuitem", { name: "Platinum Themes" }),
		).toHaveClass("classicyControlStripStatus");
		// One package installed: nothing to switch to, so no package section.
		expect(screen.queryByRole("menuitem", { name: "Appearance" })).toBeNull();
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Default" }),
		).toHaveAttribute("aria-checked", "true");
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Azul" }),
		).toHaveAttribute("aria-checked", "false");
		expect(
			screen.getByRole("menuitem", {
				name: "Open Appearance Manager Control Panel",
			}),
		).toBeInTheDocument();
		choose("Azul", "appearance-theme-azul");
		await waitFor(() => expect(appearance().activeTheme.id).toBe("azul"));
	});

	it("switches package when another is installed", async () => {
		registerClassicyAppearancePackage(OTHER_PACKAGE);
		mountPanel();
		renderStrip();
		fireEvent.click(moduleButton() as HTMLElement);
		expect(screen.getByRole("menuitem", { name: "Appearance" })).toHaveClass(
			"classicyControlStripStatus",
		);
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Platinum" }),
		).toHaveAttribute("aria-checked", "true");
		choose("Strip Test Pack", `appearance-package-${OTHER_PACKAGE.id}`);
		await waitFor(() => expect(appearance().packageId).toBe(OTHER_PACKAGE.id));
	});

	it("opens the Appearance control panel", () => {
		mountPanel();
		renderStrip();
		fireEvent.click(moduleButton() as HTMLElement);
		const open = screen.getByRole("menuitem", {
			name: "Open Appearance Manager Control Panel",
		});
		fireEvent.click(open);
		dispatchAnimationEnd(
			document.getElementById(`open-${APPEARANCE_MANAGER_APP_ID}`),
		);
		return waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Applications.apps[
					APPEARANCE_MANAGER_APP_ID
				]?.open,
			).toBe(true),
		);
	});
});
