import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import "@/Appearance/Platinum/assets/platinumAssets";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop asset variables", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("spreads the asset variables onto the desktop root beside the theme vars", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const root = document.getElementById("classicyDesktop") as HTMLElement;
		expect(root.style.getPropertyValue("--classicy-art-window-grip")).toMatch(
			/^url\("/,
		);
		expect(root.style.getPropertyValue("--classicy-cursor-resize-lr")).toMatch(
			/^url\("/,
		);
		expect(root.style.getPropertyValue("--color-system-01")).not.toBe("");
	});

	it("defines every cursor variable the stylesheets read, on the desktop root", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const root = document.getElementById("classicyDesktop") as HTMLElement;
		for (const name of [
			"resize-lr",
			"resize-ud",
			"resize-u",
			"resize-d",
			"resize-l",
			"resize-r",
			"hand",
		]) {
			expect(root.style.getPropertyValue(`--classicy-cursor-${name}`)).toMatch(
				/^url\("/,
			);
		}
	});
});
