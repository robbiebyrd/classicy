import { describe, expect, it } from "vitest";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";

const app = (
	id: string,
	overrides: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: `/icons/${id}.png`,
	windows: [],
	open: true,
	data: {},
	...overrides,
});

describe("appSwitcherAppsFrom", () => {
	it("lists open apps", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app", { focused: true }),
			"TV.app": app("TV.app"),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app", "TV.app"]);
	});

	it("excludes closed, unfocused apps", () => {
		const result = appSwitcherAppsFrom({
			"TV.app": app("TV.app", { open: false }),
		});
		expect(result).toEqual([]);
	});

	it("excludes extensions even when open or focused", () => {
		const result = appSwitcherAppsFrom({
			"Finder.app": app("Finder.app"),
			"ClockExt.app": app("ClockExt.app", { extension: true }),
			"FocusedExt.app": app("FocusedExt.app", {
				extension: true,
				focused: true,
			}),
		});
		expect(result.map((a) => a.id)).toEqual(["Finder.app"]);
	});
});
