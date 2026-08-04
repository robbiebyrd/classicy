import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, userEvent, waitFor } from "@/__tests__/test-utils";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type AppleGuideData,
	isAppleGuideData,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
// Importing the extension registers both the topic and the reducer prefix.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuide";
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
							windows: [],
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

// ClassicyMenu.tsx defers a leaf item's action until its click-flash CSS
// animation completes (`onAnimationEnd`, matched by animation name
// "classicyMenuItemFlashKeyframes") and only then fires on a
// requestAnimationFrame callback — see ClassicyMenu.tsx's handleClick /
// handleAnimationEnd. jsdom has no `AnimationEvent` global, which makes React
// fall back to its legacy vendor-prefix detection and register the listener
// as "webkitAnimationEnd" instead of "animationend" (jsdom's style object
// does expose "WebkitAnimation", so the prefixed branch wins). A plain click
// therefore never reaches the dispatch in tests; complete the animation
// manually with the event name React actually listens for in this
// environment.
function completeMenuItemFlash(id: string) {
	const li = document.getElementById(id);
	const event = new Event("webkitAnimationEnd", {
		bubbles: true,
		cancelable: true,
	});
	Object.defineProperty(event, "animationName", {
		value: "classicyMenuItemFlashKeyframes",
	});
	li?.dispatchEvent(event);
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

/** Seed an open+focused app plus its Help items. */
function seedAppWithHelp(
	appId: string,
	appName: string,
	helpItems: ClassicyMenuItem[],
	focused = true,
) {
	act(() => {
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
							[appId]: {
								id: appId,
								name: appName,
								icon: "",
								windows: [],
								open: true,
								focused,
								data: {},
							},
						},
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
		}));
	});
}

describe("Help menu — per-app items", () => {
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
	});

	// The reason this whole design works: findAppAboutItem only walks
	// Desktop.appMenu, so a helpMenu "About …" entry must never be hoisted into
	// the Apple menu nor stripped from Help.
	it("does not hoist a helpMenu About entry into the Apple menu", async () => {
		seedAppWithHelp("Weather.app", "Weather", [
			{ id: "Weather.app_about_data", title: "About Weather…" },
		]);

		render(<ClassicyDesktopMenuBar />);

		expect(document.getElementById("Weather.app_about_data_apple")).toBeNull();
		await userEvent.click(screen.getByText("Help"));
		expect(screen.getByText("About Weather…")).toBeInTheDocument();
	});
});
