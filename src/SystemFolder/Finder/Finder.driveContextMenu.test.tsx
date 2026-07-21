import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "./Finder";

afterEach(cleanup);

describe("Finder drive icons", () => {
	it("attaches a 3-item context menu to each drive icon", async () => {
		render(<Finder />);
		await waitFor(() => {
			const driveIcon = useAppManager
				.getState()
				.System.Manager.Desktop.icons.find(
					(i) => i.kind === "drive" && i.appName === "Macintosh HD",
				);
			expect(driveIcon?.contextMenu).toBeDefined();
			expect(driveIcon?.contextMenu?.map((m) => m.event)).toEqual([
				"ClassicyDesktopDriveSetupInitialize",
				"ClassicyDesktopDriveSetupSync",
				"ClassicyDesktopDriveSetupBackup",
			]);
		});
	});
});
