// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";

const iconFor = (appId: string) =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === appId);

describe("Classicy", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(cleanup);

	it("draws the desktop with its children, in one tag", () => {
		const { container } = render(
			<Classicy startupScreen={false} controlStrip={false}>
				<p>my app</p>
			</Classicy>,
		);
		const desktop = container.querySelector("#classicyDesktop");
		expect(desktop).not.toBeNull();
		expect(desktop?.contains(screen.getByText("my app"))).toBe(true);
	});

	it("passes the provider's props to the provider", () => {
		render(
			<Classicy startupScreen={false} controlStrip={false} disableSimpleText />,
		);
		expect(iconFor("SimpleText.app")).toBeUndefined();
		expect(iconFor("PDFViewer.app")).toBeDefined();
	});

	it("passes the desktop's props to the desktop", () => {
		const { container } = render(
			<Classicy
				startupScreen={false}
				className="host"
				style={{ marginTop: 7 }}
			/>,
		);
		const desktop = container.querySelector<HTMLElement>("#classicyDesktop");
		expect(desktop?.classList.contains("host")).toBe(true);
		expect(desktop?.style.marginTop).toBe("7px");
		expect(container.querySelector(".classicyControlStrip")).not.toBeNull();
	});
});
