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
            ds.System.Manager.Appearance.activeTheme = ds.System.Manager.Appearance.availableThemes[action.activeTheme]
            break
        }
        case 'ClassicyDesktopLoadThemes': {
            console.log('LOADING THEMES')
            ds.System.Manager.Appearance.availableThemes = action.availableThemes
        }
    }
    return ds
}

// export interface ClassicyDesktopState {
//     activeTheme: string
//     availableThemes: ClassicyTheme[]
//
//     soundPlayer: Howl
//     selectedDesktopIcons: string[]
//
//     activeWindow: string
//     activeApp: string
//
//     menuBar: ClassicyMenuItem[]
//     systemMenu: ClassicyMenuItem[]
//     appSwitcherMenu: ClassicyMenuItem[]
//     contextMenu: ClassicyMenuItem[]
//     showContextMenu: boolean
//     selectBox: boolean
//     selectBoxSize: number[]
//     selectBoxStart: number[]
//     desktopIcons: ClassicyDesktopIconState[]
//     openApps: ClassicyAppItem[]
//     new?: ClassicyStore
// }
//
// export type ClassicyAppItem = {
//     id: string
//     name: string
//     icon: string
//     hidden: boolean
//     defaultWindow?: string
// }
// activeTheme: 'default', RENAMED
// availableThemes: [],
// selectedDesktopIcons: [],
// soundPlayer: null, TODO: FIX THIS!
// activeWindow: '', TODO: MOVED
// menuBar: [],
// systemMenu: [
//     {
//         id: 'about',
//         title: 'About This Computer',
//         keyboardShortcut: '&#8984;S',
//     },
//     {id: 'spacer'},
// ],
// activeApp: 'finder.app',
// appSwitcherMenu: [
//     {
//         id: 'finder.app',
//         title: 'Finder',
//         icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
//         onClickFunc: () => alert("e")
//     },
// ],
// openApps: [
//     {
//         id: 'finder.app',
//         name: 'Finder',
//         icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
//         hidden: false,
//     },
// ],
// desktopIcons: [],
// contextMenu: [],
// showContextMenu: false,
// selectBox: false,
// selectBoxSize: [0, 0],
// selectBoxStart: [0, 0],
