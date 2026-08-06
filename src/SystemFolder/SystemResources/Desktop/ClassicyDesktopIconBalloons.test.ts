import { describe, expect, it } from "vitest";
import {
	defaultBalloonForKind,
	normalizeIconBalloonHelp,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";

describe("defaultBalloonForKind", () => {
	it("returns stock copy for the trash", () => {
		const balloon = defaultBalloonForKind("trash", "Trash");
		expect(balloon?.title).toBe("Trash");
		expect(balloon?.content).toBe(
			"This is the Trash. To reset Classicy to its default state, double click the Trash icon or choose Empty Trash from the Special menu.",
		);
	});

	it("returns stock copy for a drive", () => {
		const balloon = defaultBalloonForKind("drive", "Macintosh HD");
		expect(balloon?.title).toBe("Macintosh HD");
		expect(balloon?.content).toBe(
			"This is a disk icon. To see what's on the disk, double-click the icon.",
		);
	});

	it("returns undefined for kinds with no stock copy", () => {
		expect(defaultBalloonForKind("app_shortcut", "TV")).toBeUndefined();
		expect(defaultBalloonForKind("icon", "Thing")).toBeUndefined();
	});

	it("matches kind case-insensitively", () => {
		expect(defaultBalloonForKind("Trash", "Trash")).toBeDefined();
	});
});

describe("normalizeIconBalloonHelp", () => {
	it("turns a string into content titled with the default title", () => {
		expect(normalizeIconBalloonHelp("Opens the editor.", "Foo")).toEqual({
			title: "Foo",
			content: "Opens the editor.",
		});
	});

	it("keeps an explicit title on the object form", () => {
		expect(
			normalizeIconBalloonHelp(
				{
					title: "Custom",
					content: "Opens the editor.",
					position: "bottom-center",
				},
				"Foo",
			),
		).toEqual({
			title: "Custom",
			content: "Opens the editor.",
			position: "bottom-center",
		});
	});

	it("fills in the default title when the object omits one", () => {
		expect(
			normalizeIconBalloonHelp({ content: "Opens the editor." }, "Foo"),
		).toEqual({ title: "Foo", content: "Opens the editor." });
	});

	it("returns undefined for undefined or empty input", () => {
		expect(normalizeIconBalloonHelp(undefined, "Foo")).toBeUndefined();
		expect(normalizeIconBalloonHelp("", "Foo")).toBeUndefined();
	});
});
