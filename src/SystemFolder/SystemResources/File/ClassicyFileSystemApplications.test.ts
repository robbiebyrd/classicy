import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { buildApplicationsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const appIcon = (
	appId: string,
	appName: string,
	kind = "app_shortcut",
): ClassicyStoreSystemDesktopManagerIcon => ({
	appId,
	appName,
	icon: `/icons/${appId}.png`,
	kind,
});

describe("buildApplicationsFolder", () => {
	it("builds an AppShortcut entry per app_shortcut icon", () => {
		const folder = buildApplicationsFolder([
			appIcon("TV.app", "TV"),
			appIcon("News.app", "News"),
		]);

		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(folder._icon).toBe(ClassicyIcons.system.folders.applications);
		expect(folder._readOnly).toBe(true);
		expect(folder.TV).toEqual({
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: "/icons/TV.app.png",
			_creator: "TV.app",
			_readOnly: true,
			_nameLocked: true,
		});
		expect(folder.News._creator).toBe("News.app");
	});

	it("excludes icons of other kinds (drives, trash)", () => {
		const folder = buildApplicationsFolder([
			appIcon("Finder.app", "Macintosh HD", "drive"),
			appIcon("Finder.app", "Trash", "trash"),
			appIcon("TV.app", "TV"),
		]);

		expect(folder["Macintosh HD"]).toBeUndefined();
		expect(folder.Trash).toBeUndefined();
		expect(folder.TV).toBeDefined();
	});

	it("returns an empty directory when no app_shortcut icons exist", () => {
		const folder = buildApplicationsFolder([]);
		expect(folder._type).toBe(ClassicyFileSystemEntryFileType.Directory);
		expect(Object.keys(folder).filter((k) => !k.startsWith("_"))).toHaveLength(
			0,
		);
	});
});
