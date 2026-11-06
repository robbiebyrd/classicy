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
			"This is the Trash. To throw an item away, drag it here. To see what's in the Trash, double-click it. To remove its contents for good, choose Empty Trash from the Special menu.",
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

	it("omits the title when there is no default title", () => {
		const fromString = normalizeIconBalloonHelp("Opens the editor.", undefined);
		expect(fromString).toEqual({ content: "Opens the editor." });
		expect(fromString).not.toHaveProperty("title");
		const fromObject = normalizeIconBalloonHelp(
			{ content: "Opens the editor.", delay: 0 },
			undefined,
		);
		expect(fromObject).toEqual({ content: "Opens the editor.", delay: 0 });
		expect(fromObject).not.toHaveProperty("title");
	});

	it("returns undefined for undefined or empty input", () => {
		expect(normalizeIconBalloonHelp(undefined, "Foo")).toBeUndefined();
		expect(normalizeIconBalloonHelp("", "Foo")).toBeUndefined();
	});
});
