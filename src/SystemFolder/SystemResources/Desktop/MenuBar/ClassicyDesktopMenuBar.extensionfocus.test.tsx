import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** Replace the whole store with defaults plus the given mutations. */
function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

function appleSubmenu(): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		"#apple-menu .classicyMenuWrapper ul",
	);
}

// Regression: a background *extension* (e.g. Apple Guide) taking window focus
// must never surface as the Apple menu's "focused app" — it has no menu of
// its own, isn't a peer in the App Switcher (see appSwitcherAppsFrom), and
// letting it win the `.find(a => a.focused)` lookup used to hoist a
// SimpleText-owned "About" handler under the label "About Apple Guide".
describe("ClassicyDesktopMenuBar — extensions never own Apple-menu focus", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("does not present the focused extension as the HIG #209 'About <app>' owner", () => {
		const simpleTextAbout = vi.fn();
		const appMenu: ClassicyMenuItem[] = [
			{
				id: "SimpleText.app_help",
				title: "Help",
				menuChildren: [
					{
						id: "SimpleText.app_about",
						title: "About",
						onClickFunc: simpleTextAbout,
					},
				],
			},
		];

		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": {
					id: "Finder.app",
					name: "Finder",
					icon: "/icons/finder.png",
					windows: [],
					open: true,
					focused: false,
					data: {},
				},
				"SimpleText.app": {
					id: "SimpleText.app",
					name: "SimpleText",
					icon: "/icons/simpletext.png",
					windows: [],
					open: true,
					focused: false,
					data: {},
				},
				// An extension that has taken window focus — same shape produced by
				// AppleGuideContext's focusWindow() call when a topic is opened.
				"AppleGuide.app": {
					id: "AppleGuide.app",
					name: "Apple Guide",
					icon: "/icons/appleguide.png",
					windows: [],
					open: true,
					focused: true,
					extension: true,
					data: {},
				},
			};
			draft.System.Manager.Applications.focusedAppId = "AppleGuide.app";
			// appMenu is never republished by an extension's window, so it is left
			// holding whatever the last real app (SimpleText) last published.
			draft.System.Manager.Desktop.appMenu = appMenu;
		});

		render(<ClassicyDesktopMenuBar />);

		const firstItem = appleSubmenu()?.querySelector("li");
		// The extension must never be named as the "focused app" in the Apple menu.
		expect(firstItem?.id).not.toBe("AppleGuide.app_about_apple");
		expect(firstItem).not.toHaveTextContent("About Apple Guide");
	});
});
