// The Package toolbar (./StorybookPackages): withClassicy draws a story under
// the chosen package, registering it on first use, and gives the store the
// package too, so its hooks follow, not only its CSS.
import "@classicy/appearance-platinum";
import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { withClassicy } from "./ClassicyDecorators";

type Globals = { theme: string; appearancePackage: string };

const Story = () => <p>story</p>;

const renderStory = (
	globals: Globals,
	classicy: Record<string, unknown> = {},
) =>
	render(
		withClassicy(
			Story as never,
			{
				id: "test--story",
				viewMode: "story",
				globals,
				parameters: { classicy },
			} as never,
		) as ReactElement,
	);

// The first story under a package imports it, which a cold transform can make
// take seconds.
const findStory = () => screen.findByText("story", {}, { timeout: 20000 });

const appearance = () => useAppManager.getState().System.Manager.Appearance;

describe("Storybook Package toolbar", () => {
	it("draws a plain story under a chosen package, then gives it back", async () => {
		const { unmount } = renderStory({
			theme: "default",
			appearancePackage: "system7",
		});
		expect(await findStory()).toBeTruthy();
		expect(
			document
				.querySelector(".classicyStorybookFrame")
				?.getAttribute("data-classicy-appearance"),
		).toBe("system7");
		// The store follows too, in the package's defaults: Platinum's
		// "default" is not one of its themes.
		expect(appearance().packageId).toBe("system7");
		expect(appearance().activeTheme.id).toBe("system7");
		act(() => unmount());
		expect(appearance().packageId).toBe("platinum");
	}, 30000);

	it("applies the Theme toolbar's theme when it is the package's", async () => {
		const { unmount } = renderStory(
			{ theme: "system7-color", appearancePackage: "system7" },
			{ desktop: true, controlStrip: false },
		);
		expect(await findStory()).toBeTruthy();
		expect(
			document
				.querySelector(".classicyDesktop:not(.classicyStorybookFrame)")
				?.getAttribute("data-classicy-appearance"),
		).toBe("system7");
		expect(appearance().packageId).toBe("system7");
		expect(appearance().activeTheme.id).toBe("system7-color");
		act(() => unmount());
	}, 30000);

	it("keeps a story's own package over the toolbar's", async () => {
		const { unmount } = renderStory(
			{ theme: "default", appearancePackage: "system7" },
			{ desktop: true, controlStrip: false, appearancePackage: "platinum" },
		);
		expect(await findStory()).toBeTruthy();
		expect(appearance().packageId).toBe("platinum");
		act(() => unmount());
	}, 30000);

	it("leaves the default package's stories as they were", async () => {
		const { unmount } = renderStory({
			theme: "default",
			appearancePackage: "platinum",
		});
		expect(await findStory()).toBeTruthy();
		expect(
			document
				.querySelector(".classicyStorybookFrame")
				?.getAttribute("data-classicy-appearance"),
		).toBe("platinum");
		expect(appearance().packageId).toBe("platinum");
		act(() => unmount());
	}, 30000);
});
