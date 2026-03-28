import { describe, it, expect, vi } from "vitest";
import { classicyQuickTimePictureViewerEventHandler } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

vi.mock("@/SystemFolder/QuickTime/PictureViewer/PictureViewer", () => ({
  PictureViewerAppInfo: { id: "PictureViewer.app", name: "Picture Viewer", icon: "picture-icon.png" },
}));

// PictureViewerContext imports ClassicyQuickTimeDocument from MoviePlayerContext,
// which in turn imports MoviePlayerUtils (which imports an image). Mock it too.
vi.mock("@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils", () => ({
  MoviePlayerAppInfo: { id: "MoviePlayer.app", name: "Movie Player", icon: "movie-icon.png" },
}));

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

function makeStoreWithPictureViewer(): ClassicyStore {
  const ds = makeStore();
  ds.System.Manager.App.apps["PictureViewer.app"] = {
    id: "PictureViewer.app",
    name: "Picture Viewer",
    icon: "picture-icon.png",
    open: false,
    focused: false,
    windows: [],
    data: { openFiles: [] },
  };
  return ds;
}

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerOpenDocument", () => {
  it("adds a document to openFiles", () => {
    const ds = makeStoreWithPictureViewer();
    const doc = { url: "http://example.com/image.png", name: "Image" };

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: doc,
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(1);
    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"][0].url).toBe(doc.url);
  });

  it("deduplicates by URL — same URL is not added twice", () => {
    const ds = makeStoreWithPictureViewer();
    const doc = { url: "http://example.com/image.png", name: "Image" };

    let result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: doc,
    });
    result = classicyQuickTimePictureViewerEventHandler(result, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: doc,
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(1);
  });

  it("opens the app when a new document is added", () => {
    const ds = makeStoreWithPictureViewer();
    const doc = { url: "http://example.com/image.png", name: "Image" };

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: doc,
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].open).toBe(true);
  });
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerOpenDocuments", () => {
  it("bulk adds multiple documents", () => {
    const ds = makeStoreWithPictureViewer();
    const docs = [
      { url: "http://example.com/a.png", name: "A" },
      { url: "http://example.com/b.png", name: "B" },
    ];

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocuments",
      documents: docs,
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(2);
  });

  it("filters out duplicates when bulk adding", () => {
    const ds = makeStoreWithPictureViewer();
    ds.System.Manager.App.apps["PictureViewer.app"].data["openFiles"] = [
      { url: "http://example.com/a.png", name: "A" },
    ];

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocuments",
      documents: [
        { url: "http://example.com/a.png", name: "A" },
        { url: "http://example.com/b.png", name: "B" },
      ],
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(2);
    const urls = result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"].map(
      (f: { url: string }) => f.url,
    );
    expect(urls).toContain("http://example.com/a.png");
    expect(urls).toContain("http://example.com/b.png");
  });

  it("opens the app when bulk adding documents", () => {
    const ds = makeStoreWithPictureViewer();

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocuments",
      documents: [{ url: "http://example.com/a.png", name: "A" }],
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].open).toBe(true);
  });
});

describe("classicyQuickTimePictureViewerEventHandler — ClassicyAppPictureViewerCloseDocument", () => {
  it("removes a document by URL", () => {
    const ds = makeStoreWithPictureViewer();
    ds.System.Manager.App.apps["PictureViewer.app"].data["openFiles"] = [
      { url: "http://example.com/a.png", name: "A" },
      { url: "http://example.com/b.png", name: "B" },
    ];

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerCloseDocument",
      document: { url: "http://example.com/a.png" },
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(1);
    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"][0].url).toBe(
      "http://example.com/b.png",
    );
  });

  it("is a no-op when the document URL does not exist in openFiles", () => {
    const ds = makeStoreWithPictureViewer();
    ds.System.Manager.App.apps["PictureViewer.app"].data["openFiles"] = [
      { url: "http://example.com/a.png", name: "A" },
    ];

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerCloseDocument",
      document: { url: "http://example.com/nonexistent.png" },
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(1);
  });
});

describe("classicyQuickTimePictureViewerEventHandler — auto-load when unregistered", () => {
  it("auto-registers PictureViewer.app via classicyAppEventHandler when not in the store", () => {
    const ds = makeStore();

    // PictureViewer is not registered — the handler should auto-load it via ClassicyAppLoad
    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: { url: "http://example.com/image.png" },
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"]).toBeDefined();
  });

  it("adds the document after auto-loading PictureViewer.app", () => {
    const ds = makeStore();
    const doc = { url: "http://example.com/image.png", name: "Image" };

    const result = classicyQuickTimePictureViewerEventHandler(ds, {
      type: "ClassicyAppPictureViewerOpenDocument",
      document: doc,
    });

    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"]).toHaveLength(1);
    expect(result.System.Manager.App.apps["PictureViewer.app"].data["openFiles"][0].url).toBe(doc.url);
  });
});
