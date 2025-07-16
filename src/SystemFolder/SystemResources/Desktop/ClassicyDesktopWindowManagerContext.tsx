import {
    ClassicyStore,
    ClassicyStoreSystemAppWindow,
} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import { ClassicyMenuItem } from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import {ActionMessage} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {isNumberArray} from "@tanstack/react-table";

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

const notEmpty = <T,>(value: T | null | undefined): value is T => value != null

type ClassicyWindowAction =
    // Open the Window's Context Menu
    | { type: 'ClassicyWindowMenu'; menuBar: ClassicyMenuItem[] }
    // Open a Window
    | {
          type: 'ClassicyWindowOpen'
          app: { id: string }
          window: {
              id: string
              minimumSize: [number, number]
              size: [number, number]
              position: [number, number]
              menuBar?: ClassicyMenuItem[]
          }
      }
    // Focus a Window
    | { type: 'ClassicyWindowFocus'; app: { id: string }; window: { id: string; menuBar: ClassicyMenuItem[] } }
    // Close a Window
    | { type: 'ClassicyWindowClose'; app: { id: string }; window: { id: string } }
    // Close a Window and destroy its entry
    | { type: 'ClassicyWindowDestroy'; app: { id: string }; window: { id: string } }
    // Collapse (or Minimize) a window
    | { type: 'ClassicyWindowCollapse'; app: { id: string }; window: { id: string } }
    // Expand (or Un-Minimize) a window
    | { type: 'ClassicyWindowExpand'; app: { id: string }; window: { id: string } }
    // Drag a window around
    | { type: 'ClassicyWindowDrag'; app: { id: string }; window: { id: string }; dragging: boolean }
    // Zoom a Window
    | { type: 'ClassicyWindowZoom'; app: { id: string }; window: { id: string }; zoomed: boolean }
    // Set a Window's Position
    | { type: 'ClassicyWindowPosition'; app: { id: string }; window: { id: string }; position: [number, number] }
    // Resize a Window
    | {
          type: 'ClassicyWindowResize'
          app: { id: string }
          window: { id: string }
          resizing: boolean
          size: [number, number]
      }
    // Move a Window
    | {
          type: 'ClassicyWindowMove'
          app: { id: string }
          window: { id: string }
          position: [number, number]
          moving: boolean
      }

export const classicyWindowEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    const updateWindow = (appId: string, windowId: string, updates: any) => {
        ds.System.Manager.App.apps[appId].windows = ds.System.Manager.App.apps[appId].windows.map((w: ClassicyStoreSystemAppWindow) =>
            w.id === windowId ? { ...w, ...updates } : w
        )
        return ds
    }

    switch (action.type) {
        case 'ClassicyWindowOpen':
            const window = ds.System.Manager.App.apps[action.app.id].windows.findIndex((w) => w.id === action.window.id)
            if (window < 0) {
                let paddedPosition: [number, number] = action.window.position
                if (action.window.position[0] == 0 && action.window.position[1] == 0) {
                    const length = ds.System.Manager.App.apps[action.app.id].windows.length * 10
                    paddedPosition = [30 + length, 30 + length]
                }
                ds.System.Manager.App.apps[action.app.id].windows.push({
                    ...initialWindowState,
                    id: action.window.id,
                    minimumSize: action.window.minimumSize,
                    size: action.window.size,
                    position: paddedPosition,
                    closed: false,
                    hidden: false,
                    menuBar: action.window.menuBar,
                } as ClassicyStoreSystemAppWindow)
            }
            break
        case 'ClassicyWindowFocus':
            if (!ds.System.Manager.App.apps[action.app.id]) break
            ds.System.Manager.App.apps[action.app.id].focused = true
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    w.focused = w.id == action.window.id
                    ds.System.Manager.Desktop.appMenu = action.window.menuBar
                    return w
                }
            )
            break

        case 'ClassicyWindowClose':
            ds = updateWindow(action.app.id, action.window.id, { closed: true })
            break

        case 'ClassicyWindowDestroy':
            ds = updateWindow(action.app.id, action.window.id, { closed: true })
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows
                .map((w) => (w.id === action.window.id ? null : w))
                .filter(notEmpty)
            break

        case 'ClassicyWindowMenu':
            ds.System.Manager.Desktop.appMenu = action.menuBar
            break

        case 'ClassicyWindowResize':
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.resizing = action.resizing
                        w.size = action.size
                    }
                    return w
                }
            )
            break
        case 'ClassicyWindowDrag':
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.dragging = action.dragging
                    }
                    return w
                }
            )
            break
        case 'ClassicyWindowZoom':
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.zoomed = action.zoomed
                    }
                    return w
                }
            )
            break
        case 'ClassicyWindowCollapse':
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.collapsed = true
                    }
                    return w
                }
            )
            break
        case 'ClassicyWindowExpand':
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.collapsed = false
                    }
                    return w
                }
            )
            break

        case 'ClassicyWindowMove': {
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.position = action.position
                        w.moving = action.moving
                    }
                    return w
                }
            )
            break
        }
        case 'ClassicyWindowPosition': {
            ds.System.Manager.App.apps[action.app.id].windows = ds.System.Manager.App.apps[action.app.id].windows.map(
                (w) => {
                    if (w.id == action.window.id) {
                        w.position = action.position
                    }
                    return w
                }
            )
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
