import { describe, expect, it } from "vitest";
import { describeAppAction } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/Finder/FinderContext";

describe("FinderAboutThisComputer balloon help", () => {
	it("sources its balloon content from the Finder manifest", () => {
		const balloon = describeAppAction(
			"Finder.app",
			"ClassicyAppFinderAboutThisComputerOpen",
		);
		expect(balloon?.title).toBe("ClassicyAppFinderAboutThisComputerOpen");
		expect(balloon?.content).toMatch(/About This Computer/);
	});
});
