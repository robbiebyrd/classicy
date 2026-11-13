// The derived folders, the Control Strip module files and Finder's drive
// icon on the desktop under System 7 (story 0193-801, plan 0018-dbd 6.5).
// They hold the core's icon URLs, as every stored file system entry does,
// and draw the active package's and theme variant's icon for each URL's key
// (`resolveClassicyIconImage`): System 7's 1-bit art under "System 7", its
// color art under "System 7 Color", the core's under Platinum.
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Platinum first, as a host loads it: the core default package beside System 7.
import "../../platinum/src/index";
import "./index";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundControlStripModule";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";

const HD = "Macintosh HD";
const SYSTEM_FOLDER = `${HD}:System Folder`;
const APPLICATIONS = `${HD}:Applications`;
const MODULES = `${SYSTEM_FOLDER}:Control Strip Modules`;
const LARGE = {
	arrangement: "none",
	keepArrangedBy: "name",
	iconSize: "large",
} as const;

const usePackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});
const useTheme = (activeTheme: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme });
	});

/** The image the active theme draws for an icon key (32 px). */
const drawn = (key: string) => resolveClassicyAsset("icons", key) as string;

const view: { fs?: ClassicyFileSystem } = {};

const FolderViews = () => {
	const fs = useClassicyFileSystem();
	view.fs = fs;
	return (
		<>
			{[HD, APPLICATIONS, SYSTEM_FOLDER, MODULES].map((path) => (
				<div key={path} data-folder={path}>
					<ClassicyFileBrowserViewIcons
						fs={fs}
						path={path}
						appId="Finder.app"
						iconViewOptions={LARGE}
					/>
				</div>
			))}
		</>
	);
};

/** Finder's drive icon, drawn from its desktop record as the desktop does. */
const DriveIcon = () => {
	const record = useAppManager((s) =>
		s.System.Manager.Desktop.icons.find(
			(i) => i.kind === "drive" && i.appName === HD,
		),
	);
	if (!record) return null;
	return (
		<div data-testid="drive">
			<ClassicyDesktopIcon
				appId={record.appId}
				appName={record.appName}
				icon={record.icon}
				kind={record.kind}
				filePath={record.filePath}
				noLaunch
			/>
		</div>
	);
};

const imageIn = (folder: string, name: string): string | null =>
	document
		.querySelector(`[data-folder="${folder}"]`)
		?.querySelector(`img[alt="${name}"]`)
		?.getAttribute("src") ?? null;

const driveImage = (): string | null =>
	document.querySelector('[data-testid="drive"] img')?.getAttribute("src") ??
	null;

const renderAll = async () => {
	render(
		<ClassicyAppManagerProvider>
			<Finder />
			{/* An app shortcut, so the derived Applications folder is built. */}
			<ClassicyApp
				id="IconTest.app"
				name="Icon Test"
				icon={ClassicyIcons.system.files.application}
			/>
			<FolderViews />
			<DriveIcon />
		</ClassicyAppManagerProvider>,
	);
	await waitFor(() => expect(driveImage()).not.toBeNull());
};

/** Every icon this story covers, as drawn. */
const shown = () => ({
	applications: imageIn(HD, "Applications"),
	app: imageIn(APPLICATIONS, "Icon Test"),
	documents: imageIn(HD, "Documents"),
	extensions: imageIn(SYSTEM_FOLDER, "Extensions"),
	modules: imageIn(SYSTEM_FOLDER, "Control Strip Modules"),
	sound: imageIn(MODULES, "Sound"),
	drive: driveImage(),
});

/** The same icons as the active theme draws their keys. */
const expected = () => ({
	applications: drawn("system.folders.applications"),
	app: drawn("system.files.application"),
	documents: drawn("system.folders.directory"),
	extensions: drawn("system.folders.extensions"),
	modules: drawn("system.folders.controlStrip"),
	sound: drawn("controlPanels.soundManager.app"),
	drive: drawn("system.drives.disk"),
});

const core = {
	applications: ClassicyIcons.system.folders.applications,
	app: ClassicyIcons.system.files.application,
	documents: ClassicyIcons.system.folders.directory,
	extensions: ClassicyIcons.system.folders.extensions,
	modules: ClassicyIcons.system.folders.controlStrip,
	sound: ClassicyIcons.controlPanels.soundManager.app,
	drive: ClassicyIcons.system.drives.disk,
};

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	cleanup();
	usePackage("platinum");
});

describe("file system icons under System 7", () => {
	it("draw System 7's 1-bit art, its color art, and the core's under Platinum", async () => {
		await renderAll();
		// The entries hold the core's URLs.
		const fs = view.fs as ClassicyFileSystem;
		expect(fs.resolve(`${HD}:Applications`)._icon).toBe(core.applications);
		expect(fs.resolve(`${MODULES}:Sound`)._icon).toBe(core.sound);
		expect(shown()).toEqual(core);

		usePackage("system7");
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.id,
		).toBe("system7");
		const bw = expected();
		for (const key of Object.keys(core) as (keyof typeof core)[])
			expect(bw[key], key).not.toBe(core[key]);
		expect(shown()).toEqual(bw);

		// Same package, other variant: the art follows the theme.
		useTheme("system7-color");
		const color = expected();
		for (const key of Object.keys(core) as (keyof typeof core)[]) {
			expect(color[key], key).not.toBe(core[key]);
			expect(color[key], key).not.toBe(bw[key]);
		}
		expect(shown()).toEqual(color);

		useTheme("system7");
		expect(shown()).toEqual(bw);

		usePackage("platinum");
		expect(shown()).toEqual(core);
		// Still the core's URLs: nothing stored followed the switches.
		expect(fs.resolve(`${HD}:Applications`)._icon).toBe(core.applications);
		expect(
			useAppManager
				.getState()
				.System.Manager.Desktop.icons.find((i) => i.kind === "drive")?.icon,
		).toBe(core.drive);
	});

	it("persist the same bytes under every package and theme", async () => {
		await renderAll();
		const fs = () => view.fs as ClassicyFileSystem;
		act(() => {
			fs().mkDir(`${HD}:Documents:Before`);
		});
		fs().flushNow();
		const before = localStorage.getItem("classicyStorage");
		const hash = fs().buildSnapshot().hash;

		usePackage("system7");
		useTheme("system7-color");
		expect(fs().buildSnapshot().hash).toBe(hash);
		fs().flushNow();
		expect(localStorage.getItem("classicyStorage")).toBe(before);
	});
});
