import {
  ActionMessage,
  ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

export const classicyFinderEventHandler = (
  ds: ClassicyStore,
  action: ActionMessage,
) => {
  const appId = "Finder.app";
  if (!ds.System.Manager.App.apps[appId]) return ds;
  let appData = ds.System.Manager.App.apps[appId].data;

  switch (action.type) {
    case "ClassicyAppFinderOpenFolder": {
      if (!("openPaths" in appData)) {
        appData["openPaths"] = [action.path];
        break;
      }

      appData["openPaths"] = Array.from(
        new Set([...appData["openPaths"], action.path]),
      );
      break;
    }
    case "ClassicyAppFinderOpenFolders": {
      if (!appData) {
        appData = {
          openPaths: [],
        };
      }

      if (!("openPaths" in appData)) {
        appData["openPaths"] = [];
      }

      appData["openPaths"] = Array.from(
        new Set([...appData["openPaths"], ...action.paths]),
      );
      break;
    }
    case "ClassicyAppFinderCloseFolder": {
      if (!appData) {
        appData = {
          openPaths: [],
        };
      }

      if (!("openPaths" in appData)) {
        appData["openPaths"] = [];
      }

      appData["openPaths"] = appData["openPaths"].filter(
        (p: string) => p !== action.path,
      );
      break;
    }
    case "ClassicyAppFinderEmptyTrash": {
      // TODO: What will this do?
      break;
    }
  }
  ds.System.Manager.App.apps[appId].data = { ...appData };
  return ds;
};
