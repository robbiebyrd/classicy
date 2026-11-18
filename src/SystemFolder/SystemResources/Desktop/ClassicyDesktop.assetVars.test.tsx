// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import "../../../../packages/appearance/platinum/src/assets/platinumAssets";
import { registerClassicySystemArt } from "@/Appearance/ClassicyAssetRegistry";
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

	it("follows the active theme's asset variant, and back", () => {
		// A variant only this test registers; Platinum's own themes name none.
		registerClassicySystemArt(
			"platinum",
			{ windowGrip: "/variant-grip.png" },
			{ variant: "desktop-test" },
		);
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const root = document.getElementById("classicyDesktop") as HTMLElement;
		const grip = () =>
			root.style.getPropertyValue("--classicy-art-window-grip");
		const base = grip();
		expect(base).toMatch(/^url\("/);
		expect(base).not.toBe('url("/variant-grip.png")');
		const setVariant = (assetVariant: string | undefined) =>
			act(() => {
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						const theme = draft.System.Manager.Appearance.activeTheme;
						if (assetVariant === undefined) delete theme.assetVariant;
						else theme.assetVariant = assetVariant;
					}),
				);
			});
		setVariant("desktop-test");
		expect(grip()).toBe('url("/variant-grip.png")');
		setVariant(undefined);
		expect(grip()).toBe(base);
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
