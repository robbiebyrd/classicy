import { act, cleanup } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type AppleGuideData,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
// Importing the extension registers both the topic and the reducer prefix.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuide";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The reducer returns early when AppleGuide.app is absent from the store, so
// seed it. Rendering only the menu bar never mounts the extension itself.
beforeEach(() => {
	useAppManager.setState((s) => ({
		...s,
		System: {
			...s.System,
			Manager: {
				...s.System.Manager,
				Applications: {
					...s.System.Manager.Applications,
					apps: {
						...s.System.Manager.Applications.apps,
						"AppleGuide.app": {
							id: "AppleGuide.app",
							name: "Apple Guide",
							icon: "",
							windows: {},
							open: true,
							focused: false,
							noDesktopIcon: true,
							data: {},
						},
					},
				},
			},
		},
	}));
});

function appleGuideData(): AppleGuideData {
	const d =
		useAppManager.getState().System.Manager.Applications.apps["AppleGuide.app"]
			?.data ?? {};
	return isAppleGuideData(d) ? d : {};
}

// ClassicyMenu.tsx defers a leaf item's action until its click flash ends
// (`onAnimationEnd` on the item itself, or a 400 ms fallback) — see
// ClassicyMenu.tsx's handleClick / handleAnimationEnd. Complete the flash so
// the action runs without waiting for the fallback.
function completeMenuItemFlash(id: string) {
	dispatchAnimationEnd(document.getElementById(id));
}

describe("Help menu — About Balloon Help", () => {
	it("opens the built-in topic via ClassicyAppAppleGuideShowTopic", async () => {
		render(<ClassicyDesktopMenuBar />);

		await userEvent.click(screen.getByText("Help"));
		await userEvent.click(screen.getByText("About Balloon Help…"));
		completeMenuItemFlash("help-about-balloon");

		await waitFor(() =>
			expect(appleGuideData().openTopics).toContain("about-balloon-help"),
		);
	});
});

/**
 * Seed an open+focused app plus its Help items.
 *
 * `DefaultAppManagerState` seeds `Finder.app` with `focused: true`, and it is
 * always the first key in `apps` — so a naive merge that only *adds* the new
 * app would leave two apps with `focused: true` and
 * `focusedMenuApp`'s `.find(a => a.focused)` would keep resolving to Finder,
 * not this app. Mirror what the real `focusApp` reducer does (see
 * `ClassicyAppHelpers.ts`'s `deFocusApps` call before setting the target's
 * flag): explicitly defocus every other app first when seeding a focused
 * one, so these tests are correct independent of what Finder — or any
 * earlier test — left behind.
 */
function seedAppWithHelp(
	appId: string,
	appName: string,
	helpItems: ClassicyMenuItem[],
	focused = true,
) {
	act(() => {
		useAppManager.setState((s) => {
			const apps = { ...s.System.Manager.Applications.apps };
			if (focused) {
				for (const id of Object.keys(apps)) {
					apps[id] = { ...apps[id], focused: false };
				}
			}
			apps[appId] = {
				id: appId,
				name: appName,
				icon: "",
				windows: {},
				open: true,
				focused,
				data: {},
			};
			return {
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Applications: {
							...s.System.Manager.Applications,
							apps,
						},
						Desktop: {
							...s.System.Manager.Desktop,
							helpMenu: {
								...(s.System.Manager.Desktop.helpMenu ?? {}),
								[appId]: helpItems,
							},
						},
					},
				},
			};
		});
	});
}

describe("Help menu — per-app items", () => {
	// Reset to a known baseline before each test here, independent of the
	// outer beforeEach's AppleGuide seeding and of whatever focus state any
	// earlier test (in this describe block or the "About Balloon Help" one
	// above) left behind. Without this, these tests could pass only because a
	// prior test's incidental `deFocusApps` call happened to leave Finder
	// unfocused — see the seedAppWithHelp comment above for why that would
	// otherwise matter.
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("renders the focused app's Help items", async () => {
		seedAppWithHelp("Weather.app", "Weather", [
			{ id: "Weather.app_about_data", title: "About Weather…" },
		]);

		render(<ClassicyDesktopMenuBar />);
		await userEvent.click(screen.getByText("Help"));

		expect(screen.getByText("About Weather…")).toBeInTheDocument();
	});

	it("does not render a non-focused app's Help items", async () => {
		seedAppWithHelp(
			"TV.app",
			"TV",
			[{ id: "TV.app_about_data", title: "About TV…" }],
			false,
		);
		seedAppWithHelp("Weather.app", "Weather", [
			{ id: "Weather.app_about_data", title: "About Weather…" },
		]);

		render(<ClassicyDesktopMenuBar />);
		await userEvent.click(screen.getByText("Help"));

		expect(screen.getByText("About Weather…")).toBeInTheDocument();
		expect(screen.queryByText("About TV…")).toBeNull();
	});

	it("keeps the built-in Balloon Help entries alongside app items", async () => {
		seedAppWithHelp("Weather.app", "Weather", [
			{ id: "Weather.app_about_data", title: "About Weather…" },
		]);

		render(<ClassicyDesktopMenuBar />);
		await userEvent.click(screen.getByText("Help"));

		expect(screen.getByText("About Balloon Help…")).toBeInTheDocument();
		expect(screen.getByText("Hide Balloons")).toBeInTheDocument();
		expect(screen.getByText("About Weather…")).toBeInTheDocument();
	});

	// The reason this whole design works: findAppAboutItem only walks
	// Desktop.appMenu, so a helpMenu "About …" entry must never be hoisted into
	// the Apple menu nor stripped from Help.
	it("does not hoist a helpMenu About entry into the Apple menu", async () => {
		seedAppWithHelp("Weather.app", "Weather", [
			{ id: "Weather.app_about_data", title: "About Weather…" },
		]);

		render(<ClassicyDesktopMenuBar />);

		// The hoisted-About id is always `${focusedAppId}_about_apple` (see
		// ClassicyDesktopMenuBar.tsx's appleMenuItem memo) — never derived from
		// the source item's own id — so this is the exact id a widened
		// findAppAboutItem would have to produce for a helpMenu entry to leak
		// into the Apple menu.
		expect(document.getElementById("Weather.app_about_apple")).toBeNull();
		const appleMenu = document.getElementById("apple-menu");
		expect(
			appleMenu ? within(appleMenu).queryByText("About Weather…") : null,
		).toBeNull();

		await userEvent.click(screen.getByText("Help"));
		expect(screen.getByText("About Weather…")).toBeInTheDocument();
	});
});

// The rows of a menu the bar draws: each item's id, or "—" for a divider.
const helpRows = (menuId = "help-menu") =>
	Array.from(
		document.querySelectorAll(
			`[id="${menuId}"] > .classicyMenuWrapper > ul > *`,
		),
	).map((row) => (row.tagName === "HR" ? "—" : row.id));

// The bar's top-level menus titled Help, by word or by art (System 7 titles
// its Help menu with an icon whose alt is "Help").
const helpTitles = () =>
	Array.from(
		document.querySelectorAll(
			".classicyDesktopMenuBar ul.classicyDesktopMenu > li",
		),
	).filter((li) => {
		const title = li.querySelector(":scope > p");
		if (!title) return false;
		return (
			title.textContent?.trim() === "Help" ||
			title.querySelector('img[alt="Help"]') !== null
		);
	});

/** Seed `appId` focused, its window's menus in `Desktop.appMenu`. */
function seedFocusedAppMenu(
	appId: string,
	appMenu: ClassicyMenuItem[],
	registered?: ClassicyMenuItem[],
) {
	seedAppWithHelp(appId, appId.replace(/\.app$/, ""), registered ?? []);
	act(() => {
		useAppManager.setState((s) => ({
			...s,
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					Applications: {
						...s.System.Manager.Applications,
						focusedAppId: appId,
					},
					Desktop: {
						...s.System.Manager.Desktop,
						appMenu,
						helpMenu: registered
							? { [appId]: registered }
							: s.System.Manager.Desktop.helpMenu,
					},
				},
			},
		}));
	});
}

// Plan 0020-w98 §4, every package: an app's own top-level Help menu is
// merged into the one Help menu, after the system's and its registered
// items (HIGOS8 Ch.4 "Help menus", pp.91–92, Figure 4-2; HIG7 "The Help
// Menu", p.125), never drawn as a second "Help" title.
describe("Help menu — an app's own Help menu is merged", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("draws one Help, the app's items after the registered ones", () => {
		seedFocusedAppMenu(
			"Weather.app",
			[
				{
					id: "Weather.app_file",
					title: "File",
					menuChildren: [{ id: "Weather.app_close", title: "Close" }],
				},
				{
					id: "Weather.app_help",
					title: "Help",
					menuChildren: [
						{ id: "Weather.app_tips", title: "Forecast Tips" },
						{ id: "Weather.app_about", title: "About" },
					],
				},
			],
			[{ id: "Weather.app_registered", title: "Weather Guide" }],
		);

		render(<ClassicyDesktopMenuBar />);

		expect(helpTitles()).toHaveLength(1);
		expect(document.getElementById("Weather.app_help")).toBeNull();
		expect(helpRows()).toEqual([
			"help-about-balloon",
			"help-toggle-balloons",
			"—",
			"Weather.app_registered",
			"—",
			"Weather.app_tips",
		]);
		// About is still hoisted into the Apple menu, before the merge.
		expect(document.getElementById("Weather.app_about_apple")).not.toBeNull();
		expect(document.getElementById("Weather.app_about")).toBeNull();
		// Help stays the rightmost standard menu.
		expect(document.getElementById("help-menu")?.dataset.classicyPart).toBe(
			"help",
		);
	});

	it("runs a merged item's action from the Help menu", async () => {
		const tips = vi.fn();
		seedFocusedAppMenu("Weather.app", [
			{
				id: "Weather.app_help",
				title: "Help",
				menuChildren: [
					{ id: "Weather.app_tips", title: "Forecast Tips", onClickFunc: tips },
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);
		await userEvent.click(screen.getByText("Help"));
		await userEvent.click(screen.getByText("Forecast Tips"));
		completeMenuItemFlash("Weather.app_tips");

		await waitFor(() => expect(tips).toHaveBeenCalledTimes(1));
	});

	it("drops an app item that repeats the balloon toggle, and its divider", () => {
		seedFocusedAppMenu("Weather.app", [
			{
				id: "Weather.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "Weather.app_help_balloon",
						title: "Hide Balloon Help",
						event: "ClassicyDesktopSetBalloonHelp",
						eventData: { disableBalloonHelp: true },
					},
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(helpTitles()).toHaveLength(1);
		expect(helpRows()).toEqual(["help-about-balloon", "help-toggle-balloons"]);
		expect(document.getElementById("Weather.app_help_balloon")).toBeNull();
	});

	it("keeps an app's own balloon command that is not the toggle's event", () => {
		seedFocusedAppMenu("Weather.app", [
			{
				id: "Weather.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "Weather.app_balloons",
						title: "Balloon Tour",
						onClickFunc: vi.fn(),
					},
				],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(helpRows()).toEqual([
			"help-about-balloon",
			"help-toggle-balloons",
			"—",
			"Weather.app_balloons",
		]);
	});

	it("leaves a menu that is not Help where the app put it", () => {
		seedFocusedAppMenu("Weather.app", [
			{
				id: "Weather.app_view",
				title: "View",
				menuChildren: [{ id: "Weather.app_radar", title: "Radar" }],
			},
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(document.getElementById("Weather.app_view")).not.toBeNull();
		expect(helpRows()).toEqual(["help-about-balloon", "help-toggle-balloons"]);
	});
});

// The double Help: Finder's window Help menu held "Hide Balloon Help" and
// About, so with a Finder window focused the bar drew two "Help" titles in
// every package. Now one, holding what it holds with the desktop focused.
// Last in the file: the packages these import stay registered.
describe("Help menu — a focused Finder window adds no second Help", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	afterEach(() => {
		cleanup();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	const finderWindowFocused = () =>
		(useAppManager.getState().System.Manager.Desktop.appMenu ?? []).some(
			(menu) => menu.id.startsWith("Finder.app_") && menu.id.endsWith("_help"),
		);

	it.each([
		["Platinum", "platinum", () => import("@classicy/appearance-platinum")],
		["System 7", "system7", () => import("@classicy/appearance-system7")],
	])("draws one Help under %s's layout", async (_, packageId, load) => {
		await load();
		useAppManager.setState(
			produce(structuredClone(DefaultAppManagerState), (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
			true,
		);
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

		// The desktop focused: the system's two items.
		expect(helpTitles()).toHaveLength(1);
		expect(helpRows()).toEqual(["help-about-balloon", "help-toggle-balloons"]);

		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: "Macintosh HD" });
		});
		await waitFor(() => expect(finderWindowFocused()).toBe(true));

		// A Finder window focused: still one Help, with the same two items.
		expect(helpTitles()).toHaveLength(1);
		expect(helpRows()).toEqual(["help-about-balloon", "help-toggle-balloons"]);
		expect(screen.queryByText("Hide Balloon Help")).toBeNull();
		// Finder's About is in the Apple menu, as before.
		expect(document.getElementById("Finder.app_about_apple")).not.toBeNull();
	});
});
