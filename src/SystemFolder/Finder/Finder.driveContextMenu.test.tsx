import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { buildDriveContextMenu } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupUtils";
import { Finder } from "./Finder";

afterEach(cleanup);

const driveIcon = () =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find(
			(i) => i.kind === "drive" && i.appName === "Macintosh HD",
		);

describe("Finder drive icons", () => {
	it("attaches a 3-item context menu to each drive icon", async () => {
		render(<Finder />);
		await waitFor(() => {
			expect(driveIcon()?.contextMenu).toBeDefined();
			expect(driveIcon()?.contextMenu?.map((m) => m.event)).toEqual([
				"ClassicyDesktopDriveSetupInitialize",
				"ClassicyDesktopDriveSetupSync",
				"ClassicyDesktopDriveSetupBackup",
			]);
		});
		expect(driveIcon()?.contextMenu?.some((m) => m.isDefault)).toBe(false);
	});

	// The remaining chapters' audit's 5.23 (WIG Ch.5 "Default Operations and
	// Shortcut Techniques", p.45): under Explorer's commands a drive's menu
	// leads with Open, its default, which opens its window (an event, as the
	// stored menu's items are).
	it("leads with Open, the default, under Explorer's commands", async () => {
		const restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		try {
			render(<Finder />);
			await waitFor(() =>
				expect(driveIcon()?.contextMenu?.[0]).toMatchObject({
					title: "Open",
					accessKey: "o",
					isDefault: true,
					event: "ClassicyAppFinderOpenFolder",
					eventData: { path: "Macintosh HD" },
				}),
			);
			expect(
				driveIcon()?.contextMenu?.map((m) =>
					m.id === "spacer" ? "—" : m.title,
				),
			).toEqual(["Open", "—", "Initialize…", "Sync", "Backup"]);
		} finally {
			restore();
		}
	});

	it("builds Open first only when asked", () => {
		expect(buildDriveContextMenu("Disk", false)[0].title).toBe("Initialize…");
		const open = buildDriveContextMenu("Disk", false, { open: true });
		expect(open[0]).toMatchObject({ title: "Open", isDefault: true });
		expect(open[0].accessKey).toBeUndefined();
	});
});
