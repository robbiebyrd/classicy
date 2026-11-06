import { afterEach, describe, expect, it } from "vitest";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	ClassicyIcons,
	registerClassicyIcons,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

describe("ClassicyIcons registry wiring", () => {
	const original = ClassicyIcons.system.extension;

	afterEach(() => {
		registerClassicyIcons({ system: { extension: original } });
	});

	it("registers the core's icon tree on import", () => {
		expect(resolveClassicyAsset("icons", "system.extension")).toBe(
			ClassicyIcons.system.extension,
		);
		expect(ClassicyIcons.system.extension).not.toBe("");
	});

	it("registerClassicyIcons deep-merges: system.extension override keeps every other system entry", () => {
		const before = Object.keys(ClassicyIcons.system).length;
		registerClassicyIcons({ system: { extension: "custom.png" } });
		expect(Object.keys(ClassicyIcons.system).length).toBe(before);
		expect(resolveClassicyAsset("icons", "system.extension")).toBe(
			"custom.png",
		);
		expect(resolveClassicyAsset("icons", "system.desktop.desktop")).toBe(
			ClassicyIcons.system.desktop.desktop,
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
