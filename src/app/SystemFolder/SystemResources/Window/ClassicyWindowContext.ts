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
