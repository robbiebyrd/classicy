import {getTheme} from '@/app/SystemFolder/Appearance/ClassicyAppearance'
import {classicyDesktopStateEventReducer} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import {ClassicyDesktopState} from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopState'
import {ClassicyMenuItem} from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'

export type ClassicyDesktopIconState = {
    appId: string
    appName: string
    icon: string
    label?: string
    kind?: string
    contextMenu?: ClassicyMenuItem[]
    location?: [number, number]
    onClickFunc?: any
}

const createGrid = (iconSize: number, iconPadding: number) => {
    return [
        Math.floor(window.innerWidth / (iconSize + iconPadding)),
        Math.floor(window.innerHeight / (iconSize * 2 + iconPadding)),
    ]
}

const getGridPosition = (iconSize: number, iconPadding: number, x: number, y: number) => {
    let defaultPadding = iconPadding * 4
    return [
        Math.floor(window.innerWidth - (iconSize * 2 + iconPadding) * x),
        Math.floor((iconSize * 2 + iconPadding) * y) + defaultPadding,
    ]
}

const getGridPositionByCount = (count: number, theme: string) => {
    const [iconSize, iconPadding] = getIconSize(theme)
    const grid = createGrid(iconSize, iconPadding)

    if (count < grid[0]) {
        return getGridPosition(iconSize, iconPadding, 1, count)
    }

    if (count > grid[0] * grid[1]) {
        return getGridPosition(iconSize, iconPadding, 1, 1)
    }

    // TODO: We return the first column if the total count is less, and we return 1,1 if more than we can hold
    // We need to do an offset on the max number of icons, but use the same positions.
    // For the middle part, we need to figure out how to convert a column count (e.g. the 35th box)
    // to our matrix with an x/y coordinate.
}

const getIconSize = (theme: string) => {
    const themeData = getTheme(theme)
    const iconSize = parseInt(themeData.desktop.iconSize, 10)
    return [iconSize, iconSize / 4]
}

const sortDesktopIcons = (icons: ClassicyDesktopIconState[], sortType: "name" | "kind" | "label") => {
    switch (sortType) {
        case "name":
            return icons.sort(function (a, b) {
                if (a.appName.toLowerCase() > b.appName.toLowerCase()) {
                    return 1
                }
                if (a.appName.toLowerCase() < b.appName.toLowerCase()) {
                    return -1
                }
                return 0
            })
        case "kind":
            return icons.sort(function (a, b) {
                if (a.kind.toLowerCase() > b.kind.toLowerCase()) {
                    return 1
                }
                if (a.kind.toLowerCase() < b.kind.toLowerCase()) {
                    return -1
                }
                return 0
            })
    }
}

const cleanupDesktopIcons = (theme: string, icons: ClassicyDesktopIconState[]) => {
    let newDesktopIcons = []
    let startX: number = 1
    let startY: number = 0
    const [iconSize, iconPadding] = getIconSize(theme)

    let grid = createGrid(iconSize, iconPadding)

    let sortedIcons = sortDesktopIcons(icons, "name")

    sortedIcons.forEach((icon) => {
        if (startY >= grid[1]) {
            startY = 0
            startX += 1
        }

        if (startX >= grid[0]) {
            startX = 1
        }

        newDesktopIcons.push({
            appId: icon.appId,
            appName: icon.appName,
            icon: icon.icon,
            location: getGridPosition(iconSize, iconPadding, startX, startY),
        })

        startY += 1
    })

    return newDesktopIcons
}

export const classicyDesktopIconEventHandler = (ds: ClassicyDesktopState, action) => {
    switch (action.type) {
        case 'ClassicyDesktopIconCleanup': {
            ds.desktopIcons = cleanupDesktopIcons(ds.activeTheme, ds.desktopIcons)
            break
        }
        case 'ClassicyDesktopIconFocus': {
            ds.selectedDesktopIcons = [action.iconId]
            break
        }
        case 'ClassicyDesktopIconOpen': {
            ds.selectedDesktopIcons = [action.iconId]
            ds = classicyDesktopStateEventReducer(ds, {
                type: 'ClassicyAppOpen',
                app: action.app,
            })
            break
        }
        case 'ClassicyDesktopIconAdd': {
            // TODO: We need to separate onClickFunc from here; it's being stored in the localstorage cache which
            // means it gets blown out after every session clear. An Event name and payload here would be better.
            let icon = ds.desktopIcons.filter((icon) => icon.appId === action.app.id)
            if (icon.length === 0) {
                let newLocation = action.location
                if (!newLocation) {
                    action.location = getGridPositionByCount(ds.desktopIcons.length, ds.activeTheme)
                }

                ds.desktopIcons.push({
                    icon: action.app.icon,
                    appName: action.app.name,
                    appId: action.app.id,
                    location: action.location,
                    label: action.label,
                    kind: action.kind || "icon",
                    onClickFunc: action.onClickFunc,
                })
            }
            break
        }

        case 'ClassicyDesktopIconRemove': {
            let iconIdx = ds.desktopIcons.findIndex((icon) => icon.appId === action.app.id)
            if (iconIdx > -1) {
                ds.desktopIcons.slice(iconIdx, 1)
            }
            break
        }
        case 'ClassicyDesktopIconMove': {
            let iconIdx = ds.desktopIcons.findIndex((icon) => icon.appId === action.app.id)
            if (iconIdx > -1) {
                ds.desktopIcons[iconIdx].location = action.location
            }
            break
        }
    }
    return ds
}
