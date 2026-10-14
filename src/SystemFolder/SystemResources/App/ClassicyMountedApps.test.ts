import { describe, expect, it, vi } from "vitest";
import {
	isClassicyAppMounted,
	markClassicyAppMounted,
	subscribeClassicyMountedApps,
} from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";

describe("ClassicyMountedApps", () => {
	it("counts mounts per id and notifies only on presence changes", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyMountedApps(listener);
		const first = markClassicyAppMounted("Counted.app");
		const second = markClassicyAppMounted("Counted.app");
		expect(isClassicyAppMounted("Counted.app")).toBe(true);
		expect(listener).toHaveBeenCalledTimes(1);

		first();
		first(); // releasing twice is harmless
		expect(isClassicyAppMounted("Counted.app")).toBe(true);
		second();
		expect(isClassicyAppMounted("Counted.app")).toBe(false);
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
	});
});
