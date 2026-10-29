import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

const irix: ClassicyAppearancePackage = {
	id: "irix",
	name: "IRIX",
	css: "",
	defaults: { ...getTheme("azul"), id: "irix-default", package: "irix" },
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
};

const setPackageId = (packageId: string) =>
	act(() => {
		useAppManager.setState((s) => ({
			...s,
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					Appearance: { ...s.System.Manager.Appearance, packageId },
				},
			},
		}));
	});

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop />
		</ClassicyAppManagerProvider>,
	);

const rootAppearance = () =>
	document
		.getElementById("classicyDesktop")
		?.getAttribute("data-classicy-appearance");

describe("ClassicyDesktop data-classicy-appearance", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("writes the active package id on the desktop root", () => {
		renderDesktop();
		expect(rootAppearance()).toBe("platinum");
	});

	it("follows a package switch", () => {
		registerClassicyAppearancePackage(irix);
		renderDesktop();
		expect(rootAppearance()).toBe("platinum");
		setPackageId("irix");
		expect(rootAppearance()).toBe("irix");
	});

	it("an unregistered stored id renders platinum", () => {
		renderDesktop();
		setPackageId("irix");
		expect(rootAppearance()).toBe("platinum");
	});
});
