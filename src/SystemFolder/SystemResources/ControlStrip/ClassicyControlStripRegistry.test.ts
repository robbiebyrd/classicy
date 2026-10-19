import { describe, expect, it } from "vitest";
import {
	arrangeClassicyControlStripModules,
	type ClassicyControlStripModuleRegistration,
	classicyControlStripOpenControlPanelItem,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";

const reg = (
	id: string,
	sequence: number,
	appId?: string,
): ClassicyControlStripModuleRegistration => ({
	definition: { id, label: id, icon: "", ...(appId ? { appId } : {}) },
	sequence,
	revision: 0,
});

describe("arrangeClassicyControlStripModules", () => {
	const all = [reg("a", 0), reg("b", 1), reg("c", 2, "C.app"), reg("d", 3)];
	const ids = (list: ClassicyControlStripModuleRegistration[]) =>
		list.map((r) => r.definition.id);

	it("keeps declared order and drops modules whose owner is not mounted", () => {
		expect(
			ids(arrangeClassicyControlStripModules(all, { mountedApps: new Set() })),
		).toEqual(["a", "b", "d"]);
		expect(
			ids(
				arrangeClassicyControlStripModules(all, {
					mountedApps: new Set(["C.app"]),
				}),
			),
		).toEqual(["a", "b", "c", "d"]);
	});

	it("drops host-disabled modules", () => {
		expect(
			ids(
				arrangeClassicyControlStripModules(all, {
					disabledModules: ["b"],
					mountedApps: new Set(),
				}),
			),
		).toEqual(["a", "d"]);
	});

	it("leads with the user's order, the rest following in declared order", () => {
		expect(
			ids(
				arrangeClassicyControlStripModules(all, {
					moduleOrder: ["d", "gone", "b"],
					mountedApps: new Set(),
				}),
			),
		).toEqual(["d", "b", "a"]);
	});

	it("keeps user-hidden modules (the control panel lists them)", () => {
		expect(
			ids(
				arrangeClassicyControlStripModules(all, {
					hiddenModules: ["a"],
					mountedApps: new Set(),
				}),
			),
		).toEqual(["a", "b", "d"]);
	});
});

describe("classicyControlStripOpenControlPanelItem", () => {
	it("names the control panel and opens its app", () => {
		const sent: unknown[] = [];
		const item = classicyControlStripOpenControlPanelItem(
			(a) => sent.push(a),
			"File Sharing",
			{ id: "FileSharing.app", name: "File Sharing", icon: "fs.png" },
		);
		expect(item.title).toBe("Open File Sharing Control Panel");
		item.onClickFunc?.();
		expect(sent).toEqual([
			{
				type: "ClassicyAppOpen",
				app: { id: "FileSharing.app", name: "File Sharing", icon: "fs.png" },
			},
		]);
	});
});
