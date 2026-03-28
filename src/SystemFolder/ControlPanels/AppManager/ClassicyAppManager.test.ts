import { describe, it, expect, vi } from "vitest";
import {
  focusApp,
  deFocusApps,
  openApp,
  closeApp,
  activateApp,
  loadApp,
  classicyDesktopStateEventReducer,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
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

describe("deFocusApps", () => {
  it("marks all apps and their windows as unfocused", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["TestApp"] = {
      id: "TestApp",
      name: "Test",
      icon: "",
      open: true,
      focused: true,
      windows: [{ id: "w1", closed: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100], focused: true }],
      data: {},
    };

    deFocusApps(ds);

    expect(ds.System.Manager.App.apps["Finder.app"].focused).toBe(false);
    expect(ds.System.Manager.App.apps["TestApp"].focused).toBe(false);
    expect(ds.System.Manager.App.apps["TestApp"].windows[0].focused).toBe(false);
  });
});

describe("focusApp", () => {
  it("sets the target app as focused and others as unfocused", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [],
      data: {},
    };

    focusApp(ds, "Notes.app");

    expect(ds.System.Manager.App.apps["Notes.app"].focused).toBe(true);
    expect(ds.System.Manager.App.apps["Finder.app"].focused).toBe(false);
  });

  it("opens and focuses the default window when one exists", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [
        { id: "main", closed: true, default: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
        { id: "secondary", closed: true, default: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
      ],
      data: {},
    };

    focusApp(ds, "Notes.app");

    const mainWindow = ds.System.Manager.App.apps["Notes.app"].windows.find(w => w.id === "main");
    expect(mainWindow?.closed).toBe(false);
    expect(mainWindow?.focused).toBe(true);
  });

  it("does not throw when app does not exist", () => {
    const ds = makeStore();
    expect(() => focusApp(ds, "Nonexistent.app")).not.toThrow();
  });
});

describe("openApp", () => {
  it("creates a new app entry when app is not registered", () => {
    const ds = makeStore();
    openApp(ds, "Calculator.app", "Calculator", "calc-icon.png");
    expect(ds.System.Manager.App.apps["Calculator.app"]).toBeDefined();
    expect(ds.System.Manager.App.apps["Calculator.app"].open).toBe(true);
  });

  it("sets open=true and reopens windows for an existing app", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: false,
      focused: false,
      windows: [{ id: "main", closed: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100] }],
      data: {},
    };

    openApp(ds, "Notes.app", "Notes", "notes-icon.png");

    expect(ds.System.Manager.App.apps["Notes.app"].open).toBe(true);
    expect(ds.System.Manager.App.apps["Notes.app"].windows[0].closed).toBe(false);
  });
});

describe("closeApp", () => {
  it("sets open=false and closes all windows", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: true,
      windows: [{ id: "main", closed: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100] }],
      data: {},
    };

    closeApp(ds, "Notes.app");

    expect(ds.System.Manager.App.apps["Notes.app"].open).toBe(false);
    expect(ds.System.Manager.App.apps["Notes.app"].focused).toBe(false);
    expect(ds.System.Manager.App.apps["Notes.app"].windows[0].closed).toBe(true);
  });
});

describe("activateApp", () => {
  it("marks the target app as focused", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [],
      data: {},
    };

    activateApp(ds, "Notes.app");

    expect(ds.System.Manager.App.apps["Notes.app"].focused).toBe(true);
  });

  it("marks all other apps as unfocused", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [],
      data: {},
    };
    ds.System.Manager.App.apps["Finder.app"].focused = true;

    activateApp(ds, "Notes.app");

    expect(ds.System.Manager.App.apps["Finder.app"].focused).toBe(false);
  });

  it("unfocuses windows of other apps", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Finder.app"].windows = [
      { id: "w1", closed: false, focused: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
    ];
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [],
      data: {},
    };

    activateApp(ds, "Notes.app");

    expect(ds.System.Manager.App.apps["Finder.app"].windows[0].focused).toBe(false);
  });

  it("does NOT change the windows of the target app (unlike focusApp)", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [
        { id: "w1", closed: false, focused: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
      ],
      data: {},
    };

    activateApp(ds, "Notes.app");

    // activateApp only sets app.focused — it does not touch the target app's windows
    expect(ds.System.Manager.App.apps["Notes.app"].windows[0].focused).toBe(false);
  });
});

describe("loadApp", () => {
  it("registers an unknown app with open=false", () => {
    const ds = makeStore();
    loadApp(ds, "Calculator.app", "Calculator", "calc-icon.png");
    const app = ds.System.Manager.App.apps["Calculator.app"];
    expect(app).toBeDefined();
    expect(app.open).toBe(false);
    expect(app.id).toBe("Calculator.app");
    expect(app.name).toBe("Calculator");
  });

  it("is a no-op when the app is already registered", () => {
    const ds = makeStore();
    // Pre-register with open=true and custom name to verify state is not reset
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Original Name",
      icon: "original-icon.png",
      open: true,
      focused: true,
      windows: [{ id: "w1", closed: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100] }],
      data: { custom: "value" },
    };

    loadApp(ds, "Notes.app", "New Name", "new-icon.png");

    const app = ds.System.Manager.App.apps["Notes.app"];
    expect(app.open).toBe(true);
    expect(app.name).toBe("Original Name");
    expect(app.windows).toHaveLength(1);
  });
});

describe("focusApp — appMenu propagation", () => {
  it("sets ds.System.Manager.Desktop.appMenu when the focused window has menuBar and is the default window", () => {
    const ds = makeStore();
    const menu = [{ id: "file", title: "File" }];
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [
        { id: "main", closed: false, default: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100], menuBar: menu },
      ],
      data: {},
    };

    focusApp(ds, "Notes.app");

    expect(ds.System.Manager.Desktop.appMenu).toBe(menu);
  });

  it("does not set ds.System.Manager.Desktop.appMenu when the focused window has no menuBar", () => {
    const ds = makeStore();
    ds.System.Manager.Desktop.appMenu = [];
    ds.System.Manager.App.apps["Notes.app"] = {
      id: "Notes.app",
      name: "Notes",
      icon: "",
      open: true,
      focused: false,
      windows: [
        { id: "main", closed: false, default: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
      ],
      data: {},
    };

    focusApp(ds, "Notes.app");

    expect(ds.System.Manager.Desktop.appMenu).toEqual([]);
  });
});

describe("classicyDesktopStateEventReducer", () => {
  it("returns unchanged state for unrecognized action type", () => {
    const ds = makeStore();
    const original = ds;
    const result = classicyDesktopStateEventReducer(ds, { type: "UnknownAction" });
    expect(result).toBe(original);
  });

  it("returns state with the new app registered for ClassicyAppOpen", () => {
    const ds = makeStore();
    const result = classicyDesktopStateEventReducer(ds, {
      type: "ClassicyAppOpen",
      app: { id: "Calculator.app", name: "Calculator", icon: "" },
    });
    expect(result.System.Manager.App.apps["Calculator.app"]).toBeDefined();
    expect(result.System.Manager.App.apps["Calculator.app"].open).toBe(true);
  });

  it("routes ClassicyWindowFocus: sets the target window and app as focused", () => {
    const ds = makeStore();
    ds.System.Manager.App.apps["Finder.app"].focused = false;
    ds.System.Manager.App.apps["Finder.app"].windows = [
      { id: "w1", closed: false, focused: false, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
      { id: "w2", closed: false, focused: true, size: [400, 300], position: [0, 0], minimumSize: [100, 100] },
    ];

    const result = classicyDesktopStateEventReducer(ds, {
      type: "ClassicyWindowFocus",
      app: { id: "Finder.app" },
      window: { id: "w1" },
    });

    // The target app is now focused
    expect(result.System.Manager.App.apps["Finder.app"].focused).toBe(true);

    // The target window is focused; the other window is not
    const w1 = result.System.Manager.App.apps["Finder.app"].windows.find((w) => w.id === "w1");
    const w2 = result.System.Manager.App.apps["Finder.app"].windows.find((w) => w.id === "w2");
    expect(w1?.focused).toBe(true);
    expect(w2?.focused).toBe(false);
  });

  it("emits console.warn for unhandled actions in development", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ds = makeStore();
    classicyDesktopStateEventReducer(ds, { type: "UnknownXYZAction" });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unhandled action type"),
      expect.objectContaining({ type: "UnknownXYZAction" }),
    );
    warnSpy.mockRestore();
  });
});
