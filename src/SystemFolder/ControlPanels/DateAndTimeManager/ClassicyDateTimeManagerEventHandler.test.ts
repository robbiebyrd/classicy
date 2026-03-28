import { describe, it, expect, vi, afterEach } from "vitest";
import { classicyDateTimeManagerEventHandler } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

function makeStore(): ClassicyStore {
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
        },
        Sound: { volume: 100, labels: {}, disabled: [] },
        Desktop: {
          selectedIcons: [],
          contextMenu: [],
          showContextMenu: false,
          icons: [],
          systemMenu: [],
          appMenu: [],
          selectBox: { size: [0, 0], start: [0, 0], active: false },
        },
        App: {
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
        },
        Appearance: {
          availableThemes: [],
          activeTheme: {} as ClassicyTheme,
        },
      },
    },
  };
}

describe("classicyDateTimeManagerEventHandler — ClassicyManagerDateTimeSet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates dateTime to ISO string when given a valid Date", () => {
    const ds = makeStore();
    const date = new Date("2024-06-15T12:00:00.000Z");
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeSet", dateTime: date });
    expect(ds.System.Manager.DateAndTime.dateTime).toBe("2024-06-15T12:00:00.000Z");
  });

  it("calls console.error and does not update dateTime when given a string", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ds = makeStore();
    const original = ds.System.Manager.DateAndTime.dateTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally passing wrong type to test error path
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeSet", dateTime: "2024-06-15" as any });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally passing wrong type to test error path
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeSet", dateTime: 1234567890 as any });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally passing wrong type to test error path
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeSet", dateTime: null as any });
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
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "5" });
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("5");
  });

  it('updates timeZoneOffset to "-5" when given valid offset "-5"', () => {
    const ds = makeStore();
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "-5" });
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("-5");
  });

  it('updates timeZoneOffset to "0" when given valid offset "0"', () => {
    const ds = makeStore();
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "0" });
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("0");
  });

  it('updates timeZoneOffset to "14" when given the maximum valid offset "14"', () => {
    const ds = makeStore();
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "14" });
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("14");
  });

  it('updates timeZoneOffset to "-12" when given the minimum valid offset "-12"', () => {
    const ds = makeStore();
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "-12" });
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe("-12");
  });

  it('calls console.error and does not update timeZoneOffset when given out-of-range "15"', () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ds = makeStore();
    const original = ds.System.Manager.DateAndTime.timeZoneOffset;
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "15" });
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
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "-13" });
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
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: "abc" });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally passing wrong type to test error path
    classicyDateTimeManagerEventHandler(ds, { type: "ClassicyManagerDateTimeTZSet", tzOffset: undefined as any });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[classicyDateTimeManagerEventHandler]"),
      undefined,
    );
    expect(ds.System.Manager.DateAndTime.timeZoneOffset).toBe(original);
  });
});
