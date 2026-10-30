import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
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
			`url(${TEST_RENAMED_ICON})`,
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
});
