import { ClassicyStore } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export const classicyWindowEventHandler = (ds: ClassicyStore, action) => {
    const updateWindow = (appId: string, windowId: string, updates: any) => {
        ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
            if (a.id === appId) {
                a.windows = a.windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w))
            }
            return a
        })
    }

    switch (action.type) {
        case 'ClassicyWindowOpen':
        case 'ClassicyWindowFocus':
            updateWindow(action.app.id, action.windowId, { focused: true, hidden: false })
            break

        case 'ClassicyWindowHide':
            updateWindow(action.app.id, action.windowId, { focused: false, hidden: true })
            break

        case 'ClassicyWindowClose':
            ds.System.Manager.App.apps = ds.System.Manager.App.apps.map((a) => {
                if (a.id === action.app.id) {
                    a.windows = a.windows.filter((w) => w.id !== action.windowId)
                }
                return a
            })
            break

        case 'ClassicyWindowMenu':
            // ds.menuBar = action.menuBar
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
        // case 'ClassicyWindowMove': {
        //     ws.moving = action.moving
        //     if (action.moving === true) {
        //         ws.position = action.position
        //     }
        //     break
        // }
        // case 'ClassicyWindowPosition': {
        //     ws.position = action.position
        //     break
        // }
    }
    return ds
}
