import {
  getAllThemes,
  getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import "./ClassicyDesktop.scss";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import classNames from "classnames";
import macosIcon from "@img/icons/system/macos.png";
import { FC as FunctionalComponent, ReactNode, MouseEvent, CSSProperties, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../ControlPanels/AppearanceManager/styles/fonts.scss";
import "../../../index.css";

interface ClassicyDesktopProps {
  children?: ReactNode;
}

export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
  children,
}) => {
  const [contextMenu, setContextMenu] = useState(false);
  const [contextMenuLocation, setContextMenuLocation] = useState([0, 0]);
  const [showAbout, setShowAbout] = useState(false);

  const [selectBoxStart, setSelectBoxStart] = useState([0, 0]);
  const [selectBoxSize, setSelectBoxSize] = useState([0, 0]);
  const [selectBox, setSelectBox] = useState(false);

  const clickOffset = [10, 10];
  const rafIdRef = useRef<number | null>(null);

  const availableThemes = useAppManager(s => s.System.Manager.Appearance.availableThemes);
  const activeTheme = useAppManager(s => s.System.Manager.Appearance.activeTheme);
  const desktopIcons = useAppManager(s => s.System.Manager.Desktop.icons);
  const desktopEventDispatch = useAppManagerDispatch();

  // Load themes on mount if not already loaded
  useEffect(() => {
    if (availableThemes && availableThemes.length <= 0) {
      startTransition(() => {
        desktopEventDispatch({
          type: "ClassicyDesktopLoadThemes",
          availableThemes: getAllThemes(),
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel any pending RAF on unmount to prevent state updates after teardown
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const startSelectBox = (e: MouseEvent<HTMLDivElement>) => {
    if ("id" in e.target && e.target.id == "classicyDesktop") {
      if (e.button > 1) {
        toggleDesktopContextMenu(e);
      } else {
        clearActives(e);
        setSelectBox(true);
        setSelectBoxStart([e.clientX, e.clientY]);
        setSelectBoxSize([0, 0]);
      }
    }
  };

  const resizeSelectBox = (e: MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setSelectBoxSize([x - selectBoxStart[0], y - selectBoxStart[1]]);
      rafIdRef.current = null;
    });
  };

  const clearSelectBox = () => {
    clearSelectedIcons();
    setSelectBoxSize([0, 0]);
    setSelectBoxStart([0, 0]);
    setSelectBox(false);
  };

  const clearActives = (e: MouseEvent<HTMLDivElement>) => {
    setContextMenu(false);
    clearSelectedIcons();
    desktopEventDispatch({
      type: "ClassicyDesktopFocus",
      e: e,
      menuBar: defaultMenuItems,
    });
  };

  const clearSelectedIcons = () => {
    desktopEventDispatch({ type: "ClassicyDesktopIconClearFocus" });
  };

  const toggleDesktopContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.id === "classicyDesktop") {
      setContextMenuLocation([
        e.clientX - clickOffset[0],
        e.clientY - clickOffset[1],
      ]);
      setContextMenu(!contextMenu);
    }
  };

  const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => [
    {
      id: "finder_file",
      title: "File",
      disabled: true,
    },
    {
      id: "finder_edit",
      title: "Edit",
      disabled: true,
    },
    {
      id: "finder_view",
      title: "View",
      menuChildren: [
        {
          id: "finder.app_CleanupDesktopIcons",
          title: "Clean up",
          onClickFunc: () => {
            desktopEventDispatch({
              type: "ClassicyDesktopIconCleanup",
            });
          },
        },
        {
          id: "finder.app_ArrangeDesktopIconsName",
          title: "Arrange By Name",
          onClickFunc: () => {
            desktopEventDispatch({
              type: "ClassicyDesktopIconSort",
              sortBy: "name",
            });
          },
        },
        {
          id: "finder.app_ArrangeDesktopIconsKind",
          title: "Arrange By Type",
          onClickFunc: () => {
            desktopEventDispatch({
              type: "ClassicyDesktopIconSort",
              sortBy: "kind",
            });
          },
        },
      ],
    },
    {
      id: "finder_special",
      title: "Special",
      disabled: true,
    },

    {
      id: "finder_help",
      title: "Help",
      menuChildren: [
        {
          id: "finder_help_about",
          title: "About",
          onClickFunc: () => {
            setShowAbout(true);
          },
        },
      ],
    },
  ], [desktopEventDispatch]);

  const closeContextMenu = useCallback(() => setContextMenu(false), []);

  const currentTheme = useMemo(() => getThemeVars(activeTheme), [activeTheme]);

  return (
    <>
      <div
        id={"classicyDesktop"}
        style={currentTheme as CSSProperties}
        className={classNames("classicyDesktop")}
        onMouseMove={resizeSelectBox}
        onContextMenu={toggleDesktopContextMenu}
        onMouseUp={clearSelectBox}
        onMouseDown={startSelectBox}
      >
        {selectBox && (
          <div
            className={"classicyDesktopSelect"}
            style={{
              left: selectBoxStart[0],
              top: selectBoxStart[1],
              width: selectBoxSize[0],
              height: selectBoxSize[1],
            }}
          />
        )}
        <ClassicyDesktopMenuBar />
        {contextMenu ? (
          <ClassicyContextualMenu
            name={"desktopContextMenu"}
            menuItems={defaultMenuItems}
            position={contextMenuLocation}
            onClose={closeContextMenu}
          />
        ) : null}
        <Finder />
        <ClassicyControlPanels />
        {showAbout
          ? getClassicyAboutWindow({
              appId: "Finder.app",
              appName: "Finder",
              appIcon: macosIcon,
              hideFunc: () => setShowAbout(false),
            })
          : null}
        {desktopIcons.map((i) => (
          <ClassicyDesktopIcon
            appId={i.appId}
            appName={i.appName}
            icon={i.icon}
            label={i.label}
            kind={i.kind}
            key={i.appId}
            event={i.event}
            eventData={i.eventData}
          />
        ))}
        {children}
      </div>
    </>
  );
};
