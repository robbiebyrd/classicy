import {
    ClassicyStore,
    ClassicyStoreSystemAppWindow,
} from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

const initialWindowState = {
    closed: false,
    collapsed: false,
    dragging: false,
    moving: false,
    resizing: false,
    sounding: false,
    zoomed: false,
    contextMenuShown: false,
}

export const classicyWindowEventHandler = (ds: ClassicyStore, action) => {
    const updateWindow = (appId: string, windowId: string, updates: any) => {
        ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
            if (a.id === appId) {
                a.windows = a.windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w))
            }
            return a
        })
        return ds
    }

    switch (action.type) {
        case 'ClassicyWindowOpen':
            const app = ds.System.Manager.App.apps.findIndex((app) => app.id === action.app.id)
            const window = ds.System.Manager.App.apps[app].windows.findIndex((w) => w.id === action.window.id)
            if (window < 0) {
                ds.System.Manager.App.apps[app].windows.push({
                    ...initialWindowState,
                    id: action.window.id,
                    minimumSize: action.window.minimumSize,
                    size: action.window.size,
                    position: action.window.position,
                    closed: false,
                    hidden: false,
                } as ClassicyStoreSystemAppWindow)
            }
            break
        case 'ClassicyWindowFocus':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.focused = true
                    a.windows = a.windows.map((w) => {
                        w.focused = w.id == action.window.id
                        ds.System.Manager.Desktop.appMenu = action.app.appMenu
                        return w
                    })
                }
                return a
            })
            break

        case 'ClassicyWindowClose':
            ds = updateWindow(action.app.id, action.window.id, { closed: true })
            break

        case 'ClassicyWindowMenu':
            ds.System.Manager.Desktop.appMenu = action.menuBar
            break

        case 'ClassicyWindowResize':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.resizing = action.resizing
                            w.size = action.size
                        }
                        return w
                    })
                }
                return a
            })
            break
        case 'ClassicyWindowDrag':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.dragging = action.dragging
                        }
                        return w
                    })
                }
                return a
            })
            break
        case 'ClassicyWindowZoom':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.zoomed = action.zoomed
                        }
                        return w
                    })
                }
                return a
            })
            break
        case 'ClassicyWindowCollapse':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.collapsed = true
                        }
                        return w
                    })
                }
                return a
            })
            break
        case 'ClassicyWindowExpand':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.collapsed = false
                        }
                        return w
                    })
                }
                return a
            })
            break

        case 'ClassicyWindowMove': {
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.position = action.position
                            w.moving = action.moving
                        }
                        return w
                    })
                }
                return a
            })
            break
        }
        case 'ClassicyWindowPosition': {
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.position = action.position
                        }
                        return w
                    })
                }
                return a
            })
            break
        }
        // case 'ClassicyWindowContextMenu': {
        //     ws.contextMenu = action.contextMenu
        //     if (action.contextMenuShown === true) {
        //         ws.contextMenuLocation = action.position
        //     }
        //     break
        // }
        // }
    }
    return ds
}
