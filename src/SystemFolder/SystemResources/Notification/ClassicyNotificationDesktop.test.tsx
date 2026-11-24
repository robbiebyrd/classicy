// The core registers no Appearance Package: this test draws Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyBootScreenActive } from "@/SystemFolder/SystemResources/Boot/ClassicyBootScreenActive";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";
import { classicyNotify } from "./ClassicyNotificationManager";
import { resetClassicyNotificationsForTests } from "./ClassicyNotificationStore.internal";

// Review M7: the desktop itself presents notifications (ClassicyDesktop
// mounts the controller); without its mount line this fails.

describe("ClassicyDesktop presents notifications", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => {
		act(() => resetClassicyNotificationsForTests());
		cleanup();
	});

	it("shows a request's alert, and answers it after OK", () => {
		render(<Classicy startupScreen={false} controlStrip={false} />);
		const onResponse = vi.fn();
		let id = "";
		act(() => {
			id = classicyNotify({
				appId: "Finder.app",
				message: "Copy complete.",
				onResponse,
			});
		});
		expect(screen.getByRole("alertdialog")).toHaveAttribute(
			"aria-label",
			"Copy complete.",
		);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	// A host's own boot screen that says it covers the desktop holds
	// notifications as Classicy's own startup screen does (and as it holds a
	// theme link's alerts): one hold, `useClassicyBootScreenActive`.
	it("waits for a host's own boot screen that calls useClassicyBootScreenActive", () => {
		let finishBoot = () => {};
		const HostBootScreen = () => {
			const [visible, setVisible] = useState(true);
			finishBoot = () => setVisible(false);
			useClassicyBootScreenActive(visible);
			return visible ? <div data-testid="host-boot">Starting up…</div> : null;
		};
		render(<Classicy controlStrip={false} bootScreen={<HostBootScreen />} />);
		expect(screen.getByTestId("host-boot")).toBeInTheDocument();
		const onResponse = vi.fn();
		act(() => {
			classicyNotify({
				appId: "Finder.app",
				message: "Copy complete.",
				onResponse,
			});
		});
		expect(screen.queryByRole("alertdialog")).toBeNull();
		act(() => finishBoot());
		expect(screen.queryByTestId("host-boot")).toBeNull();
		expect(screen.getByRole("alertdialog")).toHaveAttribute(
			"aria-label",
			"Copy complete.",
		);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledTimes(1);
	});
});
