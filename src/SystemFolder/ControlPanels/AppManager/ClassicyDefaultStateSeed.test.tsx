// A host's defaultState seed applies once per page session; the test setup
// starts each test as a new one, so tests sharing a module graph (no
// vi.resetModules) still seed.
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	stopAppManagerPersistence,
	useAppManager,
	wasDefaultStateSeedApplied,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

stopAppManagerPersistence();

const seedDateTime = (dateTime: string) => {
	render(
		<ClassicyAppManagerProvider
			defaultState={{ System: { Manager: { DateAndTime: { dateTime } } } }}
		/>,
	);
	return useAppManager.getState().System.Manager.DateAndTime.dateTime;
};

describe("a defaultState seed, once per page session", () => {
	it("seeds in one test", () => {
		expect(wasDefaultStateSeedApplied()).toBe(false);
		expect(seedDateTime("2001-09-11T12:40:00.000Z")).toBe(
			"2001-09-11T12:40:00.000Z",
		);
		expect(wasDefaultStateSeedApplied()).toBe(true);
	});

	it("seeds again in the next, a new page session", () => {
		expect(wasDefaultStateSeedApplied()).toBe(false);
		expect(seedDateTime("1999-01-01T00:00:00.000Z")).toBe(
			"1999-01-01T00:00:00.000Z",
		);
	});

	it("does not seed twice in one session", () => {
		seedDateTime("1998-01-01T00:00:00.000Z");
		expect(seedDateTime("1997-01-01T00:00:00.000Z")).toBe(
			"1998-01-01T00:00:00.000Z",
		);
	});
});
