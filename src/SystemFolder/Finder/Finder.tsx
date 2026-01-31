import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
  ClassicyFileSystemEntry,
  ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import appIcon from "@img/icons/system/mac.png";
import { useCallback, useEffect, useMemo, useState } from "react";

type PathSettingsProps = {
  _viewType: "list" | "icons";
};
export const Finder = () => {
  const appName: string = "Finder";
  const appId: string = "Finder.app";
  const desktopEventDispatch = useAppManagerDispatch();
  const desktop = useAppManager();

  const [pathSettings, setPathSettings] = useState<
    Record<string, PathSettingsProps>
  >({});
  const [showAbout, setShowAbout] = useState(false);

  const openPaths =
    desktop.System.Manager.App.apps[appId]?.data?.openPaths || ([] as string[]);

  const fs = useMemo(() => new ClassicyFileSystem(), []);

  useEffect(() => {
    const appData = desktop.System.Manager.App.apps[appId]?.data || {};
    if (!("openPaths" in appData)) {
      return;
    } else {
      desktopEventDispatch({
        type: "ClassicyAppFinderOpenFolders",
        paths: appData.openPaths,
      });
    }
  }, [desktopEventDispatch, desktop.System.Manager.App.apps, appId]);

  const handlePathSettingsChange = useCallback((
    path: string,
    settings: PathSettingsProps,
  ) => {
    setPathSettings((prevPathSettings) => ({
      ...prevPathSettings,
      [path]: settings,
    }));
  }, []);

  const openFolder = useCallback((path: string) => {
    desktopEventDispatch({
      type: "ClassicyAppFinderOpenFolder",
      path,
    });

    const windowIndex = desktop.System.Manager.App.apps[
      appId
    ].windows.findIndex((w) => w.id === path);
    const ws = desktop.System.Manager.App.apps[appId].windows[windowIndex];
    if (ws) {
      desktopEventDispatch({
        type: "ClassicyWindowOpen",
        app: {
          id: appId,
        },
        window: ws,
      });
      desktopEventDispatch({
        type: "ClassicyWindowFocus",
        app: {
          id: appId,
        },
        window: ws,
      });
    }
  }, [desktopEventDispatch, desktop.System.Manager.App.apps, appId]);

  const openFile = useCallback((path: string) => {
    const file = fs.resolve(path);
    desktopEventDispatch({
      type: "ClassicyAppFinderOpenFile",
      file,
    });
  }, [fs, desktopEventDispatch]);

  const closeFolder = useCallback((path: string) => {
    desktopEventDispatch({
      type: "ClassicyAppFinderCloseFolder",
      path,
    });
  }, [desktopEventDispatch]);

  useEffect(() => {
    const drives = fs.filterByType("", "drive");

    Object.entries(drives).forEach(([path, metadata]) => {
      desktopEventDispatch({
        type: "ClassicyDesktopIconAdd",
        app: {
          id: appId,
          name: path,
          icon: metadata["_icon"],
        },
        event: "ClassicyAppFinderOpenFolder",
        eventData: { path },
        kind: "drive",
      });
    });

    // desktopEventDispatch({
    //     type: 'ClassicyDesktopIconAdd',
    //     app: {
    //         id: 'finder_trash',
    //         name: 'Trash',
    //         icon: `/img/icons/system/desktop/trash-full.png`,
    //     },
    //     kind: 'trash',
    //     event: 'ClassicyAppFinderEmptyTrash',
    //     eventData: {},
    // })
  }, [fs, desktopEventDispatch]);

  const getHeaderString = (dir: ClassicyFileSystemEntryMetadata) => {
    return (
      dir["_count"] +
      " items" +
      (dir["_countHidden"] ? " (" + dir["_countHidden"] + " hidden)" : "") +
      ", " +
      fs.formatSize(dir["_size"] || 0)
    );
  };

  return (
    <ClassicyApp
      id={appId}
      name={appName}
      icon={appIcon}
      noDesktopIcon={true}
      defaultWindow={
        openPaths ? appName + "_" + openPaths.at(0) : "Macintosh HD"
      }
    >
      {openPaths?.length > 0 &&
        openPaths
          .map((p: string) => {
            return [p, fs.statDir(p)];
          })
          .map(([op, dir]: [string, ClassicyFileSystemEntry], idx: number) => {
            return (
              <ClassicyWindow
                id={op}
                key={appName + "_" + op}
                title={dir["_name"]}
                icon={dir["_icon"]}
                appId={appId}
                defaultWindow={false}
                hidden={false}
                initialSize={[425, 300]}
                initialPosition={[50 + idx * 50, 50 + idx * 50]}
                header={<span>{getHeaderString(dir)}</span>}
                onCloseFunc={closeFolder}
                appMenu={[
                  {
                    id: appId + "_" + op + "_file",
                    title: "File",
                    menuChildren: [
                      {
                        id: appId + "_" + op + "_file_closew",
                        title: "Close Window",
                        onClickFunc: () => closeFolder(op),
                      },
                      {
                        id: appId + "_" + op + "_file_closews",
                        title: "Close All Windows",
                        event: "ClassicyAppClose",
                        eventData: {
                          app: {
                            id: appId,
                            title: appName,
                            icon: appIcon,
                          },
                        },
                      },
                    ],
                  },
                  {
                    id: appId + "_view",
                    title: "View",
                    menuChildren: [
                      {
                        id: appId + "_" + op + "_view_as_icons",
                        title: "View as Icons",
                        onClickFunc: () =>
                          handlePathSettingsChange(op, { _viewType: "icons" }),
                      },
                      {
                        id: appId + "_" + op + "_view_as_list",
                        title: "View as List",
                        onClickFunc: () =>
                          handlePathSettingsChange(op, { _viewType: "list" }),
                      },
                    ],
                  },
                  {
                    id: appId + "_" + op + "_help",
                    title: "Help",
                    menuChildren: [
                      {
                        id: appId + "_" + op + "_help_about",
                        title: "About",
                        onClickFunc: () => {
                          setShowAbout(true);
                        },
                      },
                    ],
                  },
                ]}
              >
                <ClassicyFileBrowser
                  appId={appId}
                  fs={fs}
                  path={op}
                  dirOnClickFunc={openFolder}
                  fileOnClickFunc={openFile}
                  display={pathSettings[op]?._viewType || "list"}
                />
              </ClassicyWindow>
            );
          })}
      {showAbout && (
        <ClassicyAboutWindow
          appId={appId}
          appIcon={appIcon}
          appName={appName}
          hideFunc={() => setShowAbout(false)}
        />
      )}
    </ClassicyApp>
  );
};
