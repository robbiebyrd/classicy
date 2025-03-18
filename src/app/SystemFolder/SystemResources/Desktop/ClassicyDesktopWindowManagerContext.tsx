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
                } as ClassicyStoreSystemAppWindow)
                ds.System.Manager.App.apps[app].windows[window].closed = false
            }
            break
        case 'ClassicyWindowFocus':
            console.log('WINDOW FOCUS')
            ds = updateWindow(action.app.id, action.window.id, { focused: true, hidden: false })
            break

        case 'ClassicyWindowHide':
            ds = updateWindow(action.app.id, action.window.id, { focused: false, hidden: true })
            break

        case 'ClassicyWindowClose':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    console.log('CLOSING ', a)
                    a.windows = a.windows.map((w) => {
                        if (w.id == action.window.id) {
                            w.hidden = true
                        }
                        return w
                    })
                }
                return a
            })
            break

        case 'ClassicyWindowMenu':
            ds.System.Manager.Desktop.appMenu = action.menuBar
            break

        // case 'ClassicyWindowResize': {
        //     ws.resizing = action.resizing
        //     break
        // }
        // case 'ClassicyWindowZoom': {
        //     ws.zoomed = action.zoomed
        //     break
        // }
        // case 'ClassicyWindowFocus': {
        //     break
        // }
        // case 'ClassicyWindowExpand': {
        //     ws.collapsed = false
        //     break
        // }
        // case 'ClassicyWindowCollapse': {
        //     ws.collapsed = true
        //     break
        // }
        // case 'ClassicyWindowDrag': {
        //     ws.dragging = action.dragging
        //     break
        // }
        // case 'ClassicyWindowContextMenu': {
        //     ws.contextMenu = action.contextMenu
        //     if (action.contextMenuShown === true) {
        //         ws.contextMenuLocation = action.position
        //     }
        //     break
        // }
        case 'ClassicyWindowMove': {
            ds = updateWindow(action.app.id, action.window.id, { moving: action.moving })
            if (action.moving === true) {
                ds = updateWindow(action.app.id, action.window.id, { position: action.position })
            }
            break
        }
        // }
        // case 'ClassicyWindowPosition': {
        //     ws.position = action.position
        //     break
        // }
    }
    return ds
}
