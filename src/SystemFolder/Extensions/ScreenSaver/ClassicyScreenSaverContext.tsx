import { z } from "zod";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	type ClassicyScreenSaverConfig,
	getClassicyScreenSaver,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

export const SCREEN_SAVER_APP_ID = "ScreenSaver.app";
export const SCREEN_SAVER_APP_NAME = "Screen Saver";

export const SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES = 5;
export const SCREEN_SAVER_MIN_TIMEOUT_MINUTES = 1;
export const SCREEN_SAVER_MAX_TIMEOUT_MINUTES = 240;
export const SCREEN_SAVER_DEFAULT_SAVER_ID = "bouncing-ball";

/**
 * Event that activates the screensaver immediately. Exported (and marked
 * scriptable) so hosts and HyperCard stacks don't hardcode the action string.
 */
export const SCREEN_SAVER_ACTIVATE_EVENT =
	"ClassicyAppScreenSaverActivate" as const;

export type ScreenSaverData = {
	/** Master switch; `false` disables idle activation AND Activate commands. */
	enabled?: boolean;
	/** Minutes of inactivity before the saver starts. */
	timeoutMinutes?: number;
	/** Id of the registered screensaver to run. */
	selectedSaver?: string;
	/** Whether the saver is on screen right now. Transient — never persisted. */
	active?: boolean;
	/** Saved options per saver id (e.g. bouncing-ball's ball count). */
	saverConfigs?: Record<string, ClassicyScreenSaverConfig>;
};

/** Manifest schema for ScreenSaver.app's `data` (see registerApp). */
export const ScreenSaverDataSchema = z.looseObject({
	enabled: z
		.boolean()
		.optional()
		.describe(
			"Master switch; false disables idle activation and Activate commands.",
		),
	timeoutMinutes: z
		.number()
		.optional()
		.describe("Minutes of inactivity before the saver starts."),
	selectedSaver: z
		.string()
		.optional()
		.describe("Id of the registered screensaver to run."),
	active: z
		.boolean()
		.optional()
		.describe("Whether the saver is on screen right now (transient)."),
	saverConfigs: z
		.record(z.string(), z.record(z.string(), z.unknown()))
		.optional()
		.describe("Saved options per saver id."),
});

export function isScreenSaverEnabled(data: ScreenSaverData): boolean {
	return data.enabled !== false;
}

export function screenSaverTimeoutMinutes(data: ScreenSaverData): number {
	const raw = data.timeoutMinutes;
	if (typeof raw !== "number" || !Number.isFinite(raw)) {
		return SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES;
	}
	return Math.min(
		Math.max(raw, SCREEN_SAVER_MIN_TIMEOUT_MINUTES),
		SCREEN_SAVER_MAX_TIMEOUT_MINUTES,
	);
}

const devWarn = (...args: unknown[]) => {
	if (process.env.NODE_ENV !== "production") {
		console.warn("[ScreenSaver]", ...args);
	}
};

export const classicyScreenSaverEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	const app = ds.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID];
	if (!app) return ds;

	const appData: ScreenSaverData = { ...(app.data ?? {}) };

	switch (action.type) {
		case SCREEN_SAVER_ACTIVATE_EVENT: {
			if (!isScreenSaverEnabled(appData)) break;
			appData.active = true;
			break;
		}
		case "ClassicyAppScreenSaverDeactivate": {
			appData.active = false;
			break;
		}
		case "ClassicyAppScreenSaverSetSaver": {
			const saverId =
				"saverId" in action && typeof action.saverId === "string"
					? action.saverId
					: undefined;
			if (!saverId) break;
			if (!getClassicyScreenSaver(saverId)) {
				devWarn("Unknown screensaver id", saverId);
				break;
			}
			appData.selectedSaver = saverId;
			break;
		}
		case "ClassicyAppScreenSaverSetTimeout": {
			const minutes =
				"minutes" in action && typeof action.minutes === "number"
					? action.minutes
					: Number.NaN;
			if (!Number.isFinite(minutes)) break;
			appData.timeoutMinutes = Math.min(
				Math.max(minutes, SCREEN_SAVER_MIN_TIMEOUT_MINUTES),
				SCREEN_SAVER_MAX_TIMEOUT_MINUTES,
			);
			break;
		}
		case "ClassicyAppScreenSaverSetEnabled": {
			if (!("enabled" in action) || typeof action.enabled !== "boolean") break;
			appData.enabled = action.enabled;
			// Turning the feature off also dismisses a running saver.
			if (!action.enabled) appData.active = false;
			break;
		}
		case "ClassicyAppScreenSaverSetConfig": {
			const saverId =
				"saverId" in action && typeof action.saverId === "string"
					? action.saverId
					: undefined;
			const patch =
				"config" in action &&
				typeof action.config === "object" &&
				action.config !== null &&
				!Array.isArray(action.config)
					? (action.config as ClassicyScreenSaverConfig)
					: undefined;
			if (!saverId || !patch) break;
			const saver = getClassicyScreenSaver(saverId);
			if (!saver) {
				devWarn("SetConfig for unknown screensaver id", saverId);
				break;
			}
			const merged = {
				...(saver.defaultConfig ?? {}),
				...(appData.saverConfigs?.[saverId] ?? {}),
				...patch,
			};
			let next: ClassicyScreenSaverConfig = merged;
			if (saver.configSchema) {
				const parsed = saver.configSchema.safeParse(merged);
				if (!parsed.success) {
					devWarn("SetConfig rejected by saver schema", saverId, parsed.error);
					break;
				}
				next = parsed.data as ClassicyScreenSaverConfig;
			}
			appData.saverConfigs = {
				...(appData.saverConfigs ?? {}),
				[saverId]: next,
			};
			break;
		}
	}

	app.data = appData as Record<string, unknown>;
	return ds;
};

// Self-register so the kernel router dispatches ClassicyAppScreenSaver*
// events without a hard-wired import (same pattern as AppleGuide).
registerApp({
	id: SCREEN_SAVER_APP_ID,
	description:
		"Idle-activated full-screen screensavers with per-saver options.",
	prefix: "ClassicyAppScreenSaver",
	handler: classicyScreenSaverEventHandler,
	actions: {
		[SCREEN_SAVER_ACTIVATE_EVENT]: {
			description:
				"Start the selected screensaver immediately (ignored while disabled).",
			// A stack darkening the screen is harmless and instantly reversible
			// by any user activity, so this is the one scriptable entry point.
			scriptable: true,
		},
		ClassicyAppScreenSaverDeactivate: {
			description: "Dismiss the running screensaver.",
		},
		ClassicyAppScreenSaverSetSaver: {
			description: "Choose which registered screensaver runs.",
			params: z.object({
				saverId: z.string().describe("Id of a registered screensaver."),
			}),
		},
		ClassicyAppScreenSaverSetTimeout: {
			description: "Set the idle timeout before the saver starts.",
			params: z.object({
				minutes: z
					.number()
					.describe("Minutes of inactivity (clamped to 1–240)."),
			}),
		},
		ClassicyAppScreenSaverSetEnabled: {
			description:
				"Turn the screensaver feature on or off (off also dismisses it).",
			params: z.object({
				enabled: z.boolean().describe("Whether idle activation is enabled."),
			}),
		},
		ClassicyAppScreenSaverSetConfig: {
			description:
				"Merge option values into a saver's saved config (validated against the saver's schema).",
			params: z.object({
				saverId: z.string().describe("Id of the saver the options belong to."),
				config: z
					.record(z.string(), z.unknown())
					.describe("Option values to merge into the saved config."),
			}),
		},
	},
	state: ScreenSaverDataSchema,
});
