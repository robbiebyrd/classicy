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
