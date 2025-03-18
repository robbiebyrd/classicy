import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'

export type ClassicyWindowState = {
    size: [number, number]
    position: [number, number]
    clickPosition?: [number, number]
    closed: boolean
    menuBar: ClassicyMenuItem[]
    collapsed: boolean
    zoomed: boolean
    dragging: boolean
    resizing: boolean
    sounding: boolean
    moving: boolean
    contextMenu: ClassicyMenuItem[]
    contextMenuShown: boolean
    contextMenuLocation?: [number, number]
}

export const ClassicyWindowStateEventReducer = (ws: ClassicyWindowState, action) => {
    switch (action.type) {
        case 'ClassicyWindowOpen': {
            ws.closed = false
            break
        }
        case 'ClassicyWindowClose': {
            ws.closed = true
            break
        }
        case 'ClassicyWindowResize': {
            ws.resizing = action.resizing
            break
        }
        case 'ClassicyWindowZoom': {
            ws.zoomed = action.zoomed
            break
        }
        case 'ClassicyWindowFocus': {
            break
        }
        case 'ClassicyWindowExpand': {
            ws.collapsed = false
            break
        }
        case 'ClassicyWindowCollapse': {
            ws.collapsed = true
            break
        }
        case 'ClassicyWindowDrag': {
            ws.dragging = action.dragging
            break
        }
        case 'ClassicyWindowContextMenu': {
            ws.contextMenu = action.contextMenu
            if (action.contextMenuShown === true) {
                ws.contextMenuLocation = action.position
            }
            break
        }
        case 'ClassicyWindowMove': {
            ws.moving = action.moving
            if (action.moving === true) {
                ws.position = action.position
            }
            break
        }
        case 'ClassicyWindowPosition': {
            ws.position = action.position
            break
        }
    }
    return { ...ws }
}
