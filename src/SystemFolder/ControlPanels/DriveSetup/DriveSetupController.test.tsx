import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { DriveSetupController } from "./DriveSetupController";

afterEach(() => {
	cleanup();
	dispatch({ type: "ClassicyDesktopDriveSetupClearRequest" });
	unregisterClassicyFileSystemAdapter("ctrl-test");
	vi.restoreAllMocks();
});

describe("DriveSetupController", () => {
	it("shows the caution alert on an initialize request", async () => {
		render(<DriveSetupController />);
		dispatch({
			type: "ClassicyDesktopDriveSetupInitialize",
			drive: "Macintosh HD",
		});
		await waitFor(() =>
			expect(screen.getByText(/erase all data/i)).toBeInTheDocument(),
		);
		// The drive name appears in the alert text.
		expect(screen.getByText(/Macintosh HD/)).toBeInTheDocument();
	});

	it("runs reconcileWithAdapters on a sync request when connected", async () => {
		const spy = vi
			.spyOn(ClassicyFileSystem.prototype, "reconcileWithAdapters")
			.mockResolvedValue(false);
		registerClassicyFileSystemAdapter({ id: "ctrl-test" });
		render(<DriveSetupController />);
		dispatch({ type: "ClassicyDesktopDriveSetupSync", drive: "Macintosh HD" });
		await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
	});

	it("does not run sync when not connected", async () => {
		const spy = vi
			.spyOn(ClassicyFileSystem.prototype, "reconcileWithAdapters")
			.mockResolvedValue(false);
		render(<DriveSetupController />);
		dispatch({ type: "ClassicyDesktopDriveSetupSync", drive: "Macintosh HD" });
		// Give the effect a chance to run.
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Desktop.driveSetupRequest,
			).toBeNull(),
		);
		expect(spy).not.toHaveBeenCalled();
	});

	it("runs flushNow on a backup request when connected", async () => {
		// flushNow is an instance arrow-function field (not a prototype method —
		// see ClassicyFileSystem.ts), so it can't be prototype-spied directly.
		// It internally calls persist(), a real prototype method, so we observe
		// through that instead.
		const spy = vi
			.spyOn(ClassicyFileSystem.prototype, "persist")
			.mockImplementation(() => {});
		registerClassicyFileSystemAdapter({ id: "ctrl-test" });
		render(<DriveSetupController />);
		dispatch({
			type: "ClassicyDesktopDriveSetupBackup",
			drive: "Macintosh HD",
		});
		await waitFor(() => expect(spy).toHaveBeenCalled());
	});
});
