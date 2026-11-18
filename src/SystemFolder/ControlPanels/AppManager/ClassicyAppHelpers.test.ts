import { afterEach, describe, expect, it } from "vitest";
import {
	closeApp,
	focusApp,
	hideApp,
	hideOtherApps,
	loadApp,
	markAppFocused,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

// An app id is library input (a host's ClassicyApp id, a HyperCard stack's
// ClassicyAppOpen). Read with a plain index, `apps["__proto__"]` is
// Object.prototype, and assigned, it rewrites the apps record's prototype, so
// that id is never an app (CodeQL js/prototype-polluting-assignment).
const RESERVED = "__proto__";

const store = (): ClassicyStore => structuredClone(DefaultAppManagerState);

afterEach(() => {
	for (const key of ["open", "focused", "hidden", "windows"]) {
		delete (Object.prototype as Record<string, unknown>)[key];
	}
});

describe("the app helpers and the reserved __proto__ id", () => {
	it("never write to Object.prototype", () => {
		const ds = store();
		closeApp(ds, RESERVED);
		focusApp(ds, RESERVED);
		markAppFocused(ds, RESERVED);
		hideApp(ds, RESERVED);
		hideOtherApps(ds, RESERVED);
		const proto = Object.prototype as Record<string, unknown>;
		expect(Object.hasOwn(proto, "open")).toBe(false);
		expect(Object.hasOwn(proto, "focused")).toBe(false);
		expect(Object.hasOwn(proto, "hidden")).toBe(false);
	});

	it("never replace the apps record's prototype", () => {
		const ds = store();
		const apps = ds.System.Manager.Applications.apps;
		openApp(ds, RESERVED, "Evil", "");
		loadApp(ds, RESERVED, "Evil", "");
		expect(Object.getPrototypeOf(apps)).toBe(Object.prototype);
		expect(Object.hasOwn(apps, RESERVED)).toBe(false);
	});

	it("still open and close an ordinary app", () => {
		const ds = store();
		openApp(ds, "Ordinary.app", "Ordinary", "");
		expect(ds.System.Manager.Applications.apps["Ordinary.app"]?.open).toBe(
			true,
		);
		closeApp(ds, "Ordinary.app");
		expect(ds.System.Manager.Applications.apps["Ordinary.app"]?.open).toBe(
			false,
		);
	});
});
