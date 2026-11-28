// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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

	it("passes userName and onLogOff to the desktop's Windows shell", () => {
		registerTestTaskbarPackage();
		try {
			act(() =>
				useAppManager.setState(
					produce(useAppManager.getState(), (draft) => {
						draft.System.Manager.Appearance.packageId = TEST_TASKBAR_PACKAGE_ID;
					}),
				),
			);
			const onLogOff = vi.fn();
			render(
				<Classicy startupScreen={false} userName="Ada" onLogOff={onLogOff} />,
			);
			act(() =>
				dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: "logOff" }),
			);
			const yes = Array.from(
				document.querySelectorAll(".classicyShellDialogLogOff button"),
			).find((b) => b.textContent === "Yes") as HTMLButtonElement;
			fireEvent.click(yes);
			expect(onLogOff).toHaveBeenCalledOnce();
		} finally {
			unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		}
	});
});
