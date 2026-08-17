import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemSnapshot,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DriveSetupController } from "./DriveSetupController";

afterEach(() => {
	cleanup();
	dispatch({ type: "ClassicyDesktopDriveSetupClearRequest" });
	unregisterClassicyFileSystemAdapter("ctrl-test");
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const MARKER = "User Stuff.txt";

/**
 * Seed the default storage key with a tree carrying MARKER inside the drive, so
 * an erase is observable (the default tree has no such file) and a rollback is
 * too. The controller's fs is built by useClassicyFileSystem and seeds from
 * localStorage, so this is the only handle a test has on its starting tree.
 */
function seedUserTree(): void {
	localStorage.setItem(
		"classicyStorage",
		JSON.stringify({
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				[MARKER]: {
					_type: ClassicyFileSystemEntryFileType.TextFile,
					_data: "do not lose me",
				},
			},
		}),
	);
}

const persistedTree = () => localStorage.getItem("classicyStorage") ?? "";

/** Render, request an initialize, and click through the caution alert. */
async function initializeDrive(): Promise<void> {
	render(<DriveSetupController />);
	dispatch({
		type: "ClassicyDesktopDriveSetupInitialize",
		drive: "Macintosh HD",
	});
	await waitFor(() =>
		expect(screen.getByText(/erase all data/i)).toBeInTheDocument(),
	);
	await userEvent.click(screen.getByRole("button", { name: "Initialize" }));
}

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

	it("shows a 'not connected' alert when sync/backup is requested while disconnected", async () => {
		render(<DriveSetupController />);
		dispatch({
			type: "ClassicyDesktopDriveSetupBackup",
			drive: "Macintosh HD",
		});
		await waitFor(() =>
			expect(screen.getByText(/not connected/i)).toBeInTheDocument(),
		);
		expect(screen.getByText(/no server is configured/i)).toBeInTheDocument();
	});

	it("waits for the server push to land before reloading on initialize", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		seedUserTree();
		let release!: () => void;
		const inFlight = new Promise<void>((resolve) => {
			release = resolve;
		});
		const pushed: ClassicyFileSystemSnapshot[] = [];
		registerClassicyFileSystemAdapter({
			id: "ctrl-test",
			onSnapshot: (snapshot) => {
				pushed.push(snapshot);
				return inFlight;
			},
		});

		await initializeDrive();

		// The erased tree has been handed to the adapter but the push has not
		// landed — reloading here is what aborts it mid-flight.
		await waitFor(() => expect(pushed.length).toBeGreaterThan(0));
		expect(reload).not.toHaveBeenCalled();

		release();
		await waitFor(() => expect(reload).toHaveBeenCalled());
	});

	it("restores the pre-initialize tree and does not reload when the push fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		seedUserTree();
		const pushed: ClassicyFileSystemSnapshot[] = [];
		registerClassicyFileSystemAdapter({
			id: "ctrl-test",
			onSnapshot: (snapshot) => {
				pushed.push(snapshot);
				return Promise.reject(new Error("directus down"));
			},
		});

		await initializeDrive();

		await waitFor(() =>
			expect(screen.getByText(/could not initialize/i)).toBeInTheDocument(),
		);
		expect(reload).not.toHaveBeenCalled();
		// The erase really happened before it was rolled back...
		expect(JSON.stringify(pushed[0].tree)).not.toContain(MARKER);
		// ...and the user's files are back on disk.
		expect(persistedTree()).toContain(MARKER);
	});

	it("reloads on initialize when no server is connected", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		seedUserTree();

		await initializeDrive();

		// Anonymous users are localStorage-only: nothing to await, nothing to fail.
		await waitFor(() => expect(reload).toHaveBeenCalled());
		expect(persistedTree()).not.toContain(MARKER);
	});

	it("reports a failed backup instead of claiming success", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		registerClassicyFileSystemAdapter({
			id: "ctrl-test",
			onSnapshot: () => Promise.reject(new Error("directus down")),
		});
		render(<DriveSetupController />);
		dispatch({
			type: "ClassicyDesktopDriveSetupBackup",
			drive: "Macintosh HD",
		});

		await waitFor(() =>
			expect(screen.getByText(/backup failed/i)).toBeInTheDocument(),
		);
		expect(screen.queryByText(/backup complete/i)).not.toBeInTheDocument();
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
