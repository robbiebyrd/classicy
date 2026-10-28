import { afterEach, describe, expect, it } from "vitest";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	ClassicyIcons,
	registerClassicyIcons,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

describe("ClassicyIcons registry wiring", () => {
	const original = ClassicyIcons.system.alias;

	afterEach(() => {
		registerClassicyIcons({ system: { alias: original } });
	});

	it("registers the Platinum icon tree on import", () => {
		expect(resolveClassicyAsset("icons", "system.apple")).toBe(
			ClassicyIcons.system.apple,
		);
		expect(ClassicyIcons.system.apple).not.toBe("");
	});

	it("registerClassicyIcons deep-merges: system.alias override keeps every other system entry", () => {
		const before = Object.keys(ClassicyIcons.system).length;
		registerClassicyIcons({ system: { alias: "custom.png" } });
		expect(Object.keys(ClassicyIcons.system).length).toBe(before);
		expect(resolveClassicyAsset("icons", "system.alias")).toBe("custom.png");
		expect(resolveClassicyAsset("icons", "system.desktop.trashFull")).toBe(
			ClassicyIcons.system.desktop.trashFull,
		);
	});

	it("returns its argument typed", () => {
		const r = registerClassicyIcons({ myApp: { app: "x.png" } });
		expect(r.myApp.app).toBe("x.png");
		expect(resolveClassicyAsset("icons", "myApp.app")).toBe("x.png");
	});

	it("no longer carries the five unconsumed entries", () => {
		const ui = ClassicyIcons.ui as Record<string, unknown>;
		expect(ui.stripe).toBeUndefined();
		expect(ui.tab).toBeUndefined();
		expect(ui.menuDropdownArrows).toBeUndefined();
		expect(ui.halftoneSmall).toBeUndefined();
		expect(
			(ClassicyIcons.system as Record<string, unknown>).bomb,
		).toBeUndefined();
	});
});
