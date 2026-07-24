import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

describe("ClassicyDesktopMenuBar — extensions region", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("renders the extensions region as a portal target", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(
			container.querySelector("#classicyDesktopMenuExtensions"),
		).toBeTruthy();
	});

	it("still renders the clock and sound widgets", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		expect(container.querySelector(".classicyDesktopMenuTime")).toBeTruthy();
		expect(
			container.querySelector(".classicyDesktopMenuWidgetSound"),
		).toBeTruthy();
	});
});
