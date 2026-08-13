import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	registerApp,
	validateAppStateForAction,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

function storeWithAppData(
	appId: string,
	data: Record<string, unknown>,
): ClassicyStore {
	const ds = structuredClone(DefaultAppManagerState);
	ds.System.Manager.Applications.apps[appId] = {
		id: appId,
		name: appId,
		icon: "",
		windows: [],
		open: true,
		data,
	};
	return ds;
}

describe("validateAppStateForAction", () => {
	afterEach(() => vi.restoreAllMocks());

	it("warns when routed app state fails its schema", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		registerApp({
			id: "T4Bad.app",
			description: "Validation test app.",
			prefix: "ClassicyAppT4Bad",
			handler: (ds) => ds,
			state: z.looseObject({
				openPaths: z.array(z.string()).optional().describe("Open paths."),
			}),
		});
		const ds = storeWithAppData("T4Bad.app", { openPaths: "not-an-array" });
		validateAppStateForAction(ds, { type: "ClassicyAppT4BadPing" });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][1]).toMatchObject({
			appId: "T4Bad.app",
			actionType: "ClassicyAppT4BadPing",
		});
	});

	it("stays silent when state passes, when data is empty, and for unmanifested apps", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = storeWithAppData("T4Bad.app", { openPaths: ["/a"] });
		validateAppStateForAction(ds, { type: "ClassicyAppT4BadPing" });
		const empty = storeWithAppData("T4Bad.app", {});
		validateAppStateForAction(empty, { type: "ClassicyAppT4BadPing" });
		const other = storeWithAppData("T4Other.app", { junk: 1 });
		validateAppStateForAction(other, { type: "ClassicyAppT4OtherPing" });
		expect(warn).not.toHaveBeenCalled();
	});

	it("resolves generic ClassicyApp* actions via action.app.id", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ds = storeWithAppData("T4Bad.app", { openPaths: 42 });
		validateAppStateForAction(ds, {
			type: "ClassicyAppFocus",
			app: { id: "T4Bad.app" },
		});
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("prefers the longest matching prefix", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		registerApp({
			id: "T4Long.app",
			description: "Longer-prefix app.",
			prefix: "ClassicyAppT4BadExtra",
			handler: (ds) => ds,
			state: z.looseObject({
				count: z.number().optional().describe("A count."),
			}),
		});
		const ds = storeWithAppData("T4Long.app", { count: "nope" });
		validateAppStateForAction(ds, { type: "ClassicyAppT4BadExtraPing" });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][1]).toMatchObject({ appId: "T4Long.app" });
	});
});
