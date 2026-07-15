import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop contextual menu scoping", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("shows defaultMenuItems when right-clicking the empty desktop", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		fireEvent.contextMenu(desktop);
		// "Special" is a stable defaultMenuItems entry
		expect(screen.getByText("Special")).toBeInTheDocument();
	});

	it("does NOT show defaultMenuItems when right-clicking a child element", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<span>desktop child</span>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		fireEvent.contextMenu(screen.getByText("desktop child"));
		expect(screen.queryByText("Special")).not.toBeInTheDocument();
	});

	it("does not open a menu when the event was already claimed (defaultPrevented)", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span onContextMenu={(e) => e.preventDefault()}>opt-out child</span>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		fireEvent.contextMenu(screen.getByText("opt-out child"));
		expect(screen.queryByText("Special")).not.toBeInTheDocument();
	});
});
