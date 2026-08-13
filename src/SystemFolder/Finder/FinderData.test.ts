import { describe, expect, it } from "vitest";
import {
	describeAppState,
	getAppManifest,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	type FinderData,
	isFinderData,
} from "@/SystemFolder/Finder/FinderContext";

describe("isFinderData", () => {
	it("returns true for an empty object (all fields optional)", () => {
		const data: FinderData = {};
		expect(isFinderData(data)).toBe(true);
	});

	it("returns true when openPaths is a string array", () => {
		const data: FinderData = { openPaths: ["/Users/a", "/Users/b"] };
		expect(isFinderData(data)).toBe(true);
	});

	it("returns true when showAboutThisComputer is boolean", () => {
		const data: FinderData = { showAboutThisComputer: true };
		expect(isFinderData(data)).toBe(true);
	});

	it("returns false when openPaths is not an array", () => {
		expect(isFinderData({ openPaths: "not-an-array" })).toBe(false);
	});

	it("returns false when showAboutThisComputer is not boolean or undefined", () => {
		expect(isFinderData({ showAboutThisComputer: "yes" })).toBe(false);
	});

	it("returns false for null", () => {
		expect(isFinderData(null as unknown as Record<string, unknown>)).toBe(
			false,
		);
	});

	it("narrows the type so openPaths is accessible without casting", () => {
		const data: Record<string, unknown> = { openPaths: ["/Users/a"] };
		if (isFinderData(data)) {
			const paths: string[] | undefined = data.openPaths;
			expect(paths).toEqual(["/Users/a"]);
		} else {
			throw new Error("Expected isFinderData to return true");
		}
	});
});

describe("Finder manifest", () => {
	it("registers Finder.app with prefix, actions, and state schema", () => {
		const manifest = getAppManifest("Finder.app");
		expect(manifest?.prefixes).toContain("ClassicyAppFinder");
		expect(
			manifest?.actions.ClassicyAppFinderOpenFolder?.description,
		).toBeTruthy();
		expect(manifest?.state).toBeDefined();
	});

	it("exposes balloon-ready state commentary", () => {
		const balloon = describeAppState("Finder.app", "showAboutThisComputer");
		expect(balloon?.title).toBe("showAboutThisComputer");
		expect(balloon?.content).toMatch(/About This Computer/);
	});

	it("keeps ClassicyAppFinderEmptyTrash off the scriptable surface (guarded route)", async () => {
		const { isUntrustedActionAllowed } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust"
		);
		expect(isUntrustedActionAllowed("ClassicyAppFinderEmptyTrash")).toBe(false);
	});
});
