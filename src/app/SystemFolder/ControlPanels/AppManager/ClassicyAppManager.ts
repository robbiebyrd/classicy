import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import {
    ClassicyStoreSystemAppearanceManager,
    ClassicyTheme,
} from '@/app/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import {
    classicyDesktopEventHandler,
    ClassicyStoreSystemDesktopManager,
} from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager'
import { classicyWindowEventHandler } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext'
import { classicyDesktopIconEventHandler } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext'
import themesData from '@/app/SystemFolder/ControlPanels/AppearanceManager/styles/themes.json'
import { classicyDateTimeManagerEventHandler } from '@/app/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.app'
import { classicyFinderEventHandler } from '@/app/SystemFolder/Finder/FinderContext'
import { ClassicyStoreSystemSoundManager } from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import { classicyQuickTimeEventHandler } from '@/app/Applications/QuickTime/QuickTimeContext'

export interface ClassicyStoreSystemAppManager extends ClassicyStoreSystemManager {
    apps: ClassicyStoreSystemApp[]
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

export interface ClassicyStoreSystemManager {}

export class ClassicyAppManagerHandler {
    public getAppIndex(ds: ClassicyStore, appId: string) {
        return ds.System.Manager.App.apps.findIndex((d) => d.id === appId)
    }

    public deFocusApps(ds: ClassicyStore) {
        ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
            a.focused = false
            a.windows = a.windows.map((w) => {
                w.focused = false
                return w
            })
            return a
        })
        return ds
    }

    public focusApp(ds: ClassicyStore, appId: string) {
        const findApp = this.getAppIndex(ds, appId)
        ds = this.deFocusApps(ds)
        ds.System.Manager.App.apps[findApp].focused = true
        const focusedWindow = ds.System.Manager.App.apps[findApp].windows.findIndex((w) => w.default)
        if (focusedWindow >= 0) {
            ds.System.Manager.App.apps[findApp].windows[focusedWindow].closed = false
            ds.System.Manager.App.apps[findApp].windows[focusedWindow].focused = true
            ds.System.Manager.Desktop.appMenu = ds.System.Manager.App.apps[findApp].appMenu
        } else if (ds.System.Manager.App.apps[findApp].windows.length > 0) {
            ds.System.Manager.App.apps[findApp].windows[0].closed = false
            ds.System.Manager.App.apps[findApp].windows[0].focused = true
            ds.System.Manager.Desktop.appMenu = ds.System.Manager.App.apps[findApp].appMenu
        }
    }

    public openApp(ds: ClassicyStore, appId: string, appName: string, appIcon: string) {
        const findApp = this.getAppIndex(ds, appId)
        if (findApp >= 0) {
            ds.System.Manager.App.apps[findApp].open = true
            ds.System.Manager.App.apps[findApp].windows = ds.System.Manager.App.apps[findApp].windows.map((w) => {
                w.closed = false
                return w
            })
            this.focusApp(ds, appId)
        } else {
            ds.System.Manager.App.apps.push({
                id: appId,
                name: appName,
                icon: appIcon,
                windows: [],
                open: true,
                data: {},
            })
        }
    }

    public closeApp(ds: ClassicyStore, appId: string) {
        const findApp = this.getAppIndex(ds, appId)
        if (findApp >= 0) {
            ds.System.Manager.App.apps[findApp].open = false
            ds.System.Manager.App.apps[findApp].focused = false
            ds.System.Manager.App.apps[findApp].windows.map((w) => (w.closed = true))
        }
    }

    public activateApp(ds: ClassicyStore, appId: string) {
        ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
            a.focused = a.id === appId
            return a
        })
        ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
            if (a.id !== appId) {
                a.windows = a.windows.map((w) => {
                    w.focused = false
                    return w
                })
            }
            return a
        })
    }
}

export const classicyAppEventHandler = (ds: ClassicyStore, action) => {
    const handler = new ClassicyAppManagerHandler()

    switch (action.type) {
        case 'ClassicyAppOpen': {
            handler.openApp(ds, action.app.id, action.app.name, action.app.icon)
            break
        }
        case 'ClassicyAppClose': {
            handler.closeApp(ds, action.app.id)
            const lastOpenApp = () => {
                const openApps = ds.System.Manager.App.apps.filter((w) => w.open)
                return openApps[0].id
            }
            handler.focusApp(ds, lastOpenApp())
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

export const classicyDesktopStateEventReducer = (ds: ClassicyStore, action) => {
    if ('debug' in action) {
        console.group('Desktop Event')
        console.log('Action: ', action)
        console.log('Start State: ', ds)
    }

    if ('type' in action) {
        if (action.type.startsWith('ClassicyWindow')) {
            ds = classicyWindowEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyAppFinder')) {
            ds = classicyFinderEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyAppQuickTime')) {
            ds = classicyQuickTimeEventHandler(ds, action)
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
        console.log('End State: ', ds)
        console.groupEnd()
    }

    return { ...ds }
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
                        windows: [],
                        open: true,
                        focused: true,
                        noDesktopIcon: true,
                        debug: false,
                        openOnBoot: true,
                        data: {},
                    },
                    {
                        id: 'QuickTimePlayer.app',
                        name: 'QuickTime Player',
                        icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/player.png`,
                        windows: [],
                        open: false,
                        data: {},
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
