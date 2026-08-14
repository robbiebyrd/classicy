import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { render } from "@/__tests__/test-utils";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
// Register the built-ins for handler-side saver lookups.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
import { ClassicyScreenSaverConfigForm } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverConfigForm";
import {
	classicyScreenSaverEventHandler,
	SCREEN_SAVER_APP_ID,
	type ScreenSaverData,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	getClassicyScreenSaver,
	listClassicyScreenSavers,
	registerClassicyScreenSaver,
	resolveScreenSaverConfig,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

const makeStore = (data: ScreenSaverData = {}): ClassicyStore =>
	({
		System: {
			Manager: {
				Applications: {
					apps: {
						[SCREEN_SAVER_APP_ID]: {
							id: SCREEN_SAVER_APP_ID,
							name: "Screen Saver",
							icon: "",
							open: true,
							windows: [],
							data: data as Record<string, unknown>,
						},
					},
					fileTypeHandlers: {},
				},
			},
		},
	}) as unknown as ClassicyStore;

const dataOf = (ds: ClassicyStore): ScreenSaverData =>
	ds.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]
		.data as ScreenSaverData;

describe("screensaver registry", () => {
	it("registers and lists built-in savers sorted by name", () => {
		const names = listClassicyScreenSavers().map((s) => s.name);
		expect(names).toContain("Flying Toasters");
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		expect(listClassicyScreenSavers().length).toBeGreaterThanOrEqual(12);
	});

	it("re-registering an id replaces the entry", () => {
		const Original = () => null;
		const Replacement = () => null;
		registerClassicyScreenSaver({
			id: "test-replace",
			name: "One",
			component: Original,
		});
		registerClassicyScreenSaver({
			id: "test-replace",
			name: "Two",
			component: Replacement,
		});
		expect(getClassicyScreenSaver("test-replace")?.name).toBe("Two");
	});

	it("resolves config: schema defaults under saved values", () => {
		const saver = registerClassicyScreenSaver({
			id: "test-resolve",
			name: "Resolve",
			component: () => null,
			configSchema: z.looseObject({
				count: z.number().min(1).max(10).default(3),
				label: z.string().default("hi"),
			}),
		});
		expect(resolveScreenSaverConfig(saver, undefined)).toEqual({
			count: 3,
			label: "hi",
		});
		expect(resolveScreenSaverConfig(saver, { count: 7 })).toEqual({
			count: 7,
			label: "hi",
		});
		// Out-of-range saved values fall back to defaults rather than leaking through.
		expect(resolveScreenSaverConfig(saver, { count: 99 })).toEqual({
			count: 3,
			label: "hi",
		});
	});
});

describe("classicyScreenSaverEventHandler", () => {
	it("Activate sets active; Deactivate clears it", () => {
		let ds = makeStore();
		ds = classicyScreenSaverEventHandler(ds, {
			type: "ClassicyAppScreenSaverActivate",
		});
		expect(dataOf(ds).active).toBe(true);
		ds = classicyScreenSaverEventHandler(ds, {
			type: "ClassicyAppScreenSaverDeactivate",
		});
		expect(dataOf(ds).active).toBe(false);
	});

	it("Activate is ignored while disabled", () => {
		const ds = classicyScreenSaverEventHandler(makeStore({ enabled: false }), {
			type: "ClassicyAppScreenSaverActivate",
		});
		expect(dataOf(ds).active).toBeUndefined();
	});

	it("SetSaver accepts registered ids and rejects unknown ones", () => {
		let ds = classicyScreenSaverEventHandler(makeStore(), {
			type: "ClassicyAppScreenSaverSetSaver",
			saverId: "flying-toasters",
		});
		expect(dataOf(ds).selectedSaver).toBe("flying-toasters");
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		ds = classicyScreenSaverEventHandler(ds, {
			type: "ClassicyAppScreenSaverSetSaver",
			saverId: "not-a-saver",
		});
		expect(dataOf(ds).selectedSaver).toBe("flying-toasters");
		warn.mockRestore();
	});

	it("SetTimeout clamps into 1–240 minutes", () => {
		let ds = classicyScreenSaverEventHandler(makeStore(), {
			type: "ClassicyAppScreenSaverSetTimeout",
			minutes: 0,
		});
		expect(dataOf(ds).timeoutMinutes).toBe(1);
		ds = classicyScreenSaverEventHandler(ds, {
			type: "ClassicyAppScreenSaverSetTimeout",
			minutes: 999,
		});
		expect(dataOf(ds).timeoutMinutes).toBe(240);
	});

	it("SetEnabled false also dismisses a running saver", () => {
		const ds = classicyScreenSaverEventHandler(makeStore({ active: true }), {
			type: "ClassicyAppScreenSaverSetEnabled",
			enabled: false,
		});
		expect(dataOf(ds).enabled).toBe(false);
		expect(dataOf(ds).active).toBe(false);
	});

	it("SetConfig merges validated patches per saver", () => {
		const ds = classicyScreenSaverEventHandler(makeStore(), {
			type: "ClassicyAppScreenSaverSetConfig",
			saverId: "bouncing-ball",
			config: { balls: 7 },
		});
		expect(dataOf(ds).saverConfigs?.["bouncing-ball"]).toEqual({ balls: 7 });
	});

	it("SetConfig rejects patches failing the saver's schema", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = classicyScreenSaverEventHandler(makeStore(), {
			type: "ClassicyAppScreenSaverSetConfig",
			saverId: "bouncing-ball",
			config: { balls: 999 },
		});
		expect(dataOf(ds).saverConfigs?.["bouncing-ball"]).toBeUndefined();
		warn.mockRestore();
	});
});

describe("persistence", () => {
	it("strips the transient active flag before persisting", () => {
		const state = makeStore({ active: true, selectedSaver: "fish" });
		// sanitize expects the full manager shape; graft the minimum it touches.
		(state.System.Manager as unknown as Record<string, unknown>).Boot = {
			paradeIcons: [],
		};
		(state.System.Manager as unknown as Record<string, unknown>).Keyboard = {
			app: {},
			system: [],
			global: {},
		};
		const cleaned = sanitizeStateForPersistence(state);
		expect(dataOf(cleaned).active).toBeUndefined();
		expect(dataOf(cleaned).selectedSaver).toBe("fish");
		// The live store is untouched.
		expect(dataOf(state).active).toBe(true);
	});
});

describe("ClassicyScreenSaverConfigForm", () => {
	it("derives controls from a saver's schema", () => {
		const saver = getClassicyScreenSaver("rainstorm");
		expect(saver).toBeDefined();
		if (!saver) return;
		const onChange = vi.fn();
		render(
			<ClassicyScreenSaverConfigForm
				saver={saver}
				config={resolveScreenSaverConfig(saver, undefined)}
				onChange={onChange}
			/>,
		);
		// boolean → checkbox
		const lightning = screen.getByLabelText(/lightning/i);
		fireEvent.click(lightning);
		expect(onChange).toHaveBeenCalledWith({ lightning: false });
		// enum → pop-up menu options
		expect(screen.getByText(/How many layers of rain fall/i)).toBeDefined();
	});
});
