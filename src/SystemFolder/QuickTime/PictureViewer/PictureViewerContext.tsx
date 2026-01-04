import {
  classicyAppEventHandler,
  ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { PictureViewerAppInfo } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
import { ClassicyQuickTimeDocument } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";

type classicyQuickTimeEvent = {
  type: string;
  document?: ClassicyQuickTimeDocument;
  documents?: ClassicyQuickTimeDocument[];
};

export const classicyQuickTimePictureViewerEventHandler = (
  ds: ClassicyStore,
  action: classicyQuickTimeEvent,
) => {
  const { id: appId } = PictureViewerAppInfo;
  if (!ds.System.Manager.App.apps[appId]) {
    ds = classicyAppEventHandler(ds, {
      type: "ClassicyAppLoad",
      app: PictureViewerAppInfo,
    });
  }

  if (!ds.System.Manager.App.apps[appId].data) {
    ds.System.Manager.App.apps[appId].data = {};
  }

  if (!("openFiles" in ds.System.Manager.App.apps[appId].data)) {
    ds.System.Manager.App.apps[appId].data["openFiles"] = [];
  }

  const openDocUrls = ds.System.Manager.App.apps[appId].data["openFiles"].map(
    (of: ClassicyQuickTimeDocument) => of.url,
  );

  switch (action.type) {
    case "ClassicyAppPictureViewerOpenDocument": {
      if (
        Array.isArray(openDocUrls) &&
        !openDocUrls.includes(action.document?.url)
      ) {
        ds.System.Manager.App.apps[appId].data["openFiles"] = Array.from(
          new Set([
            ...ds.System.Manager.App.apps[appId].data["openFiles"],
            action.document,
          ]),
        );
        ds = classicyAppEventHandler(ds, {
          type: "ClassicyAppOpen",
          app: PictureViewerAppInfo,
        });
      }
      break;
    }
    case "ClassicyAppPictureViewerOpenDocuments": {
      const docs = action.documents?.filter(
        (doc) => !openDocUrls.includes(doc.url),
      );
      if (!docs) {
        break;
      }
      ds.System.Manager.App.apps[appId].data["openFiles"] = Array.from(
        new Set([
          ...ds.System.Manager.App.apps[appId].data["openFiles"],
          ...docs,
        ]),
      );
      ds = classicyAppEventHandler(ds, {
        type: "ClassicyAppOpen",
        app: PictureViewerAppInfo,
      });
      break;
    }
    case "ClassicyAppPictureViewerCloseDocument": {
      ds.System.Manager.App.apps[appId].data["openFiles"] =
        ds.System.Manager.App.apps[appId].data["openFiles"].filter(
          (p: ClassicyQuickTimeDocument) => p.url != action.document?.url,
        );
      break;
    }
  }
  return ds;
};
