import macosIcon from 'img/icons/system/macos.png';
import {
    ClassicyStoreSystemAppearanceManager,
    ClassicyTheme, getAllThemes,
} from '@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import {
    classicyDateTimeManagerEventHandler
} from '@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager'
import {ClassicyStoreSystemSoundManager} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import {classicyFinderEventHandler} from '@/SystemFolder/Finder/FinderContext'
import {classicyQuickTimeMoviePlayerEventHandler} from '@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext'
import {classicyQuickTimePictureViewerEventHandler} from '@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext'
import {classicyDesktopIconEventHandler} from '@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext'
import {
    classicyDesktopEventHandler,
    ClassicyStoreSystemDesktopManager,
} from '@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager'
import {classicyWindowEventHandler} from '@/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext'
import {ClassicyMenuItem} from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import themesData from '../AppearanceManager/styles/themes.json'

export interface ClassicyStoreSystemAppManager extends ClassicyStoreSystemManager {
    apps: Record<string, ClassicyStoreSystemApp>
}

export interface ClassicyStoreSystemApp {
    id: string
    name: string
    icon: string
    windows: ClassicyStoreSystemAppWindow[]
    open: boolean
    data?: Record<string, any>
    focused?: boolean
    noDesktopIcon?: boolean
    debug?: boolean
    openOnBoot?: boolean
    options?: Record<string, any>[]
    appMenu?: ClassicyMenuItem[]
}

export interface ClassicyStoreSystemAppWindow {
    closed: boolean
    id: string
    appId?: string
    title?: string
    icon?: string
    size: [number, number]
    position: [number, number]
    minimumSize: [number, number]
    focused?: boolean
    default?: boolean
    resizing?: boolean
    zoomed?: boolean
    collapsed?: boolean
    dragging?: boolean
    moving?: boolean
    modal?: boolean
    menuBar?: ClassicyMenuItem[]
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
        DateAndTime: ClassicyStoreSystemDateAndTimeManager
    }
}

export interface ClassicyStoreSystemDateAndTimeManager extends ClassicyStoreSystemManager {
    dateTime: string
    timeZoneOffset: string
    militaryTime: boolean
    displaySeconds: boolean
    displayPeriod: boolean
    displayDay: boolean
    displayLongDay: boolean
    flashSeparators: boolean
    show: boolean
}

export interface ClassicyStoreSystemManager {
}

export class ClassicyAppManagerHandler {
    public getAppIndex(ds: ClassicyStore, appId: string) {
        return ds.System.Manager.App.apps[appId]
    }

    public deFocusApps(ds: ClassicyStore) {
        Object.entries(ds.System.Manager.App.apps).forEach(([key]) => {
            ds.System.Manager.App.apps[key].focused = false
            ds.System.Manager.App.apps[key].windows = ds.System.Manager.App.apps[key].windows.map((w) => {
                w.focused = false
                return w
            })
        })
        return ds
    }

    public focusApp(ds: ClassicyStore, appId: string) {
        ds = this.deFocusApps(ds)
        if (ds.System.Manager.App.apps[appId]) {
            ds.System.Manager.App.apps[appId].focused = true
        }
        const focusedWindow = ds.System.Manager.App.apps[appId]?.windows.findIndex((w) => w.default)
        if (focusedWindow > 0) {
            ds.System.Manager.App.apps[appId].windows[focusedWindow].closed = false
            ds.System.Manager.App.apps[appId].windows[focusedWindow].focused = true
            if (ds.System.Manager.App.apps[appId].appMenu) {
                ds.System.Manager.Desktop.appMenu = ds.System.Manager.App.apps[appId].appMenu
            }
        } else if (ds.System.Manager.App.apps[appId]?.windows.length == 1) {
            ds.System.Manager.App.apps[appId].windows[0].closed = false
            ds.System.Manager.App.apps[appId].windows[0].focused = true
            if (ds.System.Manager.App.apps[appId].appMenu) {
                ds.System.Manager.Desktop.appMenu = ds.System.Manager.App.apps[appId].appMenu
            }
        }
    }

    public openApp(ds: ClassicyStore, appId: string, appName: string, appIcon: string) {
        const findApp = ds.System.Manager.App.apps[appId]
        if (findApp) {
            ds.System.Manager.App.apps[appId].open = true
            ds.System.Manager.App.apps[appId].windows = ds.System.Manager.App.apps[appId].windows.map((w) => {
                w.closed = false
                return w
            })
            this.focusApp(ds, appId)
        } else {
            ds.System.Manager.App.apps[appId] = {
                id: appId,
                name: appName,
                icon: appIcon,
                windows: [],
                open: true,
                data: {},
            }
        }
    }

    public loadApp(ds: ClassicyStore, appId: string, appName: string, appIcon: string) {
        const findApp = ds.System.Manager.App.apps[appId]
        if (!findApp) {
            ds.System.Manager.App.apps[appId] = {
                id: appId,
                name: appName,
                icon: appIcon,
                windows: [],
                open: false,
                data: {},
            }
        }
    }

    public closeApp(ds: ClassicyStore, appId: string) {
        const findApp = ds.System.Manager.App.apps[appId]
        if (findApp) {
            ds.System.Manager.App.apps[appId].open = false
            ds.System.Manager.App.apps[appId].focused = false
            ds.System.Manager.App.apps[appId].windows?.map((w) => (w.closed = true))
        }
    }

    public activateApp(ds: ClassicyStore, appId: string) {
        Object.entries(ds.System.Manager.App.apps).forEach(([key]) => {
            ds.System.Manager.App.apps[key].focused = key === appId
        })
        Object.entries(ds.System.Manager.App.apps).forEach(([key]) => {
            if (key !== appId) {
                ds.System.Manager.App.apps[key].windows = ds.System.Manager.App.apps[key].windows.map((w) => {
                    w.focused = false
                    return w
                })
            }
        })
    }
}

export type ActionMessage = Record<string, any> & { type: string }

export const classicyAppEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    const handler = new ClassicyAppManagerHandler()

    switch (action.type) {
        case 'ClassicyAppOpen': {
            handler.openApp(ds, action.app.id, action.app.name, action.app.icon)
            break
        }
        case 'ClassicyAppLoad': {
            handler.loadApp(ds, action.app.id, action.app.name, action.app.icon)
            break
        }
        case 'ClassicyAppClose': {
            handler.closeApp(ds, action.app.id)
            const openApps = Object.values(ds.System.Manager.App.apps).find((value) => {
                return value.open
            })

            if (openApps?.id) {
                handler.focusApp(ds, openApps.id)
            }

            break
        }
        case 'ClassicyAppFocus': {
            handler.focusApp(ds, action.app.id)
            break
        }
        case 'ClassicyAppActivate': {
            handler.activateApp(ds, action.app.id)
            break
        }
    }

    return ds
}

export const classicyDesktopStateEventReducer = (ds: ClassicyStore, action: ActionMessage) => {
    if ('debug' in action) {
        console.group("Desktop Event")
        console.log("Action: ", action)
        console.log("Start State: ", ds)
    }

    if ('type' in action) {
        if (action.type.startsWith('ClassicyWindow')) {
            ds = classicyWindowEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyAppFinder')) {
            ds = classicyFinderEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyAppMoviePlayer')) {
            ds = classicyQuickTimeMoviePlayerEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyAppPictureViewer')) {
            ds = classicyQuickTimePictureViewerEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktopIcon')) {
            ds = classicyDesktopIconEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktop')) {
            ds = classicyDesktopEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyManagerDateTime')) {
            ds = classicyDateTimeManagerEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyApp')) {
            ds = classicyAppEventHandler(ds, action)
        }
    }

    if ('debug' in action) {
        console.log("End State: ", ds)
        console.groupEnd()
    }

    return {...ds}
}

export const DefaultDesktopState: ClassicyStore = {
    System: {
        Manager: {
            DateAndTime: {
                show: true,
                dateTime: new Date().toISOString(),
                timeZoneOffset: (new Date().getTimezoneOffset() / -60).toString(),
                militaryTime: false,
                displaySeconds: true,
                displayPeriod: true,
                displayDay: true,
                displayLongDay: false,
                flashSeparators: true,
            },
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
                        onClickFunc: () => console.log('ABOUT'),
                    },
                    {id: 'spacer'},
                ],
                appMenu: [],
                selectBox: {
                    size: [0, 0],
                    start: [0, 0],
                    active: false,
                },
            },
            App: {
                apps: {
                    'Finder.app': {
                        id: 'Finder.app',
                        name: 'Finder',
                        icon: macosIcon,
                        windows: [],
                        open: true,
                        focused: true,
                        noDesktopIcon: true,
                        openOnBoot: true,
                        data: {},
                    },
                },
            },
            Appearance: {
                availableThemes: getAllThemes(),
                activeTheme: themesData.find((t) => t.id == 'default') as unknown as ClassicyTheme,
            },
        },
    },
}
