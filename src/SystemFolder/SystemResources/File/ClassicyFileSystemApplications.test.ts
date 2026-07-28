import { describe, expect, it } from "vitest";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	buildApplicationsFolder,
	withApplicationsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

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

	it("includes a hidden app_shortcut icon (Applications membership is independent of desktop visibility)", () => {
		const folder = buildApplicationsFolder([
			{ ...appIcon("DriveSetup.app", "Drive Setup"), hidden: true },
		]);

		expect(folder["Drive Setup"]).toEqual({
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_icon: "/icons/DriveSetup.app.png",
			_creator: "DriveSetup.app",
			_readOnly: true,
			_nameLocked: true,
		});
	});
});

describe("Applications folder opt-out", () => {
	// Mirrors what production passes in (ClassicyFileSystem.fs): a root entry
	// whose children are drives.
	const driveTree = (): ClassicyFileSystemEntry => ({
		_type: ClassicyFileSystemEntryFileType.Directory,
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			_icon: "/icons/hd.png",
		},
	});

	it("excludes an app_shortcut icon with inApplications: false", () => {
		const folder = buildApplicationsFolder([
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(folder.TV).toBeDefined();
		expect(folder.Secret).toBeUndefined();
	});

	it("includes icons where inApplications is undefined", () => {
		const folder = buildApplicationsFolder([appIcon("TV.app", "TV")]);
		expect(folder.TV).toBeDefined();
	});

	it("leaves the tree untouched when every app_shortcut opts out", () => {
		const tree = driveTree();
		const result = withApplicationsFolder(tree, [
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result).toBe(tree);
	});

	it("still merges Applications when at least one app opts in", () => {
		const result = withApplicationsFolder(driveTree(), [
			appIcon("TV.app", "TV"),
			{ ...appIcon("Secret.app", "Secret"), inApplications: false },
		]);

		expect(result["Macintosh HD"].Applications.TV).toBeDefined();
		expect(result["Macintosh HD"].Applications.Secret).toBeUndefined();
	});
});
