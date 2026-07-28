import { describe, expect, it } from "vitest";
import {
	classicyWindowPagePath,
	classicyWindowPageTitle,
} from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";

describe("classicyWindowPagePath", () => {
	it("derives an app segment by dropping a trailing .app", () => {
		expect(classicyWindowPagePath("SimpleText.app", "SimpleText_1")).toBe(
			"/simpletext/window-1",
		);
	});

	it("prefixes a purely numeric window segment with window-", () => {
		expect(classicyWindowPagePath("DriveSetup.app", "DriveSetup_1")).toBe(
			"/drivesetup/window-1",
		);
	});

	it("keeps a descriptive window id as-is", () => {
		expect(classicyWindowPagePath("MoviePlayer.app", "player")).toBe(
			"/movieplayer/player",
		);
	});

	it("strips the full appId prefix before the app segment (longest match wins)", () => {
		expect(
			classicyWindowPagePath("SimpleText.app", "SimpleText.app_debugger"),
		).toBe("/simpletext/debugger");
	});

	it("collapses a file window id to /file instead of leaking the path", () => {
		expect(
			classicyWindowPagePath(
				"SimpleText.app",
				"SimpleText.app_file_Macintosh HD:Docs:budget.txt",
			),
		).toBe("/simpletext/file");
	});

	it("collapses a path-keyed window id to /folder", () => {
		expect(
			classicyWindowPagePath("Finder.app", "Macintosh HD:Applications"),
		).toBe("/finder/folder");
	});

	it("collapses a slash-separated window id too", () => {
		expect(
			classicyWindowPagePath("Finder.app", "Macintosh HD/Applications"),
		).toBe("/finder/folder");
	});

	it("falls back to /app for an empty appId", () => {
		expect(classicyWindowPagePath("", "Thing_1")).toBe("/app/thing-1");
	});

	it("falls back to main for an empty window id", () => {
		expect(classicyWindowPagePath("Finder.app", "")).toBe("/finder/main");
	});

	it("falls back to main when the window id is just the app id", () => {
		expect(classicyWindowPagePath("SimpleText.app", "SimpleText.app")).toBe(
			"/simpletext/main",
		);
	});

	it("collapses punctuation runs and trims the edges", () => {
		expect(classicyWindowPagePath("My App!!.app", "__Some   Window__")).toBe(
			"/my-app/some-window",
		);
	});

	it("does not strip an app prefix that is not followed by a separator", () => {
		// "apple" must not become "le" just because the app segment is "app".
		expect(classicyWindowPagePath("", "apple")).toBe("/app/apple");
	});
});

describe("classicyWindowPageTitle", () => {
	it("joins app name and window title with an em dash", () => {
		expect(classicyWindowPageTitle("SimpleText", "Budget.txt", "/x")).toBe(
			"SimpleText — Budget.txt",
		);
	});

	it("uses the window title alone when there is no app name", () => {
		expect(classicyWindowPageTitle(undefined, "Budget.txt", "/x")).toBe(
			"Budget.txt",
		);
	});

	it("uses the app name alone when the window has no title", () => {
		expect(classicyWindowPageTitle("SimpleText", undefined, "/x")).toBe(
			"SimpleText",
		);
	});

	it("falls back to the path when neither is available", () => {
		expect(
			classicyWindowPageTitle(undefined, undefined, "/simpletext/main"),
		).toBe("/simpletext/main");
	});

	it("treats whitespace-only values as absent", () => {
		expect(classicyWindowPageTitle("   ", "  ", "/x")).toBe("/x");
	});
});
