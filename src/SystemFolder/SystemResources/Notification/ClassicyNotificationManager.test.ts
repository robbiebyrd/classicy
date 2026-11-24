import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	classicyNotificationMenuBarIcons,
	classicyNotify,
	getClassicyNotification,
	listClassicyNotifications,
	removeClassicyNotification,
	subscribeClassicyNotifications,
	useClassicyNotifications,
	useClassicyNotifiedAppIds,
} from "./ClassicyNotificationManager";
import {
	completeClassicyNotificationAlert,
	getClassicyNotificationEntries,
	markClassicyNotificationSoundPlayed,
	removeClassicyNotificationsWhere,
	resetClassicyNotificationsForTests,
	respondToClassicyNotification,
} from "./ClassicyNotificationStore.internal";

afterEach(() => {
	resetClassicyNotificationsForTests();
	vi.restoreAllMocks();
});

describe("classicyNotify (NMInstall)", () => {
	it("posts a request with the reference's defaults and returns its id", () => {
		const id = classicyNotify({ appId: "Mail.app" });
		expect(id).toBe("classicy-notification-1");
		expect(listClassicyNotifications()).toEqual([
			{ id, appId: "Mail.app", mark: true, removeOnActivate: true },
		]);
		expect(getClassicyNotification(id)?.appId).toBe("Mail.app");
	});

	it("keeps each field it is given, normalized", () => {
		const onResponse = vi.fn();
		const id = classicyNotify({
			appId: "Mail.app",
			message: "New mail has arrived.",
			mark: false,
			icon: "/mail.png",
			sound: "ClassicyAlertQuack",
			removeOnActivate: false,
			onResponse,
		});
		expect(getClassicyNotification(id)).toEqual({
			id,
			appId: "Mail.app",
			message: "New mail has arrived.",
			mark: false,
			icon: "/mail.png",
			sound: "ClassicyAlertQuack",
			removeOnActivate: false,
			onResponse,
		});
		expect(classicyNotify({ appId: "A.app", sound: true })).toBe(
			"classicy-notification-2",
		);
		expect(listClassicyNotifications()[1]?.sound).toBe(true);
	});

	it("drops empty and false fields: no alert, no sound, no icon", () => {
		const id = classicyNotify({
			appId: "Mail.app",
			message: "",
			sound: false,
			icon: false,
		});
		expect(getClassicyNotification(id)).toEqual({
			id,
			appId: "Mail.app",
			mark: true,
			icon: false,
			removeOnActivate: true,
		});
		const other = classicyNotify({ appId: "Mail.app", icon: "", sound: "" });
		expect(getClassicyNotification(other)).toEqual({
			id: other,
			appId: "Mail.app",
			mark: true,
			removeOnActivate: true,
		});
	});

	it("posts nothing without an appId", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(classicyNotify({ appId: "" })).toBe("");
		expect(classicyNotify(undefined as unknown as { appId: string })).toBe("");
		expect(listClassicyNotifications()).toEqual([]);
		expect(errors).toHaveBeenCalledWith(
			"[ClassicyNotification] A notification needs an appId; nothing was posted.",
		);
	});

	it("queues every request separately, oldest first", () => {
		const a = classicyNotify({ appId: "A.app" });
		const b = classicyNotify({ appId: "A.app" });
		const c = classicyNotify({ appId: "B.app" });
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([a, b, c]);
	});

	it("freezes what it stores", () => {
		const id = classicyNotify({ appId: "A.app" });
		expect(Object.isFrozen(getClassicyNotification(id))).toBe(true);
	});
});

describe("removeClassicyNotification (NMRemove)", () => {
	it("removes by id and says whether it did", () => {
		const a = classicyNotify({ appId: "A.app" });
		const b = classicyNotify({ appId: "B.app" });
		expect(removeClassicyNotification(a)).toBe(true);
		expect(removeClassicyNotification(a)).toBe(false);
		expect(removeClassicyNotification("nope")).toBe(false);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([b]);
	});

	it("removes every request a predicate matches", () => {
		classicyNotify({ appId: "A.app" });
		classicyNotify({ appId: "A.app" });
		const b = classicyNotify({ appId: "B.app" });
		expect(removeClassicyNotificationsWhere((n) => n.appId === "A.app")).toBe(
			2,
		);
		expect(removeClassicyNotificationsWhere(() => false)).toBe(0);
		expect(listClassicyNotifications().map((n) => n.id)).toEqual([b]);
	});

	it("never calls the response of a request removed before it", () => {
		const onResponse = vi.fn();
		const id = classicyNotify({ appId: "A.app", message: "Hi", onResponse });
		removeClassicyNotification(id);
		completeClassicyNotificationAlert(id);
		respondToClassicyNotification(id);
		expect(onResponse).not.toHaveBeenCalled();
	});
});

describe("subscriptions and hooks", () => {
	it("notifies subscribers on every change until unsubscribed", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyNotifications(listener);
		const id = classicyNotify({ appId: "A.app" });
		removeClassicyNotification(id);
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		classicyNotify({ appId: "A.app" });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("useClassicyNotifications re-renders with the requests", () => {
		const { result } = renderHook(() => useClassicyNotifications());
		expect(result.current).toEqual([]);
		act(() => {
			classicyNotify({ appId: "A.app" });
		});
		expect(result.current.map((n) => n.appId)).toEqual(["A.app"]);
	});

	it("useClassicyNotifiedAppIds lists the apps a request marks", () => {
		const { result } = renderHook(() => useClassicyNotifiedAppIds());
		act(() => {
			classicyNotify({ appId: "A.app" });
			classicyNotify({ appId: "B.app", mark: false });
		});
		expect([...result.current]).toEqual(["A.app"]);
	});

	it("keeps the public lists' identity across presentation progress", () => {
		const id = classicyNotify({ appId: "A.app", sound: true });
		const list = listClassicyNotifications();
		const entries = getClassicyNotificationEntries();
		expect(markClassicyNotificationSoundPlayed(id)?.id).toBe(id);
		expect(listClassicyNotifications()).toBe(list);
		expect(getClassicyNotificationEntries()).not.toBe(entries);
	});
});

describe("presentation progress", () => {
	it("hands out each sound once", () => {
		const id = classicyNotify({ appId: "A.app", sound: true });
		const silent = classicyNotify({ appId: "A.app" });
		expect(markClassicyNotificationSoundPlayed(id)?.sound).toBe(true);
		expect(markClassicyNotificationSoundPlayed(id)).toBeUndefined();
		expect(markClassicyNotificationSoundPlayed(silent)).toBeUndefined();
	});

	it("responds once, after the alert, and isolates a throwing response", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const onResponse = vi.fn(() => {
			throw new Error("boom");
		});
		const id = classicyNotify({ appId: "A.app", message: "Hi", onResponse });
		completeClassicyNotificationAlert(id);
		completeClassicyNotificationAlert(id);
		respondToClassicyNotification(id);
		expect(onResponse).toHaveBeenCalledTimes(1);
		expect(onResponse).toHaveBeenCalledWith(id);
		expect(errors).toHaveBeenCalled();
		expect(getClassicyNotification(id)).toBeDefined();
	});
});

describe("classicyNotificationMenuBarIcons", () => {
	const icon = (appId: string) => (appId === "NoIcon.app" ? "" : `/${appId}`);

	it("puts a marked, listed app's icon over the Application menu, others over the Apple menu", () => {
		classicyNotify({ appId: "Listed.app" });
		classicyNotify({ appId: "Listed.app", mark: false });
		classicyNotify({ appId: "NotListed.app" });
		classicyNotify({ appId: "Listed.app", icon: "/custom.png" });
		expect(
			classicyNotificationMenuBarIcons(
				listClassicyNotifications(),
				new Set(["Listed.app"]),
				icon,
			),
		).toEqual({
			apple: ["/Listed.app", "/NotListed.app"],
			application: ["/Listed.app", "/custom.png"],
		});
	});

	it("blinks nothing for icon: false or an app with no icon", () => {
		classicyNotify({ appId: "Listed.app", icon: false });
		classicyNotify({ appId: "NoIcon.app" });
		expect(
			classicyNotificationMenuBarIcons(
				listClassicyNotifications(),
				new Set(["Listed.app", "NoIcon.app"]),
				icon,
			),
		).toEqual({ apple: [], application: [] });
	});
});
