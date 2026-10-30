import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyBootEventHandler } from "@/SystemFolder/SystemResources/Boot/ClassicyBootManager";

// The handler only touches System.Manager.Boot, so a minimal fixture suffices.
const makeStore = (): ClassicyStore =>
	({
		System: { Manager: { Boot: { paradeIcons: [] } } },
	}) as unknown as ClassicyStore;

describe("classicyBootEventHandler", () => {
	it("appends a parade icon on ClassicyBootParadeIconAdd", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "brand",
			icon: "/brand.png",
			name: "Brand",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([
			{ id: "brand", icon: "/brand.png", name: "Brand" },
		]);
	});

	it("appends in dispatch order", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "b",
			icon: "/b.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons.map((p) => p.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("updates a duplicate id in place, preserving its position", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
			name: "A",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "b",
			icon: "/b.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a2.png",
			name: "A2",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([
			{ id: "a", icon: "/a2.png", name: "A2" },
			{ id: "b", icon: "/b.png", name: undefined },
		]);
	});

	it("stores followsAppIcon for an entry that shows its app's own icon", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "Paint.app",
			icon: "/paint.png",
			name: "Paint",
			followsAppIcon: true,
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([
			{
				id: "Paint.app",
				icon: "/paint.png",
				name: "Paint",
				followsAppIcon: true,
			},
		]);
	});

	it("stores no followsAppIcon for an entry with its own icon", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "Paint.app",
			icon: "/custom.png",
			name: "Paint",
			followsAppIcon: false,
		});
		expect(ds.System.Manager.Boot.paradeIcons[0]).not.toHaveProperty(
			"followsAppIcon",
		);
	});

	it("clears followsAppIcon when a re-add switches to a string icon", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "Paint.app",
			icon: "/paint.png",
			followsAppIcon: true,
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "Paint.app",
			icon: "/custom.png",
			followsAppIcon: false,
		});
		expect(ds.System.Manager.Boot.paradeIcons[0]).not.toHaveProperty(
			"followsAppIcon",
		);
		expect(ds.System.Manager.Boot.paradeIcons[0].icon).toBe("/custom.png");
	});

	it("removes an icon on ClassicyBootParadeIconRemove", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconRemove",
			id: "a",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});

	it("ignores remove of an unknown id", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconRemove",
			id: "ghost",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});

	it("ignores add with missing or non-string id/icon", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, { type: "ClassicyBootParadeIconAdd" });
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: 42,
			icon: "/a.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});
});

describe("reducer routing", () => {
	it("routes ClassicyBootParadeIcon* actions to the boot handler", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "routed",
			icon: "/r.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons.map((p) => p.id)).toEqual([
			"routed",
		]);
	});

	it("initializes Boot.paradeIcons to [] in the default state", async () => {
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		expect(DefaultAppManagerState.System.Manager.Boot.paradeIcons).toEqual([]);
	});
});
