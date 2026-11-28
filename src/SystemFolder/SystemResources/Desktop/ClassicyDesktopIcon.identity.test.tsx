import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
	TEST_STARTUP_DISK_ICON,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
// Side-effect import: registers Movie Player's manifest (its description is
// the balloon under Platinum), as the package barrel does in the real app.
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";

// Desktop icons show the active Appearance Package's display identity for an
// app shortcut (its `apps` override), while the icon record, the open action
// and analytics keep the app's own name.

// Every action a component dispatches, recorded on its way into the real
// store.
const dispatched = vi.hoisted((): ActionMessage[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const { recordingAppManagerUtils } = await import(
			"@/__tests__/recordingAppManagerUtils"
		);
		return recordingAppManagerUtils(await importOriginal(), dispatched);
	},
);

// jsdom plays no audio, so the full desktop's sound manager would log a
// "Failed to load audio sprite" error for every Howl it builds.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

// Every analytics event, recorded: GA keeps the app's own name (K-D5).
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

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const TV_ICON = "/icons/tv.png";

const switchPackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
};

beforeEach(() => {
	localStorage.clear();
	resetToPlatinum();
	dispatched.length = 0;
	tracked.length = 0;
	registerTestRenamePackage();
	switchPackage(TEST_RENAME_PACKAGE_ID);
});

afterEach(() => {
	resetToPlatinum();
});

const iconRoot = (appId: string) =>
	document.getElementById(`${appId}.shortcut`) as HTMLElement;

const label = (appId: string) =>
	iconRoot(appId).querySelector("p")?.textContent;

const image = (appId: string) =>
	iconRoot(appId).querySelector<HTMLImageElement>(
		".classicyDesktopIconMask img",
	);

describe("test-rename", () => {
	it("an app_shortcut icon shows the package's name", () => {
		render(
			<ClassicyDesktopIcon
				appId="TV.app"
				appName="TV"
				icon={TV_ICON}
				kind="app_shortcut"
			/>,
		);
		expect(label("TV.app")).toBe("Television");
		expect(image("TV.app")).toHaveAttribute("alt", "Television");
		expect(image("TV.app")).toHaveAttribute("src", TV_ICON);
	});

	it("an app_shortcut icon shows the package's icon", () => {
		render(
			<ClassicyDesktopIcon
				appId={MoviePlayerAppInfo.id}
				appName={MoviePlayerAppInfo.name}
				icon={MoviePlayerAppInfo.icon}
				kind="app_shortcut"
			/>,
		);
		expect(label(MoviePlayerAppInfo.id)).toBe("Media Player");
		expect(image(MoviePlayerAppInfo.id)).toHaveAttribute(
			"src",
			TEST_RENAMED_ICON,
		);
		// The selected and open shading masks the art that is drawn.
		const mask = iconRoot(MoviePlayerAppInfo.id).querySelector<HTMLElement>(
			".classicyDesktopIconMaskOuter",
		);
		expect(mask?.style.getPropertyValue("--classicy-icon-mask")).toBe(
			`url("${TEST_RENAMED_ICON}")`,
		);
	});

	it("a drive icon sharing Finder.app keeps its own name", () => {
		// Extend the fixture locally: test-rename also renames Finder.
		const renamed = getClassicyAppearancePackage(
			TEST_RENAME_PACKAGE_ID,
		) as ClassicyAppearancePackage;
		act(() =>
			registerClassicyAppearancePackage({
				...renamed,
				apps: { ...renamed.apps, "Finder.app": { name: "Explorer" } },
			}),
		);
		render(
			<ClassicyDesktopIcon
				appId="Finder.app"
				appName="Macintosh HD"
				icon="/icons/hd.png"
				kind="drive"
			/>,
		);
		expect(label("Finder.app")).toBe("Macintosh HD");
		expect(image("Finder.app")).toHaveAttribute("alt", "Macintosh HD");
	});

	it("a user label wins over the override", () => {
		render(
			<ClassicyDesktopIcon
				appId="TV.app"
				appName="TV"
				icon={TV_ICON}
				label="My Telly"
				kind="app_shortcut"
			/>,
		);
		expect(label("TV.app")).toBe("My Telly");
	});

	it("switching back to Platinum restores the app's own name", () => {
		render(
			<ClassicyDesktopIcon
				appId="TV.app"
				appName="TV"
				icon={TV_ICON}
				kind="app_shortcut"
			/>,
		);
		expect(label("TV.app")).toBe("Television");
		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(label("TV.app")).toBe("TV");
		expect(image("TV.app")).toHaveAttribute("alt", "TV");
	});

	it("double-clicking opens the app with its own name", () => {
		render(
			<ClassicyDesktopIcon
				appId="TV.app"
				appName="TV"
				icon={TV_ICON}
				kind="app_shortcut"
			/>,
		);
		fireEvent.doubleClick(iconRoot("TV.app"));
		const open = dispatched.find((a) => a.type === "ClassicyDesktopIconOpen");
		expect(open).toBeDefined();
		expect((open?.app as { name: string; icon: string }).name).toBe("TV");
		expect((open?.app as { name: string; icon: string }).icon).toBe(TV_ICON);
	});

	it("analytics carry the app's own name and icon", () => {
		render(
			<ClassicyDesktopIcon
				appId="TV.app"
				appName="TV"
				icon={TV_ICON}
				kind="app_shortcut"
			/>,
		);
		expect(label("TV.app")).toBe("Television");
		fireEvent.mouseDown(iconRoot("TV.app"));
		fireEvent.mouseUp(iconRoot("TV.app"));
		fireEvent.click(iconRoot("TV.app"));
		fireEvent.doubleClick(iconRoot("TV.app"));
		const events = tracked.map(([event]) => event);
		expect(events).toContain("move");
		expect(events).toContain("open");
		for (const [, payload] of tracked) {
			expect(payload).toMatchObject({
				type: "ClassicyDesktopIcon",
				appId: "TV.app",
				appName: "TV",
				icon: TV_ICON,
			});
		}
	});

	describe("balloon", () => {
		const balloonTitle = () =>
			document.querySelector(".classicyBalloonHelpTitle")?.textContent;

		const renderMoviePlayerIcon = () =>
			render(
				<ClassicyDesktopIcon
					appId={MoviePlayerAppInfo.id}
					appName={MoviePlayerAppInfo.name}
					icon={MoviePlayerAppInfo.icon}
					kind="app_shortcut"
				/>,
			);

		it("shows the package's name and description when no balloon is stored", async () => {
			renderMoviePlayerIcon();
			fireEvent.mouseEnter(iconRoot(MoviePlayerAppInfo.id));
			expect(
				await screen.findByText(
					"Plays movies and sound.",
					{},
					{ timeout: 2000 },
				),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Media Player");
		});

		it("shows the manifest description under Platinum", async () => {
			switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
			const description = getAppManifest(MoviePlayerAppInfo.id)?.description;
			expect(description).toBe("QuickTime movie and audio player.");
			renderMoviePlayerIcon();
			fireEvent.mouseEnter(iconRoot(MoviePlayerAppInfo.id));
			expect(
				await screen.findByText(description as string, {}, { timeout: 2000 }),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe(MoviePlayerAppInfo.name);
		});

		it("titles a balloon with the display name when the label is empty", async () => {
			const { unmount } = render(
				<ClassicyDesktopIcon
					appId="TV.app"
					appName="TV"
					icon={TV_ICON}
					label=""
					kind="app_shortcut"
					balloonHelp={{ content: "Watch TV.", delay: 0 }}
				/>,
			);
			expect(label("TV.app")).toBe("Television");
			fireEvent.mouseEnter(iconRoot("TV.app"));
			expect(await screen.findByText("Watch TV.")).toBeInTheDocument();
			expect(balloonTitle()).toBe("Television");
			unmount();

			render(
				<ClassicyDesktopIcon
					appId={MoviePlayerAppInfo.id}
					appName={MoviePlayerAppInfo.name}
					icon={MoviePlayerAppInfo.icon}
					label=""
					kind="app_shortcut"
				/>,
			);
			fireEvent.mouseEnter(iconRoot(MoviePlayerAppInfo.id));
			expect(
				await screen.findByText(
					"Plays movies and sound.",
					{},
					{ timeout: 2000 },
				),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Media Player");
		});

		it("titles a stored untitled balloon with the display name", async () => {
			render(
				<ClassicyDesktopIcon
					appId="TV.app"
					appName="TV"
					icon={TV_ICON}
					kind="app_shortcut"
					balloonHelp={{ content: "Watch TV.", delay: 0 }}
				/>,
			);
			fireEvent.mouseEnter(iconRoot("TV.app"));
			expect(await screen.findByText("Watch TV.")).toBeInTheDocument();
			expect(balloonTitle()).toBe("Television");
		});

		it("a drive sharing Finder.app keeps its stock balloon", async () => {
			const renamed = getClassicyAppearancePackage(
				TEST_RENAME_PACKAGE_ID,
			) as ClassicyAppearancePackage;
			act(() =>
				registerClassicyAppearancePackage({
					...renamed,
					apps: {
						...renamed.apps,
						"Finder.app": { name: "Explorer", description: "Not a disk." },
					},
				}),
			);
			render(
				<ClassicyDesktopIcon
					appId="Finder.app"
					appName="Macintosh HD"
					icon="/icons/hd.png"
					kind="drive"
				/>,
			);
			fireEvent.mouseEnter(iconRoot("Finder.app"));
			expect(
				await screen.findByText(/This is a disk icon\./, {}, { timeout: 2000 }),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Macintosh HD");
		});
	});

	describe("desktop type-select", () => {
		const icon = (appId: string, appName: string) => ({
			appId,
			appName,
			icon: "/i.png",
			kind: "app_shortcut",
			noLaunch: true,
		});

		const drive = {
			appId: "Finder.app",
			appName: "Macintosh HD",
			icon: "/hd.png",
			kind: "drive",
			noLaunch: true,
		};

		/** Seeds the desktop's icons, renders the desktop and types `text`. */
		const typeOnDesktop = (
			icons: (typeof drive & { label?: string })[],
			text: string,
		) => {
			act(() => {
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Desktop.icons = icons.map((i) => ({
							...i,
						}));
					}),
				);
			});
			render(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop controlStrip={false} />
				</ClassicyAppManagerProvider>,
			);
			const target = iconRoot(icons[0].appId);
			for (const key of text) fireEvent.keyDown(target, { key });
			return useAppManager.getState().System.Manager.Desktop.selectedIcons;
		};

		/** Extends the fixture locally: test-rename also renames Finder. */
		const renameFinder = () => {
			const renamed = getClassicyAppearancePackage(
				TEST_RENAME_PACKAGE_ID,
			) as ClassicyAppearancePackage;
			act(() =>
				registerClassicyAppearancePackage({
					...renamed,
					apps: { ...renamed.apps, "Finder.app": { name: "Explorer" } },
				}),
			);
		};

		it("matches the package's name", () => {
			expect(
				typeOnDesktop(
					[icon("Scrapbook.app", "Scrapbook"), icon("TV.app", "TV")],
					"Tel",
				),
			).toEqual(["TV.app"]);
			// The record keeps the app's own name.
			expect(
				useAppManager
					.getState()
					.System.Manager.Desktop.icons.find((i) => i.appId === "TV.app")
					?.appName,
			).toBe("TV");
		});

		it("matches a user label, not the package's name", () => {
			expect(
				typeOnDesktop(
					[
						icon("Scrapbook.app", "Scrapbook"),
						{ ...icon("TV.app", "TV"), label: "My Telly" },
					],
					"My",
				),
			).toEqual(["TV.app"]);
		});

		it("matches a drive sharing Finder.app by its own name", () => {
			renameFinder();
			expect(
				typeOnDesktop([drive, icon("Scrapbook.app", "Scrapbook")], "Mac"),
			).toEqual(["Finder.app"]);
		});

		it("never matches a drive by Finder.app's override", () => {
			renameFinder();
			expect(
				typeOnDesktop([drive, icon("Scrapbook.app", "Scrapbook")], "Exp"),
			).not.toContain("Finder.app");
		});
	});
	// The package's `desktopIcons` (Windows 98's Recycle Bin and My Computer):
	// the Trash and the startup disk show its name, image and balloon copy,
	// while their records, paths and analytics keep their own.
	describe("desktopIcons", () => {
		const HD_ICON = "/icons/hd.png";
		const TRASH_ICON = "/icons/trash.png";
		const balloonTitle = () =>
			document.querySelector(".classicyBalloonHelpTitle")?.textContent;
		const relabel = () =>
			act(() => registerTestRenamePackage({ desktopIcons: true }));
		const renderTrash = (props: { label?: string } = {}) =>
			render(
				<ClassicyDesktopIcon
					appId="Trash"
					appName="Trash"
					icon={TRASH_ICON}
					kind="trash"
					filePath="Trash"
					noLaunch
					{...props}
				/>,
			);
		const renderDrive = (startupDisk: boolean) =>
			render(
				<ClassicyDesktopIcon
					appId="Finder.app"
					appName="Macintosh HD"
					icon={HD_ICON}
					kind="drive"
					filePath="Macintosh HD"
					startupDisk={startupDisk}
				/>,
			);

		it("shows the Trash by the package's name, over its own art", () => {
			relabel();
			renderTrash();
			expect(label("Trash")).toBe("Wastebasket");
			expect(image("Trash")).toHaveAttribute("alt", "Wastebasket");
			expect(image("Trash")).toHaveAttribute("src", TRASH_ICON);
		});

		it("shows the startup disk by the package's name and image", () => {
			relabel();
			renderDrive(true);
			expect(label("Finder.app")).toBe("This Computer");
			expect(image("Finder.app")).toHaveAttribute(
				"src",
				TEST_STARTUP_DISK_ICON,
			);
		});

		it("leaves a drive that is not the startup disk alone", () => {
			relabel();
			renderDrive(false);
			expect(label("Finder.app")).toBe("Macintosh HD");
			expect(image("Finder.app")).toHaveAttribute("src", HD_ICON);
		});

		it("keeps the own names under a package that declares none", () => {
			renderTrash();
			expect(label("Trash")).toBe("Trash");
			renderDrive(true);
			expect(label("Finder.app")).toBe("Macintosh HD");
			expect(image("Finder.app")).toHaveAttribute("src", HD_ICON);
		});

		it("restores the own names on a switch back to Platinum", () => {
			relabel();
			renderTrash();
			renderDrive(true);
			expect(label("Trash")).toBe("Wastebasket");
			switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(label("Trash")).toBe("Trash");
			expect(label("Finder.app")).toBe("Macintosh HD");
			expect(image("Finder.app")).toHaveAttribute("src", HD_ICON);
		});

		it("lets a label win over the package's name", () => {
			relabel();
			renderTrash({ label: "Bin" });
			expect(label("Trash")).toBe("Bin");
		});

		it("keeps the record's own name in analytics", () => {
			relabel();
			renderTrash();
			fireEvent.mouseDown(iconRoot("Trash"));
			fireEvent.mouseUp(iconRoot("Trash"));
			fireEvent.click(iconRoot("Trash"));
			expect(tracked.length).toBeGreaterThan(0);
			for (const [, payload] of tracked)
				expect(payload).toMatchObject({
					appId: "Trash",
					appName: "Trash",
					icon: TRASH_ICON,
				});
		});

		it("shows the package's balloon copy in place of the stock copy", async () => {
			relabel();
			renderTrash();
			fireEvent.mouseEnter(iconRoot("Trash"));
			expect(
				await screen.findByText(
					"Holds what you throw away.",
					{},
					{ timeout: 2000 },
				),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Wastebasket");
		});

		// The audit's 12.5: the other drives' balloon copy (`desktopIcons.drive`),
		// their label and image their own.
		it("shows the package's balloon copy for a drive that is not the startup disk", async () => {
			relabel();
			renderDrive(false);
			expect(label("Finder.app")).toBe("Macintosh HD");
			fireEvent.mouseEnter(iconRoot("Finder.app"));
			expect(
				await screen.findByText(
					"Shows what is on this disk.",
					{},
					{ timeout: 2000 },
				),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Macintosh HD");
		});

		it("keeps the startup disk's own copy over the drives'", async () => {
			relabel();
			renderDrive(true);
			fireEvent.mouseEnter(iconRoot("Finder.app"));
			expect(
				await screen.findByText(
					"Shows what is on this computer.",
					{},
					{ timeout: 2000 },
				),
			).toBeInTheDocument();
		});

		it("keeps a drive's stock balloon under a package that declares none", async () => {
			renderDrive(false);
			fireEvent.mouseEnter(iconRoot("Finder.app"));
			expect(
				await screen.findByText(/This is a disk icon\./, {}, { timeout: 2000 }),
			).toBeInTheDocument();
		});

		it("keeps the stock balloon under a package that declares none", async () => {
			renderTrash();
			fireEvent.mouseEnter(iconRoot("Trash"));
			expect(
				await screen.findByText(/This is the Trash\./, {}, { timeout: 2000 }),
			).toBeInTheDocument();
			expect(balloonTitle()).toBe("Trash");
		});

		describe("on the desktop", () => {
			// The desktop's own records, as Finder adds them: the Trash, and
			// the startup disk (the default tree's first drive).
			const seed = () =>
				act(() => {
					useAppManager.setState((state) =>
						produce(state, (draft) => {
							draft.System.Manager.Desktop.icons = [
								{
									appId: "Finder.app",
									appName: "Macintosh HD",
									icon: HD_ICON,
									kind: "drive",
									filePath: "Macintosh HD",
									noLaunch: true,
								},
								{
									appId: "Trash",
									appName: "Trash",
									icon: TRASH_ICON,
									kind: "trash",
									filePath: "Trash",
									noLaunch: true,
								},
							];
						}),
					);
				});
			const renderDesktop = () => {
				seed();
				render(
					<ClassicyAppManagerProvider>
						<ClassicyDesktop controlStrip={false} />
					</ClassicyAppManagerProvider>,
				);
			};
			const typeOnDesktop = (text: string) => {
				for (const key of text) fireEvent.keyDown(iconRoot("Trash"), { key });
				return useAppManager.getState().System.Manager.Desktop.selectedIcons;
			};

			it("passes the startup disk to its icon, which shows the package's name", () => {
				relabel();
				renderDesktop();
				expect(label("Finder.app")).toBe("This Computer");
				expect(label("Trash")).toBe("Wastebasket");
				// The records keep their own names.
				const icons = useAppManager.getState().System.Manager.Desktop.icons;
				expect(icons.find((i) => i.appId === "Trash")?.appName).toBe("Trash");
				expect(icons.find((i) => i.appId === "Finder.app")?.appName).toBe(
					"Macintosh HD",
				);
			});

			it("type-selects the Trash by the package's name", () => {
				relabel();
				renderDesktop();
				expect(typeOnDesktop("Was")).toEqual(["Trash"]);
			});

			it("type-selects the startup disk by the package's name", () => {
				relabel();
				renderDesktop();
				expect(typeOnDesktop("This")).toEqual(["Finder.app"]);
			});

			it("type-selects them by their own names under a package that declares none", () => {
				renderDesktop();
				expect(label("Finder.app")).toBe("Macintosh HD");
				expect(typeOnDesktop("Mac")).toEqual(["Finder.app"]);
			});
		});
	});
});
