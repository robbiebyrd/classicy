// The core registers no Appearance Package: these tests draw Platinum.
import "../index";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicySystemArt,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import "./platinumAssets";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { flushClassicyFileSystemPendingForStorageKey } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import {
	ensureClassicyTrash,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { ClassicyHelpButton } from "@/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton";

// Every consumer of system art reads the registry at render or call time, so a
// host's registerClassicySystemArt must show — including one made after mount.
const PLATINUM = "platinum";
const original = (key: Parameters<typeof resolveClassicyAsset>[1]) =>
	resolveClassicyAsset("systemArt", key) as string;
const platinumArt = {
	appleMenu: original("appleMenu"),
	helpButton: original("helpButton"),
	sadMac: original("sadMac"),
	windowGrip: original("windowGrip"),
	trashFull: original("trashFull"),
	aboutLogo: original("aboutLogo"),
	trashEmpty: original("trashEmpty"),
};

describe("system art consumers read the registry", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		registerClassicySystemArt(PLATINUM, platinumArt);
	});

	it("ClassicyHelpButton shows a helpButton registered after mount", () => {
		const { container } = render(<ClassicyHelpButton />);
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			platinumArt.helpButton,
		);
		act(() => {
			registerClassicySystemArt(PLATINUM, { helpButton: "help-later.png" });
		});
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			"help-later.png",
		);
	});

	it("ClassicyCrashScreen draws the registered sadMac at crash time", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		registerClassicySystemArt(PLATINUM, { sadMac: "sad-custom.png" });
		const Bomb = () => {
			throw new Error("boom");
		};
		const { container } = render(
			<ClassicyCrashScreen>
				<Bomb />
			</ClassicyCrashScreen>,
		);
		expect(container.querySelector(".classicyCrashScreen img")).toHaveAttribute(
			"src",
			"sad-custom.png",
		);
		vi.restoreAllMocks();
	});

	it("ensureClassicyTrash stamps the registered trashEmpty on the folder", () => {
		registerClassicySystemArt(PLATINUM, { trashEmpty: "trash-custom.png" });
		const fs = new ClassicyFileSystem("platinumAssets.consumers");
		ensureClassicyTrash(fs);
		expect(fs.resolve("Trash")?._icon).toBe("trash-custom.png");
	});

	it("the menu bar draws the registered appleMenu, including one made after mount", () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const apple = () =>
			container.querySelector(".classicyDesktopMenuApple img");
		expect(apple()).toHaveAttribute("src", platinumArt.appleMenu);
		act(() => {
			registerClassicySystemArt(PLATINUM, { appleMenu: "apple-later.png" });
		});
		expect(apple()).toHaveAttribute("src", "apple-later.png");
	});

	it("the desktop root re-spreads a system art key registered after mount", async () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const root = document.getElementById("classicyDesktop") as HTMLElement;
		act(() => {
			registerClassicySystemArt(PLATINUM, { windowGrip: "grip-later.svg" });
		});
		await waitFor(() =>
			expect(root.style.getPropertyValue("--classicy-art-window-grip")).toBe(
				'url("grip-later.svg")',
			),
		);
	});

	it("Finder re-adds the Trash icon with a trashEmpty registered after mount", async () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<Finder />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		const trashIcon = () =>
			useAppManager
				.getState()
				.System.Manager.Desktop.icons.find((i) => i.appId === "Trash")?.icon;
		await waitFor(() => expect(trashIcon()).toBe(platinumArt.trashEmpty));
		act(() => {
			registerClassicySystemArt(PLATINUM, { trashEmpty: "trash-later.png" });
		});
		await waitFor(() => expect(trashIcon()).toBe("trash-later.png"));
	});

	it("the Trash window's title-bar icon follows a trashEmpty registered after mount", async () => {
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<Finder />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Trash" });
		});
		const titleIcon = () =>
			container
				.querySelector('.classicyWindowIcon img[alt="Trash"]')
				?.getAttribute("src");
		await waitFor(() => expect(titleIcon()).toBe(platinumArt.trashEmpty));
		act(() => {
			registerClassicySystemArt(PLATINUM, { trashEmpty: "trash-later.png" });
		});
		await waitFor(() => expect(titleIcon()).toBe("trash-later.png"));
		// The default package registered it, so the stored icon heals too.
		await waitFor(() =>
			expect(new ClassicyFileSystem().resolve("Trash")?._icon).toBe(
				"trash-later.png",
			),
		);
		// Full while anything is in it, as the desktop icon is.
		act(() => {
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Documents:Old Note.txt", "");
			trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Old Note.txt"]);
		});
		await waitFor(() => expect(titleIcon()).toBe(platinumArt.trashFull));
	});

	it("a desktop saved with another package's trash art draws the active package's after Finder mounts", async () => {
		// An earlier test's debounced write would land on the seed below when
		// Finder's file system is built (the constructor drains it first).
		flushClassicyFileSystemPendingForStorageKey("classicyStorage");
		// A tree saved while another package was active: its Trash holds that
		// package's art, a URL this build may not even ship.
		const saved = new ClassicyFileSystem("platinumAssets.consumers.saved");
		ensureClassicyTrash(saved);
		saved.setMetadata("Trash", { _icon: "/assets/other-trash-AbC12345.png" });
		saved.writeFile("Macintosh HD:Documents:Saved.txt", "");
		localStorage.setItem("classicyStorage", saved.snapshot());

		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<Finder />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		const live = new ClassicyFileSystem();
		// The saved tree, not a fresh seed, is the one Finder mounted on.
		expect(live.resolve("Macintosh HD:Documents:Saved.txt")).toBeDefined();
		// The folder stores the default package's art (ruling R14), whichever
		// package is active; the window below draws the active package's.
		const defaultTrashEmpty = resolveClassicyAsset(
			"systemArt",
			"trashEmpty",
			CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
			"",
		);
		expect(defaultTrashEmpty).toBeTruthy();
		await waitFor(() =>
			expect(live.resolve("Trash")?._icon).toBe(defaultTrashEmpty),
		);
		// And it is the healed icon that is saved.
		flushClassicyFileSystemPendingForStorageKey("classicyStorage");
		expect(
			JSON.parse(localStorage.getItem("classicyStorage") ?? "{}").Trash?._icon,
		).toBe(defaultTrashEmpty);
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Trash" });
		});
		await waitFor(() =>
			expect(
				container
					.querySelector('.classicyWindowIcon img[alt="Trash"]')
					?.getAttribute("src"),
			).toBe(platinumArt.trashEmpty),
		);
	});

	it("About This Computer draws the registered aboutLogo", async () => {
		registerClassicySystemArt(PLATINUM, { aboutLogo: "about-custom.png" });
		const { container } = render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<Finder />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFinderAboutThisComputerOpen" });
		});
		await waitFor(() =>
			expect(
				container.querySelector(".finderAboutThisComputerBanner img"),
			).toHaveAttribute("src", "about-custom.png"),
		);
	});
});
