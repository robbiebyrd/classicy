import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
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
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

// No AnalyticsProvider is mounted; keep the app's no-op fallback quiet.
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const TV_ICON = "/icons/tv.png";

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
};

const switchPackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

/** A host app with an Apple-menu entry, renamed "Television" by test-rename. */
const TV = () => (
	<ClassicyApp
		id="TV.app"
		name="TV"
		icon={TV_ICON}
		addSystemMenu={true}
		showDesktopIcon={false}
		showInApplicationsFolder={false}
	/>
);

const switcher = () => document.querySelector<HTMLElement>("#app-switcher");

/**
 * The switcher's visible title: the sizer's first span when the title
 * reserves width for other open apps' names, else the row's own text.
 */
const switcherTitle = () => {
	const row = switcher()?.querySelector(":scope > p");
	const sized = row?.querySelector(
		".classicyMenuItemTitleSizer > span:first-child",
	);
	return (sized ?? row)?.textContent;
};

const switcherIcon = () =>
	switcher()?.querySelector(":scope > p > img")?.getAttribute("src");

const openAppleMenu = () => {
	const apple = document.querySelector<HTMLElement>(
		'[data-classicy-part="apple"]',
	) as HTMLElement;
	fireEvent.click(apple.querySelector("p") ?? apple);
	expect(apple).toHaveClass("open");
};

const appleMenuFirstItem = () =>
	document.querySelector<HTMLElement>("#apple-menu .classicyMenuWrapper ul li");

const tvMenuItem = () => document.getElementById("system_menu_TV.app");

beforeEach(() => {
	resetToPlatinum();
	registerTestRenamePackage();
	switchPackage(TEST_RENAME_PACKAGE_ID);
	act(() =>
		dispatch({
			type: "ClassicyAppOpen",
			app: {
				id: MoviePlayerAppInfo.id,
				name: MoviePlayerAppInfo.name,
				icon: MoviePlayerAppInfo.icon,
			},
		}),
	);
	// Opening a new app record does not focus it (`openApp`); focusing does.
	act(() =>
		dispatch({ type: "ClassicyAppFocus", app: { id: MoviePlayerAppInfo.id } }),
	);
	// Movie Player's published menu, with the About entry the Apple menu hoists.
	act(() =>
		useAppManager.setState((s) => ({
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					Desktop: {
						...s.System.Manager.Desktop,
						appMenu: [
							{
								id: `${MoviePlayerAppInfo.id}_help`,
								title: "Help",
								menuChildren: [
									{
										id: `${MoviePlayerAppInfo.id}_about`,
										title: "About",
										onClickFunc: () => {},
									},
								],
							},
						],
					},
				},
			},
		})),
	);
});

afterEach(() => {
	resetToPlatinum();
});

describe("ClassicyDesktopMenuBar — app display identity", () => {
	it("starts with Movie Player open and focused", () => {
		const apps = useAppManager.getState().System.Manager.Applications.apps;
		expect(apps[MoviePlayerAppInfo.id]).toMatchObject({
			open: true,
			focused: true,
			name: "Movie Player",
		});
	});

	it("shows the package's name and icon in the App Switcher", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(switcherTitle()).toBe("Media Player");
		expect(switcherIcon()).toBe(TEST_RENAMED_ICON);
	});

	it("shows About <display name> first in the Apple menu", () => {
		render(<ClassicyDesktopMenuBar />);
		openAppleMenu();
		const first = appleMenuFirstItem();
		expect(first?.id).toBe(`${MoviePlayerAppInfo.id}_about_apple`);
		expect(first).toHaveTextContent("About Media Player");
	});

	it("shows a host app's Apple-menu entry under its display name", async () => {
		render(
			<>
				<ClassicyDesktopMenuBar />
				<TV />
			</>,
		);
		await waitFor(() => expect(tvMenuItem()).not.toBeNull());
		openAppleMenu();
		expect(tvMenuItem()).toHaveTextContent("Television");
		// The entry still opens the app by its internal identity.
		const entry = useAppManager
			.getState()
			.System.Manager.Desktop.systemMenu.find(
				(i) => i.id === "system_menu_TV.app",
			);
		expect(entry?.title).toBe("TV");
		expect(entry?.eventData).toEqual({
			app: { id: "TV.app", name: "TV", icon: TV_ICON },
		});
	});

	it("shows a host app's Apple-menu entry under its display name when the focused app has no About", async () => {
		render(
			<>
				<ClassicyDesktopMenuBar />
				<TV />
			</>,
		);
		await waitFor(() => expect(tvMenuItem()).not.toBeNull());
		// Movie Player publishes no About: the Apple menu keeps its own items.
		act(() =>
			useAppManager.setState((s) => ({
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Desktop: { ...s.System.Manager.Desktop, appMenu: [] },
					},
				},
			})),
		);
		openAppleMenu();
		expect(appleMenuFirstItem()?.id).not.toBe(
			`${MoviePlayerAppInfo.id}_about_apple`,
		);
		expect(tvMenuItem()).toHaveTextContent("Television");
	});

	it("falls back to the package's name for Finder when no app is shown", () => {
		registerTestAppsPackage("test-rename-finder", {
			"Finder.app": { name: "Navigator" },
		});
		switchPackage("test-rename-finder");
		// No app record at all: the switcher and the Apple menu's About fall
		// back to Finder, by its display name.
		act(() =>
			useAppManager.setState((s) => ({
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Applications: { ...s.System.Manager.Applications, apps: {} },
					},
				},
			})),
		);
		render(<ClassicyDesktopMenuBar />);
		expect(switcherTitle()).toBe("Navigator");
		openAppleMenu();
		expect(appleMenuFirstItem()).toHaveTextContent("About Navigator");
	});

	it("follows a switch back to Platinum", async () => {
		render(
			<>
				<ClassicyDesktopMenuBar />
				<TV />
			</>,
		);
		await waitFor(() => expect(tvMenuItem()).not.toBeNull());
		expect(switcherTitle()).toBe("Media Player");

		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);

		expect(switcherTitle()).toBe("Movie Player");
		expect(switcherIcon()).toBe(MoviePlayerAppInfo.icon);
		openAppleMenu();
		expect(appleMenuFirstItem()).toHaveTextContent("About Movie Player");
		expect(tvMenuItem()).toHaveTextContent("TV");
		expect(tvMenuItem()).not.toHaveTextContent("Television");
	});
});
