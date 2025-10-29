import {
    ActionMessage,
    ClassicyAppManagerHandler,
    ClassicyStore,
    ClassicyStoreSystemManager,
} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import {ClassicyMenuItem} from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import React from 'react'

export interface ClassicyStoreSystemDesktopManagerIcon {
    appId: string
    appName: string
    icon: string
    label?: string
    kind: string
    location?: [number, number]
    onClickFunc?: (event: React.MouseEvent) => void
    event?: string
    eventData?: any
    contextMenu?: ClassicyMenuItem[]
}

export interface ClassicyStoreSystemDesktopManager extends ClassicyStoreSystemManager {
    selectedIcons?: string[]
    systemMenu: ClassicyMenuItem[]
    appMenu: ClassicyMenuItem[]
    contextMenu: ClassicyMenuItem[]
    showContextMenu: boolean
    icons: ClassicyStoreSystemDesktopManagerIcon[]
    selectBox: {
        size: [number, number]
        start: [number, number]
        active: boolean
    }
}

export const classicyDesktopEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    const mgr = new ClassicyAppManagerHandler()

    switch (action.type) {
        case 'ClassicyDesktopAppMenuAdd': {
            const menuItem = {
                id: 'system_menu_' + action.app.id,
                title: action.app.name,
                image: action.app.icon,
                event: 'ClassicyAppOpen',
                eventData: {
                    app: {
                        id: action.app.id,
                        name: action.app.name,
                        icon: action.app.icon,
                    },
                },
            }

            const exists = ds.System.Manager.Desktop.systemMenu.findIndex((i) => i.id === menuItem.id)
            if (exists >= 0) {
                ds.System.Manager.Desktop.systemMenu[exists] = menuItem
            } else {
                ds.System.Manager.Desktop.systemMenu.push(menuItem)
            }

            break
        }
        case 'ClassicyDesktopAppMenuRemove': {
            const exists = ds.System.Manager.Desktop.systemMenu.findIndex(
                (i) => i && i.id == `system_menu_${action.app.id}`
            )
            if (exists >= 0) {
                ds.System.Manager.Desktop.systemMenu.splice(exists, 1)
            }
            break
        }
        case 'ClassicyDesktopFocus': {
            if ('e' in action && action.e.target.id === 'classicyDesktop') {
                ds = mgr.deFocusApps(ds)

                ds.System.Manager.App.apps['Finder.app'].focused = true
                ds.System.Manager.Desktop.selectedIcons = []
                ds.System.Manager.Desktop.showContextMenu = false
                ds.System.Manager.Desktop.selectBox.active = true
                ds.System.Manager.Desktop.selectBox.start = [action.e.clientX, action.e.client]
            }

            if ('menuBar' in action) {
                ds.System.Manager.Desktop.appMenu = action.menuBar
            }

            break
        }
        case 'ClassicyDesktopDoubleClick': {
            break
        }
        case 'ClassicyDesktopDrag': {
            ds.System.Manager.Desktop.selectBox.start = [
                action.e.clientX - ds.System.Manager.Desktop.selectBox.start[0],
                action.e.clientY - ds.System.Manager.Desktop.selectBox.start[1],
            ]

            ds.System.Manager.Desktop.selectBox.size = [0, 0]
            break
        }
        case 'ClassicyDesktopStop': {
            ds.System.Manager.Desktop.selectBox.active = false
            ds.System.Manager.Desktop.selectBox.size = [0, 0]
            ds.System.Manager.Desktop.selectBox.start = [0, 0]
            break
        }
        case 'ClassicyDesktopContextMenu': {
            ds.System.Manager.Desktop.showContextMenu = action.showContextMenu
            if (action.contextMenu) {
                ds.System.Manager.Desktop.contextMenu = action.contextMenu
            }
            break
        }
        case 'ClassicyDesktopChangeTheme': {
            const foundTheme = ds.System.Manager.Appearance.availableThemes?.find(
                (a) => a.id == action.activeTheme
            )
            if (foundTheme) {
                ds.System.Manager.Appearance.activeTheme = foundTheme
            }
            break
        }
        case 'ClassicyDesktopChangeBackground': {
            ds.System.Manager.Appearance.activeTheme.desktop.backgroundImage = action.backgroundImage
            ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize = 'auto'
            break
        }
        case 'ClassicyDesktopChangeBackgroundPosition': {
            ds.System.Manager.Appearance.activeTheme.desktop.backgroundPosition = action.backgroundPosition
            break
        }
        case 'ClassicyDesktopChangeBackgroundRepeat': {
            ds.System.Manager.Appearance.activeTheme.desktop.backgroundRepeat = action.backgroundRepeat
            break
        }
        case 'ClassicyDesktopChangeBackgroundSize': {
            ds.System.Manager.Appearance.activeTheme.desktop.backgroundSize = action.backgroundSize
            break
        }
        case 'ClassicyDesktopChangeFont': {
            switch (action.fontType) {
                case 'body':
                    ds.System.Manager.Appearance.activeTheme.typography.body = action.font
                    break
                case 'ui':
                    ds.System.Manager.Appearance.activeTheme.typography.ui = action.font
                    break
                case 'header':
                    ds.System.Manager.Appearance.activeTheme.typography.header = action.font
                    break
            }
            break
        }
        case 'ClassicyDesktopLoadThemes': {
            ds.System.Manager.Appearance.availableThemes = action.availableThemes
        }
    }
    return ds
}
