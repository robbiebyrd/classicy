import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDriveSetup } from "./ClassicyDriveSetup";

const APP_ID = "DriveSetup.app";

function renderOpen() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: APP_ID, name: "Drive Setup", icon: "" },
	});
	return render(<ClassicyDriveSetup />);
}

afterEach(() => {
	cleanup();
	dispatch({ type: "ClassicyAppClose", app: { id: APP_ID } });
	dispatch({ type: "ClassicyDesktopDriveSetupClearRequest" });
});

describe("ClassicyDriveSetup", () => {
	it("lists the default drive and disables Initialize until a row is selected", () => {
		renderOpen();
		expect(screen.getByText("Macintosh HD")).toBeInTheDocument();
		const initialize = screen.getByRole("button", { name: /Initialize/ });
		expect(initialize).toBeDisabled();
	});

	it("selecting a drive then clicking Initialize opens the caution dialog", () => {
		renderOpen();
		fireEvent.click(screen.getByText("Macintosh HD"));
		const initialize = screen.getByRole("button", { name: /Initialize/ });
		expect(initialize).toBeEnabled();
		fireEvent.click(initialize);
		// The mounted DriveSetupController consumes the request and opens the
		// caution alert synchronously (it clears driveSetupRequest, so assert on
		// the dialog, not the store field).
		expect(screen.getByText(/erase all data/i)).toBeInTheDocument();
	});

	it("disables Sync and Backup when not connected", () => {
		renderOpen();
		expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Backup" })).toBeDisabled();
	});
});
