import { produce } from "immer";
import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

function run(
	store: ClassicyStore,
	action: Record<string, unknown> & { type: string },
): ClassicyStore {
	return produce(store, (draft) => {
		classicyDesktopEventHandler(draft, action);
	});
}

const items: ClassicyMenuItem[] = [
	{ id: "Weather.app_about_data", title: "About Weather…" },
];

describe("Desktop helpMenu reducer", () => {
	it("stores items under the owning app id", () => {
		const next = run(DefaultAppManagerState, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "Weather.app" },
			helpItems: items,
		});
		expect(next.System.Manager.Desktop.helpMenu).toEqual({
			"Weather.app": items,
		});
	});

	it("keeps other apps' entries when one app registers", () => {
		let s = run(DefaultAppManagerState, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "Weather.app" },
			helpItems: items,
		});
		s = run(s, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "TV.app" },
			helpItems: [{ id: "TV.app_about_data", title: "About TV…" }],
		});
		expect(Object.keys(s.System.Manager.Desktop.helpMenu ?? {})).toEqual([
			"Weather.app",
			"TV.app",
		]);
	});

	it("removes only the named app's entry", () => {
		let s = run(DefaultAppManagerState, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "Weather.app" },
			helpItems: items,
		});
		s = run(s, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "TV.app" },
			helpItems: [{ id: "TV.app_about_data", title: "About TV…" }],
		});
		s = run(s, {
			type: "ClassicyDesktopHelpMenuRemove",
			app: { id: "Weather.app" },
		});
		expect(s.System.Manager.Desktop.helpMenu).toEqual({
			"TV.app": [{ id: "TV.app_about_data", title: "About TV…" }],
		});
	});

	it("ignores an Add with no helpItems array", () => {
		const next = run(DefaultAppManagerState, {
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: "Weather.app" },
		});
		expect(next.System.Manager.Desktop.helpMenu).toBeUndefined();
	});

	it("ignores a Remove for an app that never registered", () => {
		const next = run(DefaultAppManagerState, {
			type: "ClassicyDesktopHelpMenuRemove",
			app: { id: "Nope.app" },
		});
		expect(next.System.Manager.Desktop.helpMenu).toBeUndefined();
	});
});
