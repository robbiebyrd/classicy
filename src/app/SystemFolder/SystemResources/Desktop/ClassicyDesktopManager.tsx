import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import {
    ClassicyStore,
    ClassicyStoreSystemManager,
} from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export interface ClassicyStoreSystemDesktopManagerIcon {
    appId: string
    appName: string
    icon: string
    label?: string
    kind?: 'app_shortcut' | 'file'
    location?: [number, number]
    onClickFunc: (event: MouseEvent) => void
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

export const classicyDesktopEventHandler = (ds: ClassicyStore, action) => {
    switch (action.type) {
        case 'ClassicyDesktopFocus': {
            if ('e' in action && action.e.target.id === 'classicyDesktop') {
                ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                    a.focused = false
                    a.windows = a.windows.map((w) => {
                        w.focused = false
                        return w
                    })
                    return a
                })

                const appI = ds.System.Manager.App.apps.findIndex((a) => (a.id = 'Finder.app'))
                ds.System.Manager.App.apps[appI].focused = true
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
        case 'ClassicyDesktopTheme': {
            ds.System.Manager.Appearance.activeTheme = ds.System.Manager.Appearance.availableThemes.find(
                (a) => a.id == action.activeTheme
            )
            break
        }
        case 'ClassicyDesktopLoadThemes': {
            ds.System.Manager.Appearance.availableThemes = action.availableThemes
        }
    }
    return ds
}
