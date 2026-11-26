import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

import {
	CLASSICY_NOTIFICATION_BLINK_MS,
	classicyNotify,
	removeClassicyNotification,
} from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationManager";
import { resetClassicyNotificationsForTests } from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationStore.internal";

// Story 0225-ci7: the Notification Manager's two menu-bar surfaces (Inside
// Macintosh: Processes, p. 5-4, Figure 5-1): the ◆ beside a marked app in
// the Application menu, and the request's icon alternating with the
// Application menu's (a marked app it lists) or the Apple menu's.

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

const app = (
	id: string,
	name: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name,
	icon: `/icons/${name}.png`,
	windows: {},
	open: true,
	focused: false,
	data: {},
	...extra,
});

const setStore = (mutate: (draft: ClassicyStore) => void) =>
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});

const notify = (request: Parameters<typeof classicyNotify>[0]) => {
	let id = "";
	act(() => {
		id = classicyNotify(request);
	});
	return id;
};

const switcher = () => document.querySelector("#app-switcher") as HTMLElement;
const switcherImage = () =>
	switcher().querySelector(":scope > p > img")?.getAttribute("src");
const appleImage = () =>
	document.querySelector("#apple-menu > p > img")?.getAttribute("src");

/** Each Application menu app row: [id, mark] where mark is ✓, ◆ or "". */
const appRows = () => {
	fireEvent.click(switcher().querySelector("p") ?? switcher());
	const rows = [
		...switcher().querySelectorAll(
			":scope .classicyMenuWrapper ul > li.classicyMenuItem",
		),
	]
		.filter((li) => !li.id.startsWith("app-switcher_"))
		.map((li) => {
			const mark = li.querySelector(".classicyMenuItemCheck");
			return [
				li.id,
				mark?.classList.contains("checked")
					? "✓"
					: mark?.classList.contains("classicyMenuItemDiamond")
						? "◆"
						: "",
			];
		});
	fireEvent.mouseDown(document.body);
	return rows;
};

beforeEach(() => {
	setStore((draft) => {
		draft.System.Manager.Applications.apps = {
			"Finder.app": app("Finder.app", "Finder", { focused: true }),
			"Mail.app": app("Mail.app", "Mail"),
			"Closed.app": app("Closed.app", "Closed", { open: false }),
		};
		draft.System.Manager.Applications.focusedAppId = "Finder.app";
	});
});

afterEach(() => {
	act(() => resetClassicyNotificationsForTests());
	vi.useRealTimers();
});

describe("the ◆ mark in the Application menu", () => {
	it("marks a background app a request marks", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(appRows()).toEqual([
			["Finder.app", "✓"],
			["Mail.app", ""],
		]);
		notify({ appId: "Mail.app" });
		expect(appRows()).toEqual([
			["Finder.app", "✓"],
			["Mail.app", "◆"],
		]);
	});

	it("keeps the front app's check: the check replaces the diamond", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Finder.app" });
		expect(appRows()).toEqual([
			["Finder.app", "✓"],
			["Mail.app", ""],
		]);
	});

	it("draws no mark for mark: false, and none once the request is removed", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Mail.app", mark: false });
		const id = notify({ appId: "Mail.app" });
		expect(appRows()[1]).toEqual(["Mail.app", "◆"]);
		act(() => {
			removeClassicyNotification(id);
		});
		expect(appRows()[1]).toEqual(["Mail.app", ""]);
	});

	it("lists no mark for an app the menu does not list", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Closed.app" });
		expect(appRows().map(([id]) => id)).toEqual(["Finder.app", "Mail.app"]);
	});

	// Stories 0233-c79 and 0225-ci7 together: the marks follow the front
	// application (`useFrontAppId`), which an extension holding the focus
	// flag with a floating, menuless window (Apple Guide) never replaces.
	it("follows the front application while an extension holds the focus flag", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": app("Finder.app", "Finder", { lastFocusedAt: 1 }),
				"Calc.app": app("Calc.app", "Calc", { lastFocusedAt: 5 }),
				"Mail.app": app("Mail.app", "Mail", { lastFocusedAt: 3 }),
				"Guide.app": app("Guide.app", "Guide", {
					extension: true,
					focused: true,
					lastFocusedAt: 9,
					windows: {
						topic: {
							id: "topic",
							appId: "Guide.app",
							focused: true,
							closed: false,
						} as ClassicyStoreSystemApp["windows"][string],
					},
				}),
			};
			draft.System.Manager.Applications.focusedAppId = "Guide.app";
		});
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Mail.app" });
		notify({ appId: "Calc.app" });
		// Calc is in front: its check replaces its own diamond, Mail (in the
		// background) has the ◆, and the guide is not listed. The menu lists
		// them in alphabetical order (story 0231-8c6).
		expect(appRows()).toEqual([
			["Calc.app", "✓"],
			["Finder.app", ""],
			["Mail.app", "◆"],
		]);
		expect(switcher().textContent).toContain("Calc");
	});
});

// Review M10: the blinking title says what it carries.
describe("the titles' descriptions", () => {
	const description = (selector: string) =>
		document.querySelector(selector)?.getAttribute("aria-description");

	it("names the apps whose requests a title carries", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(description("#app-switcher")).toBeNull();
		expect(description("#apple-menu")).toBeNull();
		notify({ appId: "Mail.app" });
		expect(description("#app-switcher")).toBe("Mail requests your attention");
		notify({ appId: "Finder.app", icon: false });
		expect(description("#app-switcher")).toBe(
			"Mail and Finder request your attention",
		);
		const id = notify({ appId: "Closed.app", mark: false });
		expect(description("#apple-menu")).toBe("Closed requests your attention");
		act(() => {
			removeClassicyNotification(id);
		});
		expect(description("#apple-menu")).toBeNull();
	});
});

describe("the blinking icon", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it("alternates a marked app's icon with the Application menu's", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(switcherImage()).toBe("/icons/Finder.png");
		notify({ appId: "Mail.app" });
		expect(switcherImage()).toBe("/icons/Mail.png");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(switcherImage()).toBe("/icons/Finder.png");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(switcherImage()).toBe("/icons/Mail.png");
		const apple = appleImage();
		expect(apple).not.toBe("/icons/Mail.png");
	});

	// Mac OS 8.5 (the 8.5 audit's F1, `platinum-85-appmenu-blink-name.png`
	// and `-blink-request.png`): a request's frame is its icon alone,
	// centered in the title; the name is hidden but kept, so the title's
	// width, the grip and the clock do not move. The other frame is the
	// front application's icon and name. (This replaces 0225-ci7's R11, "the
	// name stays", unsourced for 8.5 then.)
	it("draws a request's frame as its icon alone, the name kept for the title's width", () => {
		render(<ClassicyDesktopMenuBar />);
		const name = () =>
			switcher().querySelector(".classicyDesktopMenuAppSwitcherName");
		expect(switcher()).not.toHaveClass("classicyDesktopMenuAppSwitcherRequest");
		notify({ appId: "Mail.app" });
		expect(switcherImage()).toBe("/icons/Mail.png");
		expect(switcher()).toHaveClass("classicyDesktopMenuAppSwitcherRequest");
		expect(name()?.textContent).toBe("Finder");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(switcherImage()).toBe("/icons/Finder.png");
		expect(switcher()).not.toHaveClass("classicyDesktopMenuAppSwitcherRequest");
		expect(name()?.textContent).toBe("Finder");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(switcher()).toHaveClass("classicyDesktopMenuAppSwitcherRequest");
		// Open, the title is the front application's, icon and name.
		fireEvent.click(switcher().querySelector("p") ?? switcher());
		expect(switcherImage()).toBe("/icons/Finder.png");
		expect(switcher()).not.toHaveClass("classicyDesktopMenuAppSwitcherRequest");
		fireEvent.mouseDown(document.body);
	});

	it("blinks an unmarked request's icon over the Apple menu", () => {
		render(<ClassicyDesktopMenuBar />);
		const apple = appleImage();
		notify({ appId: "Mail.app", mark: false, icon: "/bell.png" });
		expect(appleImage()).toBe("/bell.png");
		expect(switcherImage()).toBe("/icons/Finder.png");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(appleImage()).toBe(apple);
	});

	it("blinks an app the menu does not list over the Apple menu", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Closed.app" });
		expect(appleImage()).toBe("/icons/Closed.png");
		expect(switcherImage()).toBe("/icons/Finder.png");
	});

	it("blinks nothing for icon: false, and stops when the request goes", () => {
		render(<ClassicyDesktopMenuBar />);
		const apple = appleImage();
		notify({ appId: "Mail.app", icon: false });
		expect(switcherImage()).toBe("/icons/Finder.png");
		const id = notify({ appId: "Mail.app" });
		expect(switcherImage()).toBe("/icons/Mail.png");
		act(() => {
			removeClassicyNotification(id);
		});
		expect(switcherImage()).toBe("/icons/Finder.png");
		expect(appleImage()).toBe(apple);
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS * 3);
		});
		expect(switcherImage()).toBe("/icons/Finder.png");
		expect(appleImage()).toBe(apple);
	});

	// Review M4, observed on Mac OS 8.1 (Infinite Mac; report, fix round 1):
	// the open Application menu's title shows its own icon, and while
	// another menu is open the blink stops on the frame it showed.
	it("shows the open title's own icon, and freezes the blink under another open menu", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Mail.app" });
		expect(switcherImage()).toBe("/icons/Mail.png");
		fireEvent.click(switcher().querySelector("p") ?? switcher());
		expect(switcherImage()).toBe("/icons/Finder.png");
		fireEvent.mouseDown(document.body);
		expect(switcherImage()).toBe("/icons/Mail.png");
		const apple = document.querySelector("#apple-menu > p") as HTMLElement;
		fireEvent.click(apple);
		expect(document.querySelector("#apple-menu")).toHaveClass("open");
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS * 3);
		});
		expect(switcherImage()).toBe("/icons/Mail.png");
		fireEvent.mouseDown(document.body);
		act(() => {
			vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
		});
		expect(switcherImage()).toBe("/icons/Finder.png");
	});

	it("shows the Apple title's own art while its menu is open", () => {
		render(<ClassicyDesktopMenuBar />);
		const art = appleImage();
		notify({ appId: "Mail.app", mark: false, icon: "/bell.png" });
		expect(appleImage()).toBe("/bell.png");
		fireEvent.click(document.querySelector("#apple-menu > p") as HTMLElement);
		expect(appleImage()).toBe(art);
	});

	// Review M3: nothing blinks where the bar is not drawn.
	it("runs no blink timer under window placement", () => {
		const intervals = vi.spyOn(window, "setInterval");
		render(<ClassicyDesktopMenuBar placement="window" />);
		notify({ appId: "Mail.app" });
		notify({ appId: "Closed.app" });
		expect(
			intervals.mock.calls.filter(
				([, ms]) =>
					ms === CLASSICY_NOTIFICATION_BLINK_MS ||
					ms === CLASSICY_NOTIFICATION_BLINK_MS / 2,
			),
		).toEqual([]);
		intervals.mockRestore();
	});

	describe("for users who prefer reduced motion", () => {
		beforeEach(() => {
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: query === "(prefers-reduced-motion: reduce)",
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				})),
			);
		});
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("shows the request's icon steadily instead of blinking", () => {
			render(<ClassicyDesktopMenuBar />);
			notify({ appId: "Mail.app" });
			for (let i = 0; i < 4; i++) {
				expect(switcherImage()).toBe("/icons/Mail.png");
				act(() => {
					vi.advanceTimersByTime(CLASSICY_NOTIFICATION_BLINK_MS);
				});
			}
		});
	});
});
