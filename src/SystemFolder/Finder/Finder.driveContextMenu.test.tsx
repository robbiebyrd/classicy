import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { buildDriveContextMenu } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
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
			).toEqual([
				"Open",
				"—",
				"Initialize…",
				"Sync",
				"Backup",
				"—",
				"Create Shortcut",
				"—",
				"Properties",
			]);
			// Properties, last (2.2), a stored event for the drive's sheet.
			expect(driveIcon()?.contextMenu?.at(-1)).toEqual(
				expect.objectContaining({
					accessKey: "r",
					event: "ClassicyAppFinderPropertiesOpen",
					eventData: { paths: ["Macintosh HD"] },
				}),
			);
		} finally {
			restore();
		}
	});

	it("builds Properties last only when asked", () => {
		expect(
			buildDriveContextMenu("Disk", false).some(
				(m) => m.title === "Properties",
			),
		).toBe(false);
		const menu = buildDriveContextMenu("Disk", false, {
			properties: true,
			propertiesAccessKey: "r",
		});
		expect(menu.slice(-2)).toEqual([
			{ id: "spacer" },
			{
				id: "drive_Disk_properties",
				title: "Properties",
				accessKey: "r",
				event: "ClassicyAppFinderPropertiesOpen",
				eventData: { paths: ["Disk"] },
			},
		]);
	});

	it("builds Open first only when asked", () => {
		expect(buildDriveContextMenu("Disk", false)[0].title).toBe("Initialize…");
		const open = buildDriveContextMenu("Disk", false, { open: true });
		expect(open[0]).toMatchObject({ title: "Open", isDefault: true });
		expect(open[0].accessKey).toBeUndefined();
	});

	it("builds Create Shortcut last only when asked, as Finder's offer of the desktop", () => {
		expect(
			buildDriveContextMenu("Disk", false).some(
				(m) => m.title === "Create Shortcut",
			),
		).toBe(false);
		const menu = buildDriveContextMenu("Disk", false, {
			createShortcut: true,
			createShortcutAccessKey: "S",
		});
		expect(menu.at(-2)?.id).toBe("spacer");
		expect(menu.at(-1)).toMatchObject({
			title: "Create Shortcut",
			accessKey: "S",
			event: "ClassicyAppFinderOfferDesktopShortcut",
			eventData: { paths: ["Disk"] },
		});
	});

	// The remaining chapters' audit's 10.6 (Windows 98 SE, shell32.dll): a
	// drive lies where no shortcut may be made, so its Create Shortcut asks
	// "Windows cannot create a shortcut here. Do you want the shortcut to be
	// placed on the desktop instead?", and Yes makes it there.
	it("offers the drive's shortcut on the desktop, and Yes makes it", async () => {
		const restore = activateTestWindowsKeysPackage();
		try {
			const fs = new ClassicyFileSystem();
			render(<Finder />);
			const item = await waitFor(() => {
				const found = driveIcon()?.contextMenu?.find(
					(m) => m.title === "Create Shortcut",
				);
				expect(found).toBeDefined();
				return found;
			});
			act(() => dispatch({ type: item?.event as string, ...item?.eventData }));
			expect(
				await screen.findByText(/Windows cannot create a shortcut here\./),
			).toBeTruthy();
			fireEvent.click(screen.getByRole("button", { name: "Yes" }));
			const made = "Macintosh HD:Desktop Folder:Shortcut to Macintosh HD";
			await waitFor(() =>
				expect(fs.resolve(made)?._targetPath).toBe("Macintosh HD"),
			);
			expect(fs.resolve(made)?._icon).toBe(fs.resolve("Macintosh HD")._icon);
		} finally {
			restore();
		}
	});

	it("gives the Trash icon Create Shortcut under Explorer's commands only", async () => {
		const trashMenu = () =>
			useAppManager
				.getState()
				.System.Manager.Desktop.icons.find((i) => i.kind === "trash")
				?.contextMenu;
		render(<Finder />);
		await waitFor(() => expect(trashMenu()).toBeDefined());
		expect(trashMenu()?.some((m) => m.title === "Create Shortcut")).toBe(false);
		expect(trashMenu()?.some((m) => m.title === "Properties")).toBe(false);
		cleanup();
		const restore = activateTestWindowsKeysPackage();
		try {
			render(<Finder />);
			await waitFor(() =>
				expect(trashMenu()?.at(-1)?.title).toBe("Properties"),
			);
			// Explorer's Recycle Bin menu: Create Shortcut, then Properties
			// after a separator (2.2), which opens the Trash's sheet.
			expect(trashMenu()?.at(-2)).toEqual({ id: "spacer" });
			act(() => trashMenu()?.at(-1)?.onClickFunc?.());
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						"Finder.app"
					]?.data as { properties?: unknown }
				)?.properties,
			).toEqual([{ key: "Trash", paths: ["Trash"] }]);
			act(() =>
				dispatch({ type: "ClassicyAppFinderPropertiesClose", key: "Trash" }),
			);
			const createShortcut = trashMenu()?.find(
				(m) => m.title === "Create Shortcut",
			);
			act(() => createShortcut?.onClickFunc?.());
			expect(
				(
					useAppManager.getState().System.Manager.Applications.apps[
						"Finder.app"
					]?.data as { desktopShortcutOffer?: unknown }
				)?.desktopShortcutOffer,
			).toEqual({ paths: ["Trash"] });
			act(() =>
				dispatch({ type: "ClassicyAppFinderOfferDesktopShortcutClose" }),
			);
		} finally {
			restore();
		}
	});
});
