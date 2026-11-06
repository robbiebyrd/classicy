import { describe, expect, it } from "vitest";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	applyClassicyAppearanceOption,
	CLASSICY_APPEARANCE_OPTION_SEGMENT,
	getClassicyAppearanceOption,
	parseClassicyAppearanceOptionPath,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceOptions";

describe("parseClassicyAppearanceOptionPath", () => {
	it.each([
		"sound.pack",
		"desktop.iconSize",
		"typography.uiSize",
	])("accepts %s", (p) =>
		expect(parseClassicyAppearanceOptionPath(p)).toEqual(p.split(".")));

	it.each([
		"",
		"sound",
		"__proto__.x",
		"a.constructor",
		"a.prototype.b",
		"id.x",
		"name.x",
		"package.x",
		"measurements.window.borderSize",
		"a.b.c.d.e",
		"bad-key.x",
		"1a.b",
	])("rejects %s", (p) =>
		expect(parseClassicyAppearanceOptionPath(p)).toBeUndefined());

	it("segments are letter-first alphanumerics", () => {
		expect(CLASSICY_APPEARANCE_OPTION_SEGMENT.test("uiSize")).toBe(true);
		expect(CLASSICY_APPEARANCE_OPTION_SEGMENT.test("0")).toBe(false);
	});
});

describe("applyClassicyAppearanceOption", () => {
	it("applies a valid write", () => {
		const t = structuredClone(getTheme("default"));
		expect(applyClassicyAppearanceOption(t, "desktop.iconSize", 40)).toEqual({
			ok: true,
		});
		expect(t.desktop.iconSize).toBe(40);
	});

	it("rejects a write the schema refuses and restores the value", () => {
		const t = structuredClone(getTheme("default"));
		const before = t.desktop.iconSize;
		expect(
			applyClassicyAppearanceOption(t, "desktop.iconSize", "huge"),
		).toEqual({ ok: false, reason: "schema" });
		expect(t.desktop.iconSize).toBe(before);
	});

	it("rejects a missing leaf", () =>
		expect(
			applyClassicyAppearanceOption(
				structuredClone(getTheme("default")),
				"desktop.nope",
				1,
			),
		).toEqual({ ok: false, reason: "missing" }));

	it("rejects a bad path", () => {
		const t = structuredClone(getTheme("default"));
		const before = JSON.stringify(t);
		expect(
			applyClassicyAppearanceOption(t, "measurements.window.borderSize", 3),
		).toEqual({ ok: false, reason: "path" });
		expect(applyClassicyAppearanceOption(t, "__proto__.polluted", 1)).toEqual({
			ok: false,
			reason: "path",
		});
		expect(JSON.stringify(t)).toBe(before);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it("never walks through a primitive or an array", () => {
		const t = structuredClone(getTheme("default"));
		const before = JSON.stringify(t);
		expect(applyClassicyAppearanceOption(t, "desktop.iconSize.x", 1)).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(applyClassicyAppearanceOption(t, "color.system.length", 1)).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(applyClassicyAppearanceOption(t, "sound.pack.length", 1)).toEqual({
			ok: false,
			reason: "missing",
		});
		expect(JSON.stringify(t)).toBe(before);
	});

	it("validates the leaf against its own sub-schema", () => {
		const t = structuredClone(getTheme("default"));
		expect(
			applyClassicyAppearanceOption(t, "sound.pack", "no-such-pack"),
		).toEqual({ ok: false, reason: "schema" });
		expect(t.sound.pack).toBe("platinum");
		expect(
			applyClassicyAppearanceOption(t, "typography.ui", "Charcoal; }"),
		).toEqual({ ok: false, reason: "schema" });
		expect(applyClassicyAppearanceOption(t, "typography.uiSize", 16)).toEqual({
			ok: true,
		});
		expect(t.typography.uiSize).toBe(16);
	});

	it("a pre-existing invalid field never blocks an unrelated write", () => {
		const t = structuredClone(getTheme("default"));
		// Accepted by ClassicyDesktopChangeBackground, refused by the file schema.
		t.desktop.backgroundImage = "wallpapers/relative.png";
		expect(applyClassicyAppearanceOption(t, "desktop.iconSize", 40)).toEqual({
			ok: true,
		});
		expect(t.desktop.iconSize).toBe(40);
	});
});

describe("getClassicyAppearanceOption", () => {
	it("getClassicyAppearanceOption reads own properties only", () => {
		expect(
			getClassicyAppearanceOption(getTheme("default"), ["sound", "pack"]),
		).toBe("platinum");
		expect(
			getClassicyAppearanceOption(getTheme("default"), ["sound", "toString"]),
		).toBeUndefined();
	});

	it("returns undefined for a path through a primitive", () =>
		expect(
			getClassicyAppearanceOption(getTheme("default"), [
				"desktop",
				"iconSize",
				"x",
			]),
		).toBeUndefined());
});
