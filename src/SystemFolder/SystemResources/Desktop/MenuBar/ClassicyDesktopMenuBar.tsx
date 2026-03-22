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

export const ClassicyDesktopMenuBar: FunctionalComponent = () => {
  const apps = useAppManager(s => s.System.Manager.App.apps);
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
    const activeAppObject = Object.values(apps).filter((app) => app.focused);
    return {
      id: "app-switcher",
      image: activeAppObject?.at(0)?.icon || "",
      title: activeAppObject?.at(0)?.name || "Finder",
      className: "classicyDesktopMenuAppSwitcher",
      menuChildren: Object.values(apps)
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
  }, [apps, desktopEventDispatch]);

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
