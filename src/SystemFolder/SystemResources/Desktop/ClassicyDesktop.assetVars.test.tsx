import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { registerClassicyCursors } from "@/Appearance/ClassicyAssetRegistry";
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
		// Platinum's cursors register in 3.2; stand one in so the cursor half of
		// the spread is exercised here.
		registerClassicyCursors("platinum", { resizeLr: "resize-lr.png" });
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
});
