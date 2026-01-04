import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { QuickTimeVideoEmbed } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import React, { useEffect } from "react";
import defaultDocumentIcon from "@img/icons/system/quicktime/movie.png";
import { MoviePlayerAppInfo, QuickTimeMovieDocument } from "./MoviePlayerUtils";

export const MoviePlayer: React.FC = () => {
  const { name: appName, id: appId, icon: appIcon } = MoviePlayerAppInfo;

  const desktopEventDispatch = useAppManagerDispatch();
  const desktop = useAppManager();

  const openDocuments: QuickTimeMovieDocument[] =
    desktop.System.Manager.App.apps[appId]?.data &&
    desktop.System.Manager.App.apps[appId].data["openFiles"];

  // Load Default Demo documents on open
  useEffect(() => {
    const appData = desktop.System.Manager.App.apps[appId]?.data || {};
    if (
      (desktop.System.Manager.App.apps[appId]?.open &&
        !appData["openDocuments"]) ||
      appData["openDocuments"]?.length === 0
    ) {
      const defaultDocs = [
        {
          url: "/vid/quicktime/sample.mp4",
          name: "Quick Time",
          icon: defaultDocumentIcon,
          options: {},
          type: "video",
        },
      ];
      desktopEventDispatch({
        type: "ClassicyAppMoviePlayerOpenDocuments",
        documents: defaultDocs,
      });
    } else {
      desktopEventDispatch({
        type: "ClassicyAppMoviePlayerOpenDocuments",
        documents: appData["openDocuments"],
      });
    }
  }, [appId, desktop.System.Manager.App.apps, desktopEventDispatch]);

  // const openUrl = (name: string, url: string, iconUrl?: string) => {
  //   desktopEventDispatch({
  //     type: "ClassicyAppMoviePlayerOpenDocument",
  //     document: { name, url: url, icon: iconUrl || defaultDocumentIcon },
  //   });

  //   const windowIndex = desktop.System.Manager.App.apps[
  //     appId
  //   ].windows.findIndex((w) => w.id === appId + "_MoviePlayer_" + url);
  //   const ws = desktop.System.Manager.App.apps[appId].windows[windowIndex];
  //   if (ws) {
  //     ws.closed = false;
  //     desktopEventDispatch({
  //       type: "ClassicyWindowOpen",
  //       app: {
  //         id: appId,
  //       },
  //       window: ws,
  //     });
  //     desktopEventDispatch({
  //       type: "ClassicyWindowFocus",
  //       app: {
  //         id: appId,
  //       },
  //       window: ws,
  //     });
  //   }
  // };

  const appMenu = [
    {
      id: "file",
      title: "File",
      menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
    },
  ];

  return (
    <ClassicyApp id={appId} name={appName} icon={appIcon}>
      {Array.isArray(openDocuments) &&
        openDocuments.length > 0 &&
        openDocuments.map((doc) => (
          <ClassicyWindow
            key={doc.name + "_" + doc.url}
            id={appId + "_MoviePlayer_" + doc.url}
            title={doc.name}
            icon={doc.icon || undefined}
            minimumSize={[300, 60]}
            appId={appId}
            closable={true}
            resizable={true}
            zoomable={true}
            scrollable={true}
            collapsable={false}
            initialSize={[400, 100]}
            initialPosition={[300, 50]}
            modal={true}
            appMenu={appMenu}
            onCloseFunc={() =>
              desktopEventDispatch({
                type: "ClassicyAppMoviePlayerCloseDocument",
                document: doc,
              })
            }
          >
            <QuickTimeVideoEmbed
              appId={appId}
              name={doc.name}
              url={doc.url}
              options={doc.options}
              type={doc.type}
              subtitlesUrl={doc.subtitlesUrl}
              controlsDocked={true}
            />
          </ClassicyWindow>
        ))}
    </ClassicyApp>
  );
};
