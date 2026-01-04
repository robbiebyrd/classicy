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
import React from "react";

export const ClassicyDesktopMenuBar: React.FC = () => {
  const desktopContext = useAppManager();
  const desktopEventDispatch = useAppManagerDispatch();

  const systemMenuItem: ClassicyMenuItem = {
    id: "apple-menu",
    image: appleMenuIcon,
    menuChildren: desktopContext.System.Manager.Desktop.systemMenu,
    className: "clasicyDesktopMenuAppleMenu",
  };

  const setActiveApp = (appId: string) => {
    desktopEventDispatch({
      type: "ClassicyAppFocus",
      app: { id: appId },
    });
  };

  const activeAppObject = Object.values(
    desktopContext.System.Manager.App.apps,
  ).filter((app) => app.focused);

  const appSwitcherMenuMenuItem: ClassicyMenuItem = {
    id: "app-switcher",
    image: activeAppObject?.at(0)?.icon || "",
    title: activeAppObject?.at(0)?.name || "Finder",
    className: "classicyDesktopMenuAppSwitcher",
    menuChildren: Object.values(desktopContext.System.Manager.App.apps)
      .filter((a) => a.open)
      .map((app) => ({
        id: app.id,
        icon: app.icon,
        title: app.name,
        onClickFunc: () => {
          setActiveApp(app.id);
        },
      })),
  };

  const defaultMenuItems = [systemMenuItem] as ClassicyMenuItem[];

  if (desktopContext.System.Manager.Desktop.appMenu) {
    defaultMenuItems.push(...desktopContext.System.Manager.Desktop.appMenu);
  }

  defaultMenuItems.push(appSwitcherMenuMenuItem);

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
