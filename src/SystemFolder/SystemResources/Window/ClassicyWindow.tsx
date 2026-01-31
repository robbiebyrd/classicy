"use client";

import { ClassicyStoreSystemAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import "./ClassicyWindow.scss";
import classNames from "classnames";
import fileIcon from "@img/icons/system/files/file.png";
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface ClassicyWindowProps {
  title?: string;
  id: string;
  appId: string;
  icon?: string;
  hidden?: boolean;
  closable?: boolean;
  zoomable?: boolean;
  collapsable?: boolean;
  resizable?: boolean;
  scrollable?: boolean;
  modal?: boolean;
  growable?: boolean;
  defaultWindow?: boolean;
  initialSize?: [number, number];
  initialPosition?: [number, number];
  minimumSize?: [number, number];
  header?: ReactNode;
  appMenu?: ClassicyMenuItem[];
  contextMenu?: ClassicyMenuItem[];
  onCloseFunc?: (id: string) => void;
  children?: ReactNode;
  type?: string;
}

export const ClassicyWindow: React.FC<ClassicyWindowProps> = ({
  id,
  title = "",
  appId,
  icon,
  hidden = false,
  closable = true,
  zoomable = true,
  collapsable = true,
  resizable = true,
  scrollable = true,
  modal = false,
  type = "default",
  growable,
  defaultWindow = false,
  initialSize = [350, 0],
  initialPosition = [110, 110],
  minimumSize = [300, 0],
  header,
  appMenu,
  contextMenu,
  onCloseFunc,
  children,
}) => {
  if (!icon || icon === "") {
    icon = fileIcon;
  }

  const [size, setSize] = useState<[number, number]>(initialSize);
  const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0]);

  const clickOffset = [10, 10];

  const desktopContext = useAppManager();
  const desktopEventDispatch = useAppManagerDispatch();
  const player = useSoundDispatch();

  const { track } = useClassicyAnalytics();
  const analyticsArgs = useMemo(() => {
    return {
      appId,
      id,
      icon,
      hidden,
      closable,
      zoomable,
      collapsable,
      resizable,
      scrollable,
      modal,
      windowType: type,
      growable,
      defaultWindow,
      initialSize,
      initialPosition,
      minimumSize,
    };
  }, [
    appId,
    closable,
    collapsable,
    defaultWindow,
    growable,
    hidden,
    icon,
    id,
    initialPosition,
    initialSize,
    minimumSize,
    modal,
    resizable,
    scrollable,
    type,
    zoomable,
  ]);

  const windowRef = useRef<HTMLDivElement | null>(null);

  // Select only the specific app and window to avoid re-renders on unrelated app changes
  const currentApp = desktopContext.System.Manager.App.apps[appId];
  const currentWindow = currentApp?.windows.find((w) => w.id === id);

  const ws = useMemo(() => {
    const initialWindowState: ClassicyStoreSystemAppWindow = {
      collapsed: false,
      focused: false,
      contextMenu: contextMenu,
      dragging: false,
      moving: false,
      resizing: false,
      zoomed: false,
      size: initialSize,
      position: initialPosition,
      closed: hidden,
      menuBar: appMenu || [],
      showContextMenu: false,
      default: defaultWindow,
      id: id,
      appId: appId,
      minimumSize: [0, 0],
    };

    if (currentWindow) {
      return currentWindow;
    }

    return {
      ...initialWindowState,
      appId,
      minimumSize,
      position: initialPosition,
    } as ClassicyStoreSystemAppWindow;
  }, [
    appId,
    appMenu,
    contextMenu,
    currentWindow,
    defaultWindow,
    hidden,
    id,
    initialPosition,
    initialSize,
    minimumSize,
  ]);

  useEffect(() => {
    desktopEventDispatch({
      type: "ClassicyWindowOpen",
      window: ws,
      app: {
        id: appId,
      },
    });
  }, [appId, desktopContext.System.Manager.App.apps, ws, desktopEventDispatch]);

  const startResizeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    track("resize", { type: "ClassicyWindow", ...analyticsArgs });
    desktopEventDispatch({
      type: "ClassicyWindowPosition",
      app: {
        id: appId,
      },
      window: ws,
      position: [
        windowRef?.current?.getBoundingClientRect().left,
        windowRef?.current?.getBoundingClientRect().top,
      ],
    });
    setResize(true);
    setZoom(false);
    setSize([
      windowRef?.current?.clientWidth || initialSize[0],
      windowRef?.current?.clientHeight || initialSize[1],
    ]);
  };

  const startMoveWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (modal && type == "error") {
      // Don't allow modal error dialogs to move
      return;
    }
    track("move", { type: "ClassicyWindow", ...analyticsArgs });
    setClickPosition([
      e.clientX - (windowRef?.current?.getBoundingClientRect().left || 0),
      e.clientY - (windowRef?.current?.getBoundingClientRect().top || 0),
    ]);
    desktopEventDispatch({
      type: "ClassicyWindowMove",
      app: {
        id: appId,
      },
      window: ws,
      moving: true,
      position: [
        windowRef?.current?.getBoundingClientRect().left,
        windowRef?.current?.getBoundingClientRect().top,
      ],
    });
    player({ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveIdle" });
    setDragging(true);
  };

  const changeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (ws.resizing || ws.dragging) {
      setActive(e);
    }

    if (ws.resizing) {
      setSize([
        Math.abs(ws.position[0] - e.clientX) + 5,
        Math.abs(ws.position[1] - e.clientY) + 5,
      ]);
    }

    if (ws.dragging) {
      player({ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveMoving" });
      setMoving(true, [
        e.clientX - clickPosition[0],
        e.clientY - clickPosition[1],
      ]);
    }
  };

  const stopChangeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
    track("halt", { type: "ClassicyWindow", ...analyticsArgs });
    e.preventDefault();
    setActive();
    if (ws.resizing || ws.dragging || ws.moving) {
      player({
        type: "ClassicySoundPlayInterrupt",
        sound: "ClassicyWindowMoveStop",
      });
    }
    setResize(false);
    setDragging(false);
    setMoving(false, [ws.position[0], ws.position[1]]);
  };

  const setDragging = (toDrag: boolean) => {
    desktopEventDispatch({
      type: "ClassicyWindowDrag",
      dragging: toDrag,
      app: {
        id: appId,
      },
      window: ws,
    });
  };

  const setMoving = (
    toMove: boolean,
    toPosition: [number, number] = [0, 0],
  ) => {
    desktopEventDispatch({
      type: "ClassicyWindowMove",
      moving: toMove,
      position: toPosition,
      app: {
        id: appId,
      },
      window: ws,
    });
  };

  const isActive = useCallback(() => {
    return ws.focused;
  }, [ws.focused]);

  const setActive = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
    e?.preventDefault();
    track("focus", { type: "ClassicyWindow", ...analyticsArgs });
    if (!ws.focused) {
      player({ type: "ClassicySoundPlay", sound: "ClassicyWindowFocus" });

      desktopEventDispatch({
        type: "ClassicyWindowFocus",
        app: {
          id: appId,
          appMenu: appMenu,
        },
        window: ws,
      });
      // desktopEventDispatch({
      //     type: 'ClassicyWindowContextMenu',
      //     contextMenu: contextMenu || [],
      // })
    }
  }, [ws, appId, appMenu, desktopEventDispatch, player, track, analyticsArgs]);

  useEffect(() => {
    // This ensures that once a window has opened it becomes the focus.
    setActive();
    if (modal && type == "error") {
      player({ type: "ClassicySoundPlayError" });
    }
  }, [modal, player, setActive, type]);

  const toggleCollapse = () => {
    if (collapsable) {
      setCollapse(!ws.collapsed);
    }
  };

  const setCollapse = (toCollapse: boolean) => {
    if (toCollapse) {
      track("collapse", { type: "ClassicyWindow", ...analyticsArgs });
      setZoom(false);
      player({ type: "ClassicySoundPlay", sound: "ClassicyWindowCollapse" });
      desktopEventDispatch({
        type: "ClassicyWindowCollapse",
        window: ws,
        app: {
          id: appId,
        },
      });
    } else {
      track("expand", { type: "ClassicyWindow", ...analyticsArgs });
      player({ type: "ClassicySoundPlay", sound: "ClassicyWindowExpand" });
      desktopEventDispatch({
        type: "ClassicyWindowExpand",
        window: ws,
        app: {
          id: appId,
        },
      });
    }
  };

  const toggleZoom = () => {
    setActive();
    if (zoomable) {
      setZoom(!ws.zoomed, false);
    }
  };

  const setZoom = (toZoom: boolean, playSound: boolean = true) => {
    if (ws.collapsed) {
      setCollapse(false);
    }
    if (!playSound) {
      player({
        type: "ClassicySoundPlay",
        sound: toZoom
          ? "ClassicyWindowZoomMaximize"
          : "ClassicyWindowZoomMinimize",
      });
    }
    track(toZoom ? "zoom" : "minimize", {
      type: "ClassicyWindow",
      ...analyticsArgs,
    });
    desktopEventDispatch({
      type: "ClassicyWindowZoom",
      zoomed: toZoom,
      window: ws,
      app: {
        id: appId,
      },
    });
  };

  const setContextMenu = (toShow: boolean, atPosition: [number, number]) => {
    desktopEventDispatch({
      type: "ClassicyWindowContextMenu",
      contextMenu: toShow,
      position: atPosition,
      window: ws,
      app: {
        id: appId,
      },
    });
  };

  const onMouseOutHandler = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setContextMenu(false, [0, 0]);
  };

  const showContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActive();
    track("contextMenu", {
      type: "ClassicyWindow",
      show: true,
      ...analyticsArgs,
    });
    setContextMenu(true, [
      e.clientX - clickOffset[0],
      e.clientY - clickOffset[1],
    ]);
  };

  const setResize = (toResize: boolean) => {
    if (resizable) {
      desktopEventDispatch({
        type: "ClassicyWindowResize",
        resizing: toResize,
        window: ws,
        size: [
          windowRef.current?.getBoundingClientRect().width,
          windowRef.current?.getBoundingClientRect().height,
        ],
        app: {
          id: appId,
        },
      });
    }
  };

  const close = () => {
    setActive();
    track("close", { type: "ClassicyWindow", show: true, ...analyticsArgs });
    player({ type: "ClassicySoundPlay", sound: "ClassicyWindowClose" });
    desktopEventDispatch({
      type: "ClassicyWindowClose",
      app: {
        id: appId,
      },
      window: ws,
    });
    if (typeof onCloseFunc === "function") {
      onCloseFunc(id);
    }
  };

  return (
    <>
      {!ws.closed && (
        <div
          id={[appId, id].join("_")}
          ref={windowRef}
          style={{
            width: size[0] === 0 ? "auto" : size[0],
            height: ws.collapsed ? "auto" : size[1] === 0 ? "auto" : size[1],
            left: ws.position[0],
            top: ws.position[1],
            minWidth: minimumSize[0],
            minHeight: ws.collapsed ? 0 : minimumSize[1],
          }}
          className={classNames(
            "classicyWindow",
            ws.collapsed ? "classicyWindowCollapsed" : "",
            ws.zoomed ? "classicyWindowZoomed" : "",
            isActive() ? "classicyWindowActive" : "classicyWindowInactive",
            !ws.closed ? "" : "classicyWindowInvisible",
            ws.moving ? "classicyWindowDragging" : "",
            ws.resizing ? "classicyWindowResizing" : "",
            modal ? "classicyWindowModal" : "",
            modal && type == "error" ? "classicyWindowRed" : "",
            scrollable ? "" : "classicyWindowNoScroll",
          )}
          onMouseMove={changeWindow}
          onMouseUp={stopChangeWindow}
          onClick={setActive}
          onContextMenu={showContextMenu}
          onMouseOut={onMouseOutHandler}
        >
          <>
            {contextMenu && ws.contextMenu && (
              <ClassicyContextualMenu
                name={[appId, id, "contextMenu"].join("_")}
                menuItems={contextMenu}
                position={clickPosition}
              ></ClassicyContextualMenu>
            )}

            <div
              className={classNames(
                "classicyWindowTitleBar",
                modal === true ? "classicyWindowTitleBarModal" : "",
              )}
            >
              {closable && (
                <div className={"classicyWindowControlBox"}>
                  <div
                    className={"classicyWindowCloseBox"}
                    onClick={close}
                  ></div>
                </div>
              )}
              <div
                className={"classicyWindowTitle"}
                onMouseDown={startMoveWindow}
                onMouseUp={stopChangeWindow}
              >
                {title !== "" ? (
                  <>
                    <div className={"classicyWindowTitleLeft"}></div>
                    <div className={"classicyWindowIcon"}>
                      <img src={icon} alt={title} />
                    </div>
                    <div className={"classicyWindowTitleText"}>
                      <p>{title}</p>
                    </div>
                    <div className={"classicyWindowTitleRight"}></div>
                  </>
                ) : (
                  <div className={"classicyWindowTitleCenter"}></div>
                )}
              </div>
              {zoomable && (
                <div className={"classicyWindowControlBox"}>
                  <div
                    className={"classicyWindowZoomBox"}
                    onClick={toggleZoom}
                  ></div>
                </div>
              )}
              {collapsable && (
                <div className={"classicyWindowControlBox"}>
                  <div
                    className={"classicyWindowCollapseBox"}
                    onClick={toggleCollapse}
                  ></div>
                </div>
              )}
            </div>
            {header && !ws.collapsed && (
              <div
                className={classNames(
                  "classicyWindowHeader",
                  isActive() ? "" : "classicyWindowHeaderDimmed",
                )}
              >
                {header}
              </div>
            )}
            <div
              className={classNames(
                !isActive() ? "classicyWindowContentsDimmed" : "",
                scrollable === true ? "" : "classicyWindowNoScroll",
                modal === true
                  ? "classicyWindowContentsModal"
                  : "classicyWindowContents",
                header ? "classicyWindowContentsWithHeader" : "",
                ws.collapsed ? "hidden" : "block",
              )}
            >
              <div
                className={classNames(
                  "classicyWindowContentsInner",
                  modal === true ? "classicyWindowContentsModalInner" : "",
                  growable ? "classicyWindowContentsInnerGrow" : "",
                )}
              >
                {" "}
                {children}
              </div>
            </div>
            {resizable && !ws.collapsed && (
              <div
                className={classNames(
                  "classicyWindowResizer",
                  isActive() ? "" : "classicyWindowResizerDimmed",
                )}
                onMouseDown={startResizeWindow}
                onMouseUp={stopChangeWindow}
              ></div>
            )}
          </>
        </div>
      )}
    </>
  );
};
