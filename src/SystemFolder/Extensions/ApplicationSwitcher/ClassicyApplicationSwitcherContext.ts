import { z } from "zod";
import { getClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import {
	focusApp,
	hideApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	listAppWindows,
	updateAppWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import {
	CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT,
	isClassicyAppSwitcherShortcut,
	nextClassicyAppSwitcherAppId,
} from "./ClassicyApplicationSwitcherCycle";

/**
 * The Application Switcher (Mac OS 8.5): the Application menu torn off into
 * a floating palette of the open applications, and switching applications
 * from the keyboard. A background extension the desktop mounts; its state is
 * `apps["ApplicationSwitcher.app"].data`.
 */
export const APPLICATION_SWITCHER_APP_ID = "ApplicationSwitcher.app";
export const APPLICATION_SWITCHER_APP_NAME = "Application Switcher";
/** The palette's window id (its record keeps the palette's position). */
export const APPLICATION_SWITCHER_PALETTE_ID = "applications";
/** The palette's title, as Mac OS 8.5 draws it. */
export const APPLICATION_SWITCHER_PALETTE_TITLE = "Applications";

export const APPLICATION_SWITCHER_PREFIX = "ClassicyAppApplicationSwitcher";
export const APPLICATION_SWITCHER_TEAR_OFF = `${APPLICATION_SWITCHER_PREFIX}TearOff`;
export const APPLICATION_SWITCHER_CLOSE = `${APPLICATION_SWITCHER_PREFIX}Close`;
export const APPLICATION_SWITCHER_SET_PALETTE = `${APPLICATION_SWITCHER_PREFIX}SetPalette`;
export const APPLICATION_SWITCHER_SET_CYCLING = `${APPLICATION_SWITCHER_PREFIX}SetCycling`;
export const APPLICATION_SWITCHER_CYCLE = `${APPLICATION_SWITCHER_PREFIX}Cycle`;
export const APPLICATION_SWITCHER_SWITCH = `${APPLICATION_SWITCHER_PREFIX}Switch`;

/** The palette's options and the keyboard switching settings. */
export type ClassicyApplicationSwitcherData = {
	/** The palette is torn off and shown. */
	paletteOpen?: boolean;
	/**
	 * Where the palette opens when its window has no record yet (the last
	 * tear-off's drop point, desktop coordinates). The window's record keeps
	 * where the user moves it after.
	 */
	paletteAt?: [number, number];
	/** Names beside the icons (the zoom box). Default `true`. */
	showNames?: boolean;
	/** Icon size (Option-click on the zoom box). Default `"small"`. */
	iconSize?: "small" | "large";
	/** Orientation (Option-Shift-click on the zoom box). Default `"vertical"`. */
	orientation?: "vertical" | "horizontal";
	/** Keyboard switching is on (AppleScript's `keyboard cycling active`). Default `true`. */
	keyboardCycling?: boolean;
	/**
	 * The chord that switches to the next application, in the menu-item form
	 * (`"⌃`"`); Shift added switches to the previous one. Default
	 * `CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT`.
	 */
	cyclingShortcut?: string;
};

const position = z.tuple([z.number(), z.number()]);

/** Manifest schema for `apps["ApplicationSwitcher.app"].data`. */
export const ClassicyApplicationSwitcherDataSchema = z.looseObject({
	paletteOpen: z
		.boolean()
		.optional()
		.describe("Whether the Application Switcher palette is torn off."),
	paletteAt: position
		.optional()
		.describe("Where the palette opens when its window has no record yet."),
	showNames: z
		.boolean()
		.optional()
		.describe("Whether the palette shows names beside the icons."),
	iconSize: z
		.enum(["small", "large"])
		.optional()
		.describe("The palette's icon size."),
	orientation: z
		.enum(["vertical", "horizontal"])
		.optional()
		.describe("Whether the palette's buttons run down or across."),
	keyboardCycling: z
		.boolean()
		.optional()
		.describe("Whether the keyboard chord switches applications."),
	cyclingShortcut: z
		.string()
		.optional()
		.describe(
			"The chord for the next application; with Shift, the previous one.",
		),
});

/** The data with every default filled in. */
export const classicyApplicationSwitcherSettings = (
	data: ClassicyApplicationSwitcherData | undefined,
): Required<Omit<ClassicyApplicationSwitcherData, "paletteAt">> &
	Pick<ClassicyApplicationSwitcherData, "paletteAt"> => ({
	paletteOpen: data?.paletteOpen === true,
	...(data?.paletteAt ? { paletteAt: data.paletteAt } : {}),
	showNames: data?.showNames !== false,
	iconSize: data?.iconSize === "large" ? "large" : "small",
	orientation: data?.orientation === "horizontal" ? "horizontal" : "vertical",
	keyboardCycling: data?.keyboardCycling !== false,
	cyclingShortcut:
		typeof data?.cyclingShortcut === "string" &&
		isClassicyAppSwitcherShortcut(data.cyclingShortcut)
			? data.cyclingShortcut
			: CLASSICY_APP_SWITCHER_DEFAULT_SHORTCUT,
});

const isPosition = (value: unknown): value is [number, number] =>
	Array.isArray(value) &&
	value.length === 2 &&
	value.every((n) => typeof n === "number" && Number.isFinite(n));

const appIdOf = (action: ActionMessage): string | undefined => {
	const app = (action as { app?: unknown }).app;
	if (typeof app !== "object" || app === null) return undefined;
	const id = (app as { id?: unknown }).id;
	return typeof id === "string" && id !== "" ? id : undefined;
};

/**
 * Whether a modal window (a dialog or an alert) is open anywhere: switching
 * waits for it, as Mac OS 8.5 dims the Application menu's items while an
 * alert is up.
 */
export const classicyModalWindowOpen = (ds: ClassicyStore): boolean =>
	Object.values(ds.System.Manager.Applications.apps).some((app) =>
		listAppWindows(app).some((w) => !w.closed && w.modal === true),
	);

/**
 * The applications the palette lists and the chord cycles through, in the
 * Application menu's order: every open application but the extensions.
 */
const switchableAppIds = (ds: ClassicyStore): string[] => {
	const applications = ds.System.Manager.Applications;
	return appSwitcherAppsFrom(
		applications.apps,
		getClassicyAppIdentityOverrides(ds.System.Manager.Appearance?.packageId),
		{ frontAppId: frontAppIdOf(applications) },
	)
		.filter((a) => a.open && !a.extension)
		.map((a) => a.id);
};

export const classicyApplicationSwitcherEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const app = ds.System.Manager.Applications.apps[APPLICATION_SWITCHER_APP_ID];
	if (!app) return ds;
	const data: ClassicyApplicationSwitcherData = { ...(app.data ?? {}) };

	switch (action.type) {
		case APPLICATION_SWITCHER_TEAR_OFF: {
			const at = (action as { position?: unknown }).position;
			data.paletteOpen = true;
			if (isPosition(at)) {
				data.paletteAt = [Math.round(at[0]), Math.round(at[1])];
				// A palette torn off again opens where it is dropped.
				updateAppWindow(app, APPLICATION_SWITCHER_PALETTE_ID, {
					position: data.paletteAt,
				});
			}
			break;
		}
		case APPLICATION_SWITCHER_CLOSE: {
			data.paletteOpen = false;
			break;
		}
		case APPLICATION_SWITCHER_SET_PALETTE: {
			const a = action as {
				showNames?: unknown;
				iconSize?: unknown;
				orientation?: unknown;
			};
			if (typeof a.showNames === "boolean") data.showNames = a.showNames;
			if (a.iconSize === "small" || a.iconSize === "large")
				data.iconSize = a.iconSize;
			if (a.orientation === "vertical" || a.orientation === "horizontal")
				data.orientation = a.orientation;
			break;
		}
		case APPLICATION_SWITCHER_SET_CYCLING: {
			const a = action as { enabled?: unknown; shortcut?: unknown };
			if (typeof a.enabled === "boolean") data.keyboardCycling = a.enabled;
			if (
				typeof a.shortcut === "string" &&
				isClassicyAppSwitcherShortcut(a.shortcut)
			)
				data.cyclingShortcut = a.shortcut;
			break;
		}
		case APPLICATION_SWITCHER_CYCLE: {
			const direction = (action as { direction?: unknown }).direction;
			if (direction !== 1 && direction !== -1) break;
			if (!classicyApplicationSwitcherSettings(data).keyboardCycling) break;
			if (classicyModalWindowOpen(ds)) break;
			const next = nextClassicyAppSwitcherAppId(
				switchableAppIds(ds),
				frontAppIdOf(ds.System.Manager.Applications),
				direction,
			);
			// The same path the Application menu takes: a hidden app is shown.
			if (next) focusApp(ds, next);
			return ds;
		}
		case APPLICATION_SWITCHER_SWITCH: {
			const target = appIdOf(action);
			if (!target || !switchableAppIds(ds).includes(target)) break;
			if (classicyModalWindowOpen(ds)) break;
			const front = frontAppIdOf(ds.System.Manager.Applications);
			focusApp(ds, target);
			// Option-click: switch, and hide the application that was in front.
			if ((action as { hideFront?: unknown }).hideFront === true && front) {
				if (front !== target) hideApp(ds, front);
			}
			return ds;
		}
	}

	app.data = data as Record<string, unknown>;
	return ds;
};

registerApp({
	id: APPLICATION_SWITCHER_APP_ID,
	description:
		"Tears the Application menu off into a floating palette of the open applications, and switches applications from the keyboard.",
	prefix: APPLICATION_SWITCHER_PREFIX,
	handler: classicyApplicationSwitcherEventHandler,
	actions: {
		[APPLICATION_SWITCHER_TEAR_OFF]: {
			description:
				"Show the Application Switcher palette, at a position on the desktop when one is given.",
			params: z.object({
				position: position
					.optional()
					.describe("Desktop coordinates of the palette's top-left corner."),
			}),
		},
		[APPLICATION_SWITCHER_CLOSE]: {
			description: "Close the Application Switcher palette.",
		},
		[APPLICATION_SWITCHER_SET_PALETTE]: {
			description:
				"Set the palette's options: names, icon size and orientation.",
			params: z.object({
				showNames: z.boolean().optional().describe("Show names."),
				iconSize: z
					.enum(["small", "large"])
					.optional()
					.describe("Small or large icons."),
				orientation: z
					.enum(["vertical", "horizontal"])
					.optional()
					.describe("Buttons down or across."),
			}),
		},
		[APPLICATION_SWITCHER_SET_CYCLING]: {
			description:
				"Turn keyboard switching on or off, or change its chord (Shift added goes backward).",
			params: z.object({
				enabled: z
					.boolean()
					.optional()
					.describe("Whether the chord switches applications."),
				shortcut: z
					.string()
					.optional()
					.describe(
						"The chord for the next application, with Control, Option or Command and no Shift.",
					),
			}),
		},
		[APPLICATION_SWITCHER_CYCLE]: {
			description:
				"Switch to the next (1) or previous (-1) open application in the Application menu's order.",
			params: z.object({
				direction: z
					.union([z.literal(1), z.literal(-1)])
					.describe("1 for the next application, -1 for the previous one."),
			}),
		},
		[APPLICATION_SWITCHER_SWITCH]: {
			description:
				"Switch to an open application, as a click in the palette does; hideFront also hides the application that was in front.",
			params: z.object({
				app: z.object({ id: z.string().describe("The application's id.") }),
				hideFront: z
					.boolean()
					.optional()
					.describe("Hide the application that was in front (Option-click)."),
			}),
		},
	},
	state: ClassicyApplicationSwitcherDataSchema,
});
