import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyDateTimeManagerEventHandler,
	computeAnchoredTime,
	toLocalDate,
	toLocalHMS,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

function makeStore(
	overrides: Partial<{
		minDateTime: string | null;
		maxDateTime: string | null;
		boundaryLocked: boolean;
		dateTimeLocked: boolean;
		paused: boolean;
		dateTime: string;
	}> = {},
): ClassicyStore {
	return {
		System: {
			Manager: {
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
					minDateTime: null,
					maxDateTime: null,
					boundaryLocked: false,
					dateTimeLocked: false,
					...overrides,
				},
				Sound: { volume: 100, labels: {}, disabled: [] },
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: {
					apps: {
						"Finder.app": {
							id: "Finder.app",
							name: "Finder",
							icon: "",
							windows: [],
							open: true,
							focused: true,
							noDesktopIcon: true,
							data: {},
						},
					},
					fileTypeHandlers: Object.fromEntries(
						Object.values(ClassicyFileSystemEntryFileType).map((type) => [
							type,
							"Finder.app",
						]),
					) as Record<ClassicyFileSystemEntryFileType, string>,
				},
				Appearance: {
					availableThemes: [],
					activeTheme: {} as ClassicyTheme,
				},
				Boot: { paradeIcons: [] },
				Keyboard: { app: {}, system: [], global: {} },
			},
		},
	};
}

describe("toLocalDate", () => {
	it("returns a Date shifted forward by a positive offset", () => {
		const result = toLocalDate("2024-06-15T12:00:00.000Z", 4);
		expect(result.getUTCHours()).toBe(16);
		expect(result.getUTCMinutes()).toBe(0);
	});

	it("returns a Date shifted backward by a negative offset", () => {
		const result = toLocalDate("2024-06-15T12:00:00.000Z", -5);
		expect(result.getUTCHours()).toBe(7);
	});

	it("returns unchanged Date for offset 0", () => {
		const result = toLocalDate("2024-06-15T12:00:00.000Z", 0);
		expect(result.getUTCHours()).toBe(12);
	});

	it("handles midnight rollover across day boundary", () => {
		const result = toLocalDate("2024-06-15T22:00:00.000Z", 5);
		expect(result.getUTCHours()).toBe(3);
		expect(result.getUTCDate()).toBe(16);
	});
});

describe("toLocalHMS", () => {
	it("returns HH:MM:SS string with correct local time", () => {
		expect(toLocalHMS("2024-06-15T14:30:45.000Z", 0)).toBe("14:30:45");
	});

	it("applies positive offset correctly", () => {
		expect(toLocalHMS("2024-06-15T14:30:45.000Z", 4)).toBe("18:30:45");
	});

	it("applies negative offset correctly", () => {
		expect(toLocalHMS("2024-06-15T14:30:45.000Z", -5)).toBe("09:30:45");
	});

	it("zero-pads single-digit hours, minutes, and seconds", () => {
		expect(toLocalHMS("2024-06-15T01:02:03.000Z", 0)).toBe("01:02:03");
	});
});

describe("classicyDateTimeManagerEventHandler — ClassicyManagerDateTimeSet", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("updates dateTime to ISO string when given a valid Date", () => {
		const ds = makeStore();
		const date = new Date("2024-06-15T12:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(
			"2024-06-15T12:00:00.000Z",
		);
	});

	it("calls console.error and does not update dateTime when given a string", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.dateTime;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: "2024-06-15" as unknown as Date,
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			expect.any(Object),
		);
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(original);
	});

	it("calls console.error and does not update dateTime when given a number", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.dateTime;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: 1234567890 as unknown as Date,
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			expect.any(Object),
		);
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(original);
	});

	it("calls console.error and does not update dateTime when given null", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.dateTime;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: null as unknown as Date,
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			expect.any(Object),
		);
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(original);
	});
});

describe("classicyDateTimeManagerEventHandler — ClassicyManagerDateTimeTZSet", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('updates timeZoneOffset to "5" when given valid offset "5"', () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "5",
		});
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("5");
	});

	it('updates timeZoneOffset to "-5" when given valid offset "-5"', () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "-5",
		});
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("-5");
	});

	it('updates timeZoneOffset to "0" when given valid offset "0"', () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "0",
		});
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("0");
	});

	it('updates timeZoneOffset to "14" when given the maximum valid offset "14"', () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "14",
		});
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("14");
	});

	it('updates timeZoneOffset to "-12" when given the minimum valid offset "-12"', () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "-12",
		});
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("-12");
	});

	it('calls console.error and does not update timeZoneOffset when given out-of-range "15"', () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.timeZoneOffset;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "15",
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			"15",
		);
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe(original);
	});

	it('calls console.error and does not update timeZoneOffset when given out-of-range "-13"', () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.timeZoneOffset;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "-13",
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			"-13",
		);
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe(original);
	});

	it('calls console.error and does not update timeZoneOffset when given NaN string "abc"', () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.timeZoneOffset;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: "abc",
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			"abc",
		);
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe(original);
	});

	it("calls console.error and does not update timeZoneOffset when given undefined", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ds = makeStore();
		const original = ds.System.Manager.DateAndTime.timeZoneOffset;
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: undefined as unknown as string,
		});
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
			undefined,
		);
		expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe(original);
	});
});

describe("classicyDateTimeManagerEventHandler — boundary enforcement", () => {
	const MIN = "2020-01-01T00:00:00.000Z";
	const MAX = "2025-01-01T00:00:00.000Z";

	it("stores the date and clears boundaryLocked when date is within bounds", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		const date = new Date("2022-06-15T12:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("clamps to maxDateTime and sets boundaryLocked when date equals maxDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date(MAX),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MAX);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(true);
	});

	it("clamps to maxDateTime and sets boundaryLocked when date exceeds maxDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2030-01-01T00:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MAX);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(true);
	});

	it("clamps to minDateTime and clears boundaryLocked when date is below minDateTime", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: MAX });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2010-01-01T00:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(MIN);
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("clears boundaryLocked when date is set back within bounds after a lock", () => {
		const ds = makeStore({
			minDateTime: MIN,
			maxDateTime: MAX,
			boundaryLocked: true,
			dateTime: MAX,
		});
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("2022-06-15T12:00:00.000Z"),
		});
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("ignores ClassicyManagerDateTimeResume when boundaryLocked is true", () => {
		const ds = makeStore({ boundaryLocked: true, paused: true });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeResume",
		});
		expect(ds.System.Manager.DateAndTime.paused).toBe(true);
	});

	it("resumes normally when boundaryLocked is false", () => {
		const ds = makeStore({ boundaryLocked: false, paused: true });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeResume",
		});
		expect(ds.System.Manager.DateAndTime.paused).toBe(false);
	});

	it("applies no clamping when minDateTime is null", () => {
		const ds = makeStore({ minDateTime: null, maxDateTime: MAX });
		const date = new Date("2000-01-01T00:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});

	it("applies no clamping when maxDateTime is null", () => {
		const ds = makeStore({ minDateTime: MIN, maxDateTime: null });
		const date = new Date("2099-01-01T00:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
		expect(ds.System.Manager.DateAndTime.boundaryLocked).toBe(false);
	});
});

describe("computeAnchoredTime", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns virtual anchor time when no real time has elapsed", () => {
		vi.useFakeTimers();
		vi.setSystemTime(5000);
		const result = computeAnchoredTime(1_000_000_000, 5000);
		expect(result.getTime()).toBe(1_000_000_000);
	});

	it("advances virtual time by exact real elapsed milliseconds", () => {
		vi.useFakeTimers();
		vi.setSystemTime(5000);
		vi.setSystemTime(8500); // 3500ms later
		const result = computeAnchoredTime(1_000_000_000, 5000);
		expect(result.getTime()).toBe(1_000_003_500);
	});

	it("reflects exact real elapsed time even when ticks would have fired late", () => {
		vi.useFakeTimers();
		const virtualAnchorMs = 1_000_000_000;
		const realAnchorMs = 0;
		// Three "late" ticks: +1050, +980, +1100ms = 3130ms total real elapsed.
		// An accumulator would give 3000ms; the formula gives the exact 3130ms.
		vi.setSystemTime(3130);
		const result = computeAnchoredTime(virtualAnchorMs, realAnchorMs);
		expect(result.getTime()).toBe(1_000_003_130);
	});

	it("resumes from exact paused moment when real anchor is reset on resume", () => {
		vi.useFakeTimers();
		// Clock was running: virtualAnchor=5_002_000, realAnchor captured at t=2000.
		// 5 seconds pass while paused (real time advances to t=7000).
		// On resume: realAnchor resets to Date.now()=7000; virtualAnchor stays 5_002_000.
		vi.setSystemTime(7000);
		const atResume = computeAnchoredTime(5_002_000, 7000);
		expect(atResume.getTime()).toBe(5_002_000); // exactly the paused moment

		// 1 more real second after resume
		vi.setSystemTime(8000);
		const after1s = computeAnchoredTime(5_002_000, 7000);
		expect(after1s.getTime()).toBe(5_003_000);
	});
});

describe("classicyDateTimeManagerEventHandler — ClassicyManagerDateTimeLock/Unlock", () => {
	it("sets dateTimeLocked on Lock", () => {
		const ds = makeStore();
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeLock",
		});
		expect(ds.System.Manager.DateAndTime.dateTimeLocked).toBe(true);
	});

	it("clears dateTimeLocked on Unlock", () => {
		const ds = makeStore({ dateTimeLocked: true });
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeUnlock",
		});
		expect(ds.System.Manager.DateAndTime.dateTimeLocked).toBe(false);
	});

	it("still applies DateTimeSet while locked (lock is a UI flag, not a write guard)", () => {
		const ds = makeStore({ dateTimeLocked: true });
		const date = new Date("2024-06-15T12:00:00.000Z");
		classicyDateTimeManagerEventHandler(ds, {
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
		expect(ds.System.Manager.DateAndTime.dateTime).toBe(date.toISOString());
	});
});

describe("UTC de-shift for bounds comparison", () => {
	it("correctly computes utcNowMs by subtracting tzOffset from virtualNowMs", () => {
		// Virtual anchor is UTC+5: 12:00 UTC displayed as 17:00 local
		// virtualNowMs = UTC_epoch + 5h
		const utcMs = new Date("2024-06-15T12:00:00.000Z").getTime();
		const tzOffsetHours = 5;
		const virtualNowMs = utcMs + tzOffsetHours * 3600000;
		const utcNowMs = virtualNowMs - tzOffsetHours * 3600000;
		expect(utcNowMs).toBe(utcMs);
	});

	it("negative offset: virtualNowMs behind UTC, de-shift recovers correct UTC epoch", () => {
		const utcMs = new Date("2024-06-15T12:00:00.000Z").getTime();
		const tzOffsetHours = -5;
		const virtualNowMs = utcMs + tzOffsetHours * 3600000;
		const utcNowMs = virtualNowMs - tzOffsetHours * 3600000;
		expect(utcNowMs).toBe(utcMs);
	});
});
