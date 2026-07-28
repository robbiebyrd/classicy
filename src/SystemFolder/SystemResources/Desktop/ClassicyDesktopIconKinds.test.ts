import { describe, expect, it } from "vitest";
import { isAliasKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds";

describe("isAliasKind", () => {
	it("treats app shortcuts as aliases", () => {
		expect(isAliasKind("app_shortcut")).toBe(true);
	});

	it("treats plain shortcuts as aliases", () => {
		expect(isAliasKind("shortcut")).toBe(true);
	});

	it.each([
		"drive",
		"trash",
		"directory",
		"file",
		"icon",
	])("does not treat the system kind %s as an alias", (kind) => {
		expect(isAliasKind(kind)).toBe(false);
	});

	it("does not treat an unrecognized kind as an alias", () => {
		expect(isAliasKind("widget")).toBe(false);
	});

	it("ignores case, matching how kind is compared elsewhere", () => {
		expect(isAliasKind("App_Shortcut")).toBe(true);
		expect(isAliasKind("SHORTCUT")).toBe(true);
	});

	it("survives a missing kind", () => {
		expect(isAliasKind(undefined as unknown as string)).toBe(false);
	});
});
