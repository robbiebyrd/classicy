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
import { CLASSICY_NOTIFICATION_BLINK_MS } from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationBlink.internal";
import {
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

	it("shows the titles' own icons while a menu is open", () => {
		render(<ClassicyDesktopMenuBar />);
		notify({ appId: "Mail.app" });
		expect(switcherImage()).toBe("/icons/Mail.png");
		fireEvent.click(switcher().querySelector("p") ?? switcher());
		expect(switcherImage()).toBe("/icons/Finder.png");
		fireEvent.mouseDown(document.body);
		expect(switcherImage()).toBe("/icons/Mail.png");
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
