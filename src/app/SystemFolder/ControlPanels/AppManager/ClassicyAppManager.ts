import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import { ClassicyStoreSystemSoundManager } from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySound'
import {
    ClassicyStoreSystemAppearanceManager,
    ClassicyTheme,
} from '@/app/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import { ClassicyStoreSystemDesktopManager } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager'
import { classicyWindowEventHandler } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext'
import { classicyDesktopIconEventHandler } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext'
import themesData from '@/app/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json'

export interface ClassicyStoreSystemAppManager extends ClassicyStoreSystemManager {
    apps: ClassicyStoreSystemApp[]
}

export interface ClassicyStoreSystemApp {
    id: string
    name: string
    icon: string
    windows: ClassicyStoreSystemAppWindow[]
    open: boolean
    focused?: boolean
    noDesktopIcon?: boolean
    debug?: boolean
    openOnBoot?: boolean
    options?: Record<string, any>[]
    appMenu?: ClassicyMenuItem[]
}

export interface ClassicyStoreSystemAppWindow {
    id: string
    appId?: string
    title?: string
    icon?: string
    size: [number, number]
    position: [number, number]
    minimumSize: [number, number]
    focused?: boolean
    default?: boolean
    hidden?: boolean
    resizing?: boolean
    zoomed?: boolean
    collapsed?: boolean
    dragging?: boolean
    moving?: boolean
    modal?: boolean
    appMenu?: ClassicyMenuItem[]
    contextMenu?: ClassicyMenuItem[]
    showContextMenu?: boolean
    options?: Record<string, any>[]
}

export interface ClassicyStore {
    System: ClassicyStoreSystem
    Resource?: {
        App: Record<string, any>
    }
}

export interface ClassicyStoreSystem {
    Manager: {
        Desktop: ClassicyStoreSystemDesktopManager
        Sound: ClassicyStoreSystemSoundManager
        App: ClassicyStoreSystemAppManager
        Appearance: ClassicyStoreSystemAppearanceManager
    }
}

export interface ClassicyStoreSystemManager {}

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

export const classicyAppEventHandler = (ds: ClassicyStore, action) => {
    switch (action.type) {
        case 'ClassicyAppOpen': {
            const findApp = ds.System.Manager.App.apps.findIndex((d) => d.id === action.app.id)
            console.log('findApp', findApp)
            if (findApp >= 0) {
                ds.System.Manager.App.apps[findApp].open = true
                ds.System.Manager.App.apps[findApp].focused = true
                const focusedWindow = ds.System.Manager.App.apps[findApp].windows.findIndex((w) => w.default)
                if (focusedWindow >= 0) {
                    ds.System.Manager.App.apps[findApp].windows[focusedWindow].hidden = false
                    ds.System.Manager.App.apps[findApp].windows[focusedWindow].focused = true
                }
            } else {
                ds.System.Manager.App.apps.push({
                    id: action.app.id,
                    name: action.app.name,
                    icon: action.app.icon,
                    windows: [],
                    open: true,
                })
            }
            break
        }
        case 'ClassicyAppClose': {
            const findApp = ds.System.Manager.App.apps.findIndex((d) => d.id === action.app.id)
            if (findApp >= 0) {
                ds.System.Manager.App.apps[findApp].open = false
                ds.System.Manager.App.apps[findApp].focused = false
            }
            break
        }
        case 'ClassicyAppFocus': {
            const findApp = ds.System.Manager.App.apps.findIndex((d) => d.id === action.app.id)
            if (findApp >= 0) {
                ds.System.Manager.App.apps[findApp].focused = true
                const focusedWindow = ds.System.Manager.App.apps[findApp].windows.findIndex((w) => w.default)
                if (focusedWindow >= 0) {
                    ds.System.Manager.App.apps[findApp].windows[focusedWindow].hidden = false
                    ds.System.Manager.App.apps[findApp].windows[focusedWindow].focused = true
                }
            }
            break
        }
        case 'ClassicyAppActivate': {
            const findApp = ds.System.Manager.App.apps.findIndex((d) => d.id === action.app.id)
            if (findApp >= 0) {
                ds.System.Manager.App.apps[findApp].focused = true
            }
            break
        }
    }

    return ds
}

export const classicyDesktopStateEventReducer = (ds: ClassicyStore, action) => {
    const startDs = ds
    if ('type' in action) {
        if (action.type.startsWith('ClassicyWindow')) {
            ds = classicyWindowEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyApp')) {
            ds = classicyAppEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktopIcon')) {
            ds = classicyDesktopIconEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktop')) {
            ds = classicyDesktopEventHandler(ds, action)
        }
    }
    if ('debug' in action) {
        console.group('Desktop Event')
        console.log('Action: ', action)
        console.log('Start State: ', startDs)
        console.log('End State: ', ds)
        console.groupEnd()
    }
    return { ...ds }
}

export const DefaultDesktopState: ClassicyStore = {
    System: {
        Manager: {
            Sound: {
                volume: 100,
                labels: {},
                disabled: [],
            },
            Desktop: {
                selectedIcons: [],
                contextMenu: [],
                showContextMenu: false,
                icons: [],
                systemMenu: [
                    {
                        id: 'about',
                        title: 'About This Computer',
                        keyboardShortcut: '&#8984;S',
                    },
                    { id: 'spacer' },
                ],
                appMenu: [],
                selectBox: {
                    size: [0, 0],
                    start: [0, 0],
                    active: false,
                },
            },
            App: {
                apps: [
                    {
                        id: 'Finder.app',
                        name: 'Finder',
                        icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
                        windows: [
                            {
                                id: 'Macintosh HD',
                                appId: 'Finder.app',
                                title: 'Macintosh HD',
                                icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
                                size: [300, 100],
                                position: [100, 100],
                                minimumSize: [300, 20],
                                focused: true,
                                default: true,
                            },
                        ],
                        open: true,
                        focused: true,
                        noDesktopIcon: true,
                        debug: false,
                        openOnBoot: true,
                    },
                ],
            },
            Appearance: {
                availableThemes: themesData as unknown as ClassicyTheme[],
                activeTheme: themesData.find((t) => t.id == 'default') as unknown as ClassicyTheme,
            },
        },
    },
}
