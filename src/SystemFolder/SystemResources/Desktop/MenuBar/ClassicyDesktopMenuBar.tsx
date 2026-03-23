import appleMenuIcon from "@img/icons/system/apple.png";
import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicyDesktopMenuBar.scss";
import { ClassicyDesktopMenuWidgetSound } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import {
  ClassicyMenu,
  ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import { FC as FunctionalComponent, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

export const ClassicyDesktopMenuBar: FunctionalComponent = () => {
  const appSwitcherData = useAppManager(
    useShallow(s =>
      Object.values(s.System.Manager.App.apps)
        .filter(a => a.open || a.focused)
        .map(a => ({ id: a.id, name: a.name, icon: a.icon, focused: a.focused, open: a.open }))
    )
  );
  const systemMenu = useAppManager(s => s.System.Manager.Desktop.systemMenu);
  const appMenu = useAppManager(s => s.System.Manager.Desktop.appMenu);
  const desktopEventDispatch = useAppManagerDispatch();

  const setActiveApp = (appId: string) => {
    desktopEventDispatch({
      type: "ClassicyAppFocus",
      app: { id: appId },
    });
  };

  const appSwitcherMenuMenuItem: ClassicyMenuItem = useMemo(() => {
    const focusedApp = appSwitcherData.find(a => a.focused);
    return {
      id: "app-switcher",
      image: focusedApp?.icon || "",
      title: focusedApp?.name || "Finder",
      className: "classicyDesktopMenuAppSwitcher",
      menuChildren: appSwitcherData
        .filter(a => a.open)
        .map(app => ({
          id: app.id,
          icon: app.icon,
          title: app.name,
          onClickFunc: () => {
            setActiveApp(app.id);
          },
        })),
    };
  }, [appSwitcherData, desktopEventDispatch]);

  const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => {
    const systemMenuItem: ClassicyMenuItem = {
      id: "apple-menu",
      image: appleMenuIcon,
      menuChildren: systemMenu,
      className: "clasicyDesktopMenuAppleMenu",
    };
    const items = [systemMenuItem] as ClassicyMenuItem[];
    if (appMenu) {
      items.push(...appMenu);
    }
    items.push(appSwitcherMenuMenuItem);
    return items;
  }, [systemMenu, appMenu, appSwitcherMenuMenuItem]);

  return (
    <nav className={"classicyDesktopMenuBar"}>
      <ClassicyMenu
        name={"desktopMenuBar"}
        menuItems={defaultMenuItems}
        navClass={"classicyDesktopMenu"}
        subNavClass={"classicySubMenu"}
      >
        <ClassicyDesktopMenuWidgetSound />
        <ClassicyDesktopMenuWidgetTime />
      </ClassicyMenu>
    </nav>
  );
};
