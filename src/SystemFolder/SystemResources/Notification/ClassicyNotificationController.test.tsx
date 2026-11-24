import { act, fireEvent, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { registerClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { holdClassicyStartup } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupHold.internal";
import {
	ClassicyNotificationController,
	classicyNotificationAlertWindowId,
	resetClassicyNotificationSpriteWarningsForTests,
} from "./ClassicyNotificationController.internal";
import {
	classicyNotify,
	listClassicyNotifications,
	removeClassicyNotification,
} from "./ClassicyNotificationManager";
import { resetClassicyNotificationsForTests } from "./ClassicyNotificationStore.internal";

// Story 0225-ci7: the Notification Manager's sound, alert, response and
// removal (Inside Macintosh: Processes, pp. 5-4 to 5-6).

const { players } = vi.hoisted(() => ({
	players: [] as {
		play: ReturnType<typeof vi.fn>;
		volume: ReturnType<typeof vi.fn>;
	}[],
}));

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn(() => 7);
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor() {
			players.push(this);
		}
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

registerClassicySoundPack({
	id: "platinum",
	name: "Platinum",
	src: ["platinum.mp3"],
	sprite: { ClassicyAlertQuack: [0, 100], ClassicyAlertSosumi: [100, 100] },
	alerts: [
		{ value: "ClassicyAlertQuack", label: "Quack" },
		{ value: "ClassicyAlertSosumi", label: "Sosumi" },
	],
	defaultAlert: "ClassicyAlertSosumi",
});

const app = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: `/icons/${id}.png`,
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

const renderController = (muted = false) =>
	render(
		<ClassicySoundManagerProvider defaultMuted={muted}>
			<ClassicyNotificationController />
		</ClassicySoundManagerProvider>,
	);

const player = () => players[players.length - 1];

const focused = () =>
	useAppManager.getState().System.Manager.Applications.focusedAppId;

const alertTexts = () =>
	screen.queryAllByRole("alertdialog").map((d) => d.getAttribute("aria-label"));

/** The alerts the user can see: none inside a `display: none` box. */
const visibleAlertTexts = () =>
	screen
		.queryAllByRole("alertdialog")
		.filter((d) => {
			for (let el: HTMLElement | null = d; el; el = el.parentElement)
				if (el.style.display === "none") return false;
			return true;
		})
		.map((d) => d.getAttribute("aria-label"));

/** The app whose windows hold the request's alert, if any. */
const alertOwner = (id: string) =>
	Object.values(useAppManager.getState().System.Manager.Applications.apps).find(
		(a) => getAppWindow(a, classicyNotificationAlertWindowId(id)),
	)?.id;

beforeEach(() => {
	players.length = 0;
	setStore((draft) => {
		draft.System.Manager.Applications.apps = {
			"Finder.app": app("Finder.app", { focused: true }),
			"Mail.app": app("Mail.app"),
			"Chat.app": app("Chat.app"),
		};
		draft.System.Manager.Applications.focusedAppId = "Finder.app";
		draft.System.Manager.Appearance.alertSound = "ClassicyAlertQuack";
		draft.System.Manager.Appearance.alertVolume = 50;
	});
});

afterEach(() => {
	act(() => resetClassicyNotificationsForTests());
	resetClassicyNotificationSpriteWarningsForTests();
	vi.restoreAllMocks();
});

// Review M7: StrictMode double-runs effects and reducers; one request is
// still one sound, one alert and one response.
describe("under StrictMode", () => {
	it("presents one request once", () => {
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<ClassicyNotificationController />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		const onResponse = vi.fn();
		notify({ appId: "Mail.app", sound: true, message: "Once.", onResponse });
		const played = players.flatMap((p) => p.play.mock.calls.map((c) => c[0]));
		expect(played).toEqual(["ClassicyAlertQuack"]);
		expect(alertTexts()).toEqual(["Once."]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledTimes(1);
		expect(alertTexts()).toEqual([]);
	});

	it("keeps a request whose own app hosts its alert", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps["Finder.app"].focused = false;
			draft.System.Manager.Applications.focusedAppId = undefined;
		});
		render(
			<StrictMode>
				<ClassicySoundManagerProvider>
					<ClassicyNotificationController />
				</ClassicySoundManagerProvider>
			</StrictMode>,
		);
		const id = notify({ appId: "Finder.app", message: "Finder." });
		expect(focused()).toBe("Finder.app");
		expect(alertTexts()).toEqual(["Finder."]);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
	});
});

// Review M9: a sprite no registered pack has would play nothing, silently.
describe("a sprite no pack has", () => {
	it("is logged once by name", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		renderController();
		notify({ appId: "Mail.app", sound: "ClassicyAlertQuak" });
		notify({ appId: "Mail.app", sound: "ClassicyAlertQuak" });
		notify({ appId: "Mail.app", sound: "ClassicyAlertSosumi" });
		const logged = warn.mock.calls.filter((c) =>
			String(c[0]).startsWith("[ClassicyNotification]"),
		);
		expect(logged).toEqual([
			[
				'[ClassicyNotification] No registered sound pack has the sprite "ClassicyAlertQuak"; the notification plays no sound.',
			],
		]);
	});
});

describe("the sound", () => {
	it("plays the user's alert sound at the alert volume", () => {
		renderController();
		notify({ appId: "Mail.app", sound: true });
		expect(player().play).toHaveBeenCalledTimes(1);
		expect(player().play).toHaveBeenCalledWith("ClassicyAlertQuack");
		// System volume (100%) × alert volume (50%), for that sound alone.
		expect(player().volume).toHaveBeenCalledWith(0.5, 7);
	});

	it("plays a named sprite at the alert volume", () => {
		renderController();
		notify({ appId: "Mail.app", sound: "ClassicyAlertSosumi" });
		expect(player().play).toHaveBeenCalledWith("ClassicyAlertSosumi");
		expect(player().volume).toHaveBeenCalledWith(0.5, 7);
	});

	it("is silent while sound is muted", () => {
		renderController(true);
		notify({ appId: "Mail.app", sound: true });
		notify({ appId: "Mail.app", sound: "ClassicyAlertSosumi" });
		expect(player().play).not.toHaveBeenCalled();
	});

	it("plays nothing for a request without a sound, alert included", () => {
		renderController();
		notify({ appId: "Mail.app", message: "Done." });
		expect(alertTexts()).toEqual(["Done."]);
		expect(player().play).not.toHaveBeenCalled();
	});

	it("plays each sound once, also across a remount", () => {
		const { unmount } = renderController();
		notify({ appId: "Mail.app", sound: true });
		unmount();
		renderController();
		expect(players.reduce((n, p) => n + p.play.mock.calls.length, 0)).toBe(1);
	});

	it("waits for Classicy's startup screen to go, as the system did (p. 5-10)", () => {
		renderController();
		let release = () => {};
		act(() => {
			release = holdClassicyStartup();
		});
		const onResponse = vi.fn();
		notify({ appId: "Mail.app", sound: true, message: "Hi" });
		notify({ appId: "Mail.app", onResponse });
		expect(player().play).not.toHaveBeenCalled();
		expect(alertTexts()).toEqual([]);
		expect(onResponse).not.toHaveBeenCalled();
		act(() => release());
		expect(player().play).toHaveBeenCalledTimes(1);
		expect(alertTexts()).toEqual(["Hi"]);
		expect(onResponse).toHaveBeenCalledTimes(1);
	});

	it("waits for a desktop: a request posted before mount sounds on mount", () => {
		notify({ appId: "Mail.app", sound: true });
		renderController();
		// The user's choice and level, not the pack's defaults.
		expect(player().play).toHaveBeenCalledTimes(1);
		expect(player().play).toHaveBeenCalledWith("ClassicyAlertQuack");
		expect(player().volume).toHaveBeenCalledWith(0.5, 7);
	});
});

describe("the alert", () => {
	it("shows one request's alert at a time, oldest first, responding after OK", () => {
		renderController();
		const first = vi.fn();
		const second = vi.fn();
		const a = notify({
			appId: "Mail.app",
			message: "Mail is here.",
			onResponse: first,
		});
		const b = notify({
			appId: "Chat.app",
			message: "Chat is here.",
			onResponse: second,
		});
		expect(alertTexts()).toEqual(["Mail is here."]);
		expect(first).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(first).toHaveBeenCalledWith(a);
		expect(alertTexts()).toEqual(["Chat is here."]);
		expect(second).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(second).toHaveBeenCalledWith(b);
		expect(alertTexts()).toEqual([]);
		// The mark and icon stay after the alert (p. 5-5).
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([a, b]);
	});

	it("opens over the front application without activating another", () => {
		renderController();
		const id = notify({ appId: "Mail.app", message: "Mail is here." });
		// Review M5: its window id carries this page's token, so a record a
		// reload left behind is never a known window.
		expect(classicyNotificationAlertWindowId(id)).toMatch(
			new RegExp(`^${id}-alert-[a-z0-9]+$`),
		);
		expect(focused()).toBe("Finder.app");
		const finder =
			useAppManager.getState().System.Manager.Applications.apps["Finder.app"];
		expect(
			getAppWindow(finder, classicyNotificationAlertWindowId(id)),
		).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(focused()).toBe("Finder.app");
		expect(listClassicyNotifications()).toHaveLength(1);
	});

	it("is dismissed, unanswered, when its request is removed", () => {
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Mail.app", message: "Hi", onResponse });
		expect(alertTexts()).toEqual(["Hi"]);
		act(() => {
			removeClassicyNotification(id);
		});
		expect(alertTexts()).toEqual([]);
		expect(onResponse).not.toHaveBeenCalled();
	});

	it("responds at once to a request with no alert", () => {
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Mail.app", onResponse });
		expect(onResponse).toHaveBeenCalledTimes(1);
		expect(onResponse).toHaveBeenCalledWith(id);
		notify({ appId: "Mail.app" });
		expect(onResponse).toHaveBeenCalledTimes(1);
	});
});

// Review I1: the alert stays a window of the app that was in front only
// while that app is open and shown; it never leaves an empty layer over the
// desktop.
describe("the alert's owner", () => {
	const setApps = (
		apps: Record<string, Partial<ClassicyStoreSystemApp>>,
		front: string | undefined,
	) =>
		setStore((draft) => {
			draft.System.Manager.Applications.apps = Object.fromEntries(
				Object.entries(apps).map(([id, extra]) => [id, app(id, extra)]),
			);
			draft.System.Manager.Applications.focusedAppId = front;
		});

	const threeApps = () =>
		setApps(
			{
				"Finder.app": { lastFocusedAt: 1 },
				"Calc.app": { focused: true, lastFocusedAt: 4 },
				"Mail.app": { lastFocusedAt: 2 },
				"Chat.app": { lastFocusedAt: 3 },
			},
			"Calc.app",
		);

	it("moves the alert to the app in front when its owner quits", () => {
		threeApps();
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Mail.app", message: "Mail.", onResponse });
		expect(alertOwner(id)).toBe("Calc.app");
		act(() => dispatch({ type: "ClassicyAppClose", app: { id: "Calc.app" } }));
		expect(focused()).toBe("Chat.app");
		expect(alertOwner(id)).toBe("Chat.app");
		expect(visibleAlertTexts()).toEqual(["Mail."]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(alertTexts()).toEqual([]);
		expect(alertOwner(id)).toBeUndefined();
	});

	it("moves the alert to the app in front when its owner is hidden", () => {
		threeApps();
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Mail.app", message: "Mail.", onResponse });
		act(() => dispatch({ type: "ClassicyAppHide", app: { id: "Calc.app" } }));
		expect(focused()).not.toBe("Calc.app");
		expect(alertOwner(id)).toBe(focused());
		expect(visibleAlertTexts()).toEqual(["Mail."]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(alertTexts()).toEqual([]);
	});

	it("opens over the Finder when no app is in front, else over an open app", () => {
		setApps({ "Finder.app": {}, "Mail.app": {}, "Chat.app": {} }, undefined);
		renderController();
		const a = notify({ appId: "Mail.app", message: "One." });
		expect(alertOwner(a)).toBe("Finder.app");
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		act(() =>
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					const apps = draft.System.Manager.Applications.apps;
					apps["Finder.app"].open = false;
					apps["Finder.app"].focused = false;
					apps["Chat.app"].focused = false;
					draft.System.Manager.Applications.focusedAppId = undefined;
				}),
				true,
			),
		);
		const b = notify({ appId: "Mail.app", message: "Two." });
		expect(alertOwner(b)).toBe("Chat.app");
		expect(visibleAlertTexts()).toEqual(["Two."]);
	});

	// Re-review, section 7: with no app in front the alert's host may be the
	// notifying app itself. The alert opening brings that app forward, which
	// is not the user activating it: the request and its alert stay, and the
	// app is treated as one that was in front when it posted, its requests
	// kept until it comes forward again.
	it("keeps the request when its own app hosts the alert", () => {
		setApps({ "Finder.app": {}, "Mail.app": {} }, undefined);
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Finder.app", message: "Finder.", onResponse });
		expect(alertOwner(id)).toBe("Finder.app");
		expect(focused()).toBe("Finder.app");
		expect(visibleAlertTexts()).toEqual(["Finder."]);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(alertTexts()).toEqual([]);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
		act(() => dispatch({ type: "ClassicyAppFocus", app: { id: "Mail.app" } }));
		act(() =>
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } }),
		);
		expect(listClassicyNotifications()).toEqual([]);
	});

	it("does the same for the only shown application", () => {
		setApps({ "Finder.app": { open: false }, "Mail.app": {} }, undefined);
		renderController();
		const onResponse = vi.fn();
		const id = notify({ appId: "Mail.app", message: "Mail.", onResponse });
		expect(alertOwner(id)).toBe("Mail.app");
		expect(focused()).toBe("Mail.app");
		expect(visibleAlertTexts()).toEqual(["Mail."]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
	});

	it("keeps the host's own requests queued behind another app's alert", () => {
		setApps({ "Finder.app": {}, "Mail.app": {} }, undefined);
		renderController();
		let first = "";
		let second = "";
		act(() => {
			first = classicyNotify({ appId: "Mail.app", message: "First." });
			second = classicyNotify({ appId: "Finder.app", message: "Second." });
		});
		expect(alertOwner(first)).toBe("Finder.app");
		expect(focused()).toBe("Finder.app");
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([
			first,
			second,
		]);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(visibleAlertTexts()).toEqual(["Second."]);
		// The user bringing an app forward still takes its requests down.
		act(() => dispatch({ type: "ClassicyAppFocus", app: { id: "Mail.app" } }));
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([second]);
	});

	it("waits, drawing nothing, while no app is shown", () => {
		setApps(
			{ "Finder.app": { open: false }, "Mail.app": { open: false } },
			undefined,
		);
		const { container } = renderController();
		const id = notify({ appId: "Mail.app", message: "Later." });
		expect(alertTexts()).toEqual([]);
		expect(container.innerHTML).toBe("");
		expect(document.querySelector(".classicyDesktopDialogOverlay")).toBeNull();
		act(() =>
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } }),
		);
		act(() =>
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Applications.apps["Finder.app"].open = true;
					draft.System.Manager.Applications.focusedAppId = "Finder.app";
				}),
				true,
			),
		);
		expect(alertOwner(id)).toBe("Finder.app");
		expect(visibleAlertTexts()).toEqual(["Later."]);
	});

	it("leaves no layer over the desktop: the alert's own scrim blocks it", () => {
		renderController();
		notify({ appId: "Mail.app", message: "Hi" });
		expect(document.querySelector(".classicyDesktopDialogOverlay")).toBeNull();
		expect(document.querySelector(".classicyWindowModalScrim")).not.toBeNull();
	});
});

describe("removal", () => {
	it("removes an app's requests when it comes to the front", () => {
		renderController();
		notify({ appId: "Mail.app" });
		const kept = notify({ appId: "Mail.app", removeOnActivate: false });
		const other = notify({ appId: "Chat.app" });
		act(() => dispatch({ type: "ClassicyAppFocus", app: { id: "Mail.app" } }));
		expect(focused()).toBe("Mail.app");
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([kept, other]);
	});

	it("keeps a request the front app posts until it comes forward again", () => {
		renderController();
		const id = notify({ appId: "Finder.app" });
		act(() =>
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } }),
		);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
		act(() => dispatch({ type: "ClassicyAppFocus", app: { id: "Mail.app" } }));
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
		act(() =>
			dispatch({ type: "ClassicyAppFocus", app: { id: "Finder.app" } }),
		);
		expect(listClassicyNotifications()).toEqual([]);
	});

	it("removes a quitting app's requests", () => {
		renderController();
		notify({ appId: "Mail.app", removeOnActivate: false });
		// Chat.app takes the front when Mail quits: keep its request there.
		const other = notify({ appId: "Chat.app", removeOnActivate: false });
		act(() => dispatch({ type: "ClassicyAppClose", app: { id: "Mail.app" } }));
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([other]);
	});

	it("keeps a request for an app that is not open until it opens", () => {
		act(() =>
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Applications.apps["Mail.app"].open = false;
				}),
				true,
			),
		);
		renderController();
		const id = notify({ appId: "Mail.app" });
		act(() => dispatch({ type: "ClassicyAppFocus", app: { id: "Chat.app" } }));
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([id]);
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: "Mail.app", name: "Mail", icon: "/icons/Mail.app.png" },
			}),
		);
		expect(focused()).toBe("Mail.app");
		expect(listClassicyNotifications()).toEqual([]);
	});
});
