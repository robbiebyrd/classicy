import { describe, expect, it } from "vitest";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

const fresh = (): ClassicyStore => structuredClone(DefaultAppManagerState);
const strip = (ds: ClassicyStore) => ds.System.Manager.Desktop.controlStrip;
const run = (ds: ClassicyStore, action: ActionMessage) => {
	classicyDesktopEventHandler(ds, action);
	return ds;
};

describe("classicyDesktopEventHandler — Control Strip", () => {
	it("defaults to a visible strip with nothing hidden or reordered", () => {
		expect(strip(fresh())).toEqual({
			visible: true,
			hiddenModules: [],
			moduleOrder: [],
		});
	});

	it("shows and hides the strip, ignoring a non-boolean", () => {
		const ds = run(fresh(), {
			type: "ClassicyDesktopControlStripSetVisible",
			visible: false,
		});
		expect(strip(ds)?.visible).toBe(false);
		run(ds, { type: "ClassicyDesktopControlStripSetVisible", visible: "yes" });
		expect(strip(ds)?.visible).toBe(false);
	});

	it("stores collapsed and a rounded width; null clears the width", () => {
		const ds = run(fresh(), {
			type: "ClassicyDesktopControlStripSetCollapsed",
			collapsed: true,
		});
		run(ds, { type: "ClassicyDesktopControlStripSetWidth", width: 92.6 });
		expect(strip(ds)).toMatchObject({ collapsed: true, width: 93 });
		run(ds, { type: "ClassicyDesktopControlStripSetWidth", width: -4 });
		run(ds, { type: "ClassicyDesktopControlStripSetWidth", width: "wide" });
		expect(strip(ds)?.width).toBe(93);
		run(ds, { type: "ClassicyDesktopControlStripSetWidth", width: null });
		expect(strip(ds)?.width).toBeNull();
	});

	it("hides and shows modules by id without duplicates", () => {
		const ds = fresh();
		for (const hidden of [true, true, false, true]) {
			run(ds, {
				type: "ClassicyDesktopControlStripSetModuleHidden",
				moduleId: "classicy-sound",
				hidden,
			});
		}
		expect(strip(ds)?.hiddenModules).toEqual(["classicy-sound"]);
		run(ds, {
			type: "ClassicyDesktopControlStripSetModuleHidden",
			moduleId: "classicy-sound",
			hidden: false,
		});
		expect(strip(ds)?.hiddenModules).toEqual([]);
	});

	it("stores a de-duplicated module order and rejects non-string ids", () => {
		const ds = run(fresh(), {
			type: "ClassicyDesktopControlStripSetModuleOrder",
			moduleOrder: ["b", "a", "b"],
		});
		expect(strip(ds)?.moduleOrder).toEqual(["b", "a"]);
		run(ds, {
			type: "ClassicyDesktopControlStripSetModuleOrder",
			moduleOrder: ["c", 4],
		});
		expect(strip(ds)?.moduleOrder).toEqual(["b", "a"]);
	});

	it("creates the slice for state saved before it existed", () => {
		const ds = fresh();
		delete ds.System.Manager.Desktop.controlStrip;
		run(ds, {
			type: "ClassicyDesktopControlStripSetModuleHidden",
			moduleId: "x",
			hidden: true,
		});
		expect(strip(ds)).toEqual({
			visible: true,
			hiddenModules: ["x"],
			moduleOrder: [],
		});
	});

	it("is out of reach of untrusted actions (guarded ClassicyDesktop* route)", () => {
		const ds = fresh();
		classicyDesktopStateEventReducer(
			ds,
			{ type: "ClassicyDesktopControlStripSetVisible", visible: false },
			"untrusted",
		);
		expect(strip(ds)?.visible).toBe(true);
	});
});
