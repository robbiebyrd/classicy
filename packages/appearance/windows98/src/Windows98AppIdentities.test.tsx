import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Platinum first, as a host loads it: the default package beside Windows 98.
import "../../platinum/src/index";
import "./index";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	resolveClassicyAppIdentity,
	resolveClassicyDesktopIconIdentity,
} from "@/Appearance/ClassicyAppIdentity";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { windows98IconFile } from "./assets/windows98Assets";
import { WINDOWS98_APPS, WINDOWS98_DESKTOP_ICONS } from "./windows98Apps";

// What Windows 98 called Classicy's surfaces (docs/windows98-asset-
// inventory.md, "Apps" and "Desktop icons"), shown while it is the active
// package and only then: the bundled apps by their Windows names, the Trash
// as the Recycle Bin and the startup disk as My Computer, every record and
// analytics payload keeping its own name.

const tracked = vi.hoisted((): [string, Record<string, unknown>][] => []);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({
			track: (event: string, payload: Record<string, unknown>) => {
				tracked.push([event, payload]);
			},
			page: () => {},
		}),
	}),
);

const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

const iconRoot = (appId: string) =>
	document.getElementById(`${appId}.shortcut`) as HTMLElement;
const label = (appId: string) =>
	iconRoot(appId).querySelector("p")?.textContent;
const image = (appId: string) =>
	iconRoot(appId).querySelector<HTMLImageElement>(
		".classicyDesktopIconMask img",
	);

beforeEach(() => {
	tracked.length = 0;
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	switchPackage("windows98");
});

afterEach(() => switchPackage("platinum"));

describe("Windows 98's names", () => {
	it("registers its apps and desktopIcons, validated and frozen", () => {
		const pkg = getClassicyAppearancePackage("windows98");
		expect(pkg?.apps).toEqual(WINDOWS98_APPS);
		expect(pkg?.desktopIcons).toEqual(WINDOWS98_DESKTOP_ICONS);
		expect(Object.isFrozen(pkg?.apps)).toBe(true);
		expect(Object.isFrozen(pkg?.desktopIcons)).toBe(true);
	});

	it("shows the bundled apps by the names Windows 98 gave the same job", () => {
		const shown = (appId: string, name: string) =>
			resolveClassicyAppIdentity(appId, { name, icon: "" }, "windows98").name;
		expect(shown("Finder.app", "Finder")).toBe("Windows Explorer");
		expect(shown("SimpleText.app", "SimpleText")).toBe("Notepad");
		expect(shown("AppearanceManager.app", "Appearance Manager")).toBe(
			"Display",
		);
		expect(shown("SoundManager.app", "Sound Manager")).toBe("Sounds");
		expect(shown("DateAndTimeManager.app", "Date and Time")).toBe("Date/Time");
		expect(shown("ControlStripManager.app", "Control Strip")).toBe(
			"Taskbar & Start Menu",
		);
		expect(shown("AppleGuide.app", "Apple Guide")).toBe("Windows Help");
		expect(shown("MoviePlayer.app", "Movie Player")).toBe("Media Player");
		expect(shown("PictureViewer.app", "Picture Viewer")).toBe("Imaging");
		expect(shown("WebViewer.app", "Web Viewer")).toBe("Internet Explorer");
		// No Windows 98 counterpart: their own names.
		for (const [appId, name] of [
			["Calculator.app", "Calculator"],
			["PDFViewer.app", "PDF Viewer"],
			["HyperCard.app", "HyperCard"],
			["DriveSetup.app", "Drive Setup"],
		])
			expect(shown(appId, name), appId).toBe(name);
		// Under Platinum, every app keeps its own.
		expect(
			resolveClassicyAppIdentity(
				"Finder.app",
				{ name: "Finder", icon: "" },
				"platinum",
			).name,
		).toBe("Finder");
	});

	it("draws the Finder with Windows Explorer's icon", () =>
		expect(
			resolveClassicyAppIdentity(
				"Finder.app",
				{ name: "Finder", icon: "/finder.png" },
				"windows98",
			).icon,
		).toBe(windows98IconFile("explorer-101-32")));

	it("shows the Trash as the Recycle Bin, over the Recycle Bin's art", () => {
		const trashEmpty = resolveClassicyAsset("systemArt", "trashEmpty") ?? "";
		expect(trashEmpty).toBe(windows98IconFile("shell32-32-32"));
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon={trashEmpty}
				kind="trash"
				filePath="Trash"
				noLaunch
			/>,
		);
		expect(label("Trash")).toBe("Recycle Bin");
		expect(image("Trash")).toHaveAttribute("src", trashEmpty);
		fireEvent.click(iconRoot("Trash"));
		for (const [, payload] of tracked)
			expect(payload).toMatchObject({ appId: "Trash", appName: "Trash" });
	});

	it("shows the startup disk as My Computer, with My Computer's icon", async () => {
		render(
			<ClassicyDesktopIcon
				appId="Finder.app"
				appName="Macintosh HD"
				icon="/hd.png"
				kind="drive"
				filePath="Macintosh HD"
				startupDisk
			/>,
		);
		expect(label("Finder.app")).toBe("My Computer");
		expect(image("Finder.app")).toHaveAttribute(
			"src",
			windows98IconFile("explorer-100-32"),
		);
		fireEvent.mouseEnter(iconRoot("Finder.app"));
		expect(
			await screen.findByText(
				"Displays the contents of your computer.",
				{},
				{ timeout: 2000 },
			),
		).toBeInTheDocument();
	});

	it("keeps the Trash's and the startup disk's own names under Platinum", () => {
		switchPackage("platinum");
		const trash = { name: "Trash", icon: "/trash.png" };
		const disk = { name: "Macintosh HD", icon: "/hd.png" };
		expect(resolveClassicyDesktopIconIdentity("trash", trash)).toBe(trash);
		expect(resolveClassicyDesktopIconIdentity("startupDisk", disk)).toBe(disk);
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon="/trash.png"
				kind="trash"
				noLaunch
			/>,
		);
		expect(label("Trash")).toBe("Trash");
	});
});
