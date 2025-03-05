import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import classicyDesktopMenuStyles from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.module.scss'
import ClassicyDesktopMenuWidgetSound from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound'
import ClassicyDesktopMenuWidgetTime from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime'
import ClassicyMenu, { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import React from 'react'

const ClassicyDesktopMenuBar: React.FC = () => {
    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const systemMenuItem: ClassicyMenuItem = {
        id: 'apple-menu',
        image: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/apple.png`,
        menuChildren: desktopContext.systemMenu,
        className: classicyDesktopMenuStyles.clasicyDesktopMenuAppleMenu,
    }

    const setActiveApp = (appId: string) => {
        desktopEventDispatch({
            type: 'ClassicyAppFocus',
            app: { id: appId },
        })
    }

    let activeAppObject = desktopContext.System.Manager.App.apps.filter((app) => app.focused)

    const appSwitcherMenuMenuItem: ClassicyMenuItem = {
        id: 'app-switcher',
        image: activeAppObject[0].icon,
        title: activeAppObject[0].name,
        className: classicyDesktopMenuStyles.classicyDesktopMenuAppSwitcher,
        menuChildren: desktopContext.System.Manager.App.apps.map((app) => ({
            id: app.id,
            icon: app.icon,
            title: app.name,
            onClickFunc: () => {
                setActiveApp(app.id)
            },
        })),
    }

    const defaultMenuItems = [].concat(
        systemMenuItem,
        desktopContext.menuBar,
        appSwitcherMenuMenuItem
    ) as ClassicyMenuItem[]

    return (
        <nav className={classicyDesktopMenuStyles.classicyDesktopMenuBar}>
            <ClassicyMenu
                menuItems={defaultMenuItems}
                navClass={classicyDesktopMenuStyles.classicyDesktopMenu}
                subNavClass={classicyMenuStyles.classicySubMenu}
            >
                <ClassicyDesktopMenuWidgetSound></ClassicyDesktopMenuWidgetSound>
                <ClassicyDesktopMenuWidgetTime></ClassicyDesktopMenuWidgetTime>
            </ClassicyMenu>
        </nav>
    )
}

export default ClassicyDesktopMenuBar
