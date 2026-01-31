import { ClassicyTheme } from '@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import {
    ActionMessage,
    classicyDesktopStateEventReducer,
    ClassicyStore,
} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import { ClassicyStoreSystemDesktopManagerIcon } from '@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager'
import {ClassicyMenuItem} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const createGrid = (iconSize: number, iconPadding: number) => {
    return [
        Math.floor(window.innerWidth / (iconSize + iconPadding)),
        Math.floor(window.innerHeight / (iconSize * 2 + iconPadding)),
    ]
}

const getGridPosition = (iconSize: number, iconPadding: number, x: number, y: number):[number, number] => {
    let defaultPadding = iconPadding * 4
    return [
        Math.floor(window.innerWidth - (iconSize * 2 + iconPadding) * x),
        Math.floor((iconSize * 2 + iconPadding) * y) + defaultPadding,
    ]
}

const getGridPositionByCount = (count: number, theme: ClassicyTheme) => {
    const [iconSize, iconPadding] = getIconSize(theme)
    const grid = createGrid(iconSize, iconPadding)

    if (count < grid[0]) {
        return getGridPosition(iconSize, iconPadding, 1, count)
    }

    if (count > grid[0] * grid[1]) {
        return getGridPosition(iconSize, iconPadding, 1, 1)
    }

    return getGridPosition(iconSize, iconPadding, 1, 1)

    // TODO: We return the first column if the total count is less, and we return 1,1 if more than we can hold
    // We need to do an offset on the max number of icons, but use the same positions.
    // For the middle part, we need to figure out how to convert a column count (e.g. the 35th box)
    // to our matrix with an x/y coordinate.
}

export const getIconSize = (theme: ClassicyTheme) => {
    return [theme.desktop.iconSize, theme.desktop.iconSize / 4]
}

const sortDesktopIcons = (icons: ClassicyStoreSystemDesktopManagerIcon[], sortType: 'name' | 'kind' | 'label') => {
    switch (sortType) {
        case 'name':
            return icons.sort(function (a, b) {
                if (a.appName.toLowerCase() > b.appName.toLowerCase()) {
                    return 1
                }
                if (a.appName.toLowerCase() < b.appName.toLowerCase()) {
                    return -1
                }
                return 0
            })
        case 'kind':
        default:
            return icons.sort(function (a, b) {
                if (a.kind?.toLowerCase() > b.kind?.toLowerCase()) {
                    return 1
                }
                if (a.kind?.toLowerCase() < b.kind?.toLowerCase()) {
                    return -1
                }
                return 0
            })
    }
}

const cleanupDesktopIcons = (theme: ClassicyTheme, icons: ClassicyStoreSystemDesktopManagerIcon[]) => {
    let newDesktopIcons: ClassicyStoreSystemDesktopManagerIcon[] = []
    let startX: number = 1
    let startY: number = 0
    const [iconSize, iconPadding] = getIconSize(theme)

    let grid = createGrid(iconSize, iconPadding)

    icons.forEach((icon) => {
        if (startY >= grid[1]) {
            startY = 0
            startX += 1
        }

        if (startX >= grid[0]) {
            startX = 1
        }

        icon.location = getGridPosition(iconSize, iconPadding, startX, startY)
        newDesktopIcons.push(icon)
        startY += 1
    })

    return newDesktopIcons
}

export const classicyDesktopIconEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    switch (action.type) {
        case 'ClassicyDesktopIconCleanup': {
            ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
                ds.System.Manager.Appearance.activeTheme,
                ds.System.Manager.Desktop.icons
            )
            break
        }
        case 'ClassicyDesktopIconSort': {
            ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
                ds.System.Manager.Appearance.activeTheme,
                sortDesktopIcons(ds.System.Manager.Desktop.icons, action.sortBy || 'name')
            )
            break
        }
        case 'ClassicyDesktopIconFocus': {
            ds.System.Manager.Desktop.selectedIcons = [action.iconId]
            break
        }
        case 'ClassicyDesktopIconClearFocus': {
            ds.System.Manager.Desktop.selectedIcons = []
            break
        }
        case 'ClassicyDesktopIconOpen': {
            ds.System.Manager.Desktop.selectedIcons = [action.iconId]
            ds = classicyDesktopStateEventReducer(ds, {
                type: 'ClassicyAppOpen',
                app: action.app,
            })
            break
        }
        case 'ClassicyDesktopIconAdd': {
            // TODO: We need to separate onClickFunc from here; it's being stored in the localstorage cache which
            // means it gets blown out after every session clear. An Event name and payload here would be better.
            let icon = ds.System.Manager.Desktop.icons.filter((i) => i.appId === action.app.id)

            if (icon.length === 0) {
                let newLocation = action.location
                if (!newLocation) {
                    action.location = getGridPositionByCount(
                        ds.System.Manager.Desktop.icons.length,
                        ds.System.Manager.Appearance.activeTheme
                    )
                }

                ds.System.Manager.Desktop.icons.push({
                    icon: action.app.icon,
                    appId: action.app.id,
                    appName: action.app.name,
                    location: action.location,
                    label: action.label,
                    kind: action.kind || 'icon',
                    onClickFunc: action.onClickFunc,
                    event: action.event,
                    eventData: action.eventData,
                })
            }
            break
        }

        case 'ClassicyDesktopIconRemove': {
            let iconIdx = ds.System.Manager.Desktop.icons.findIndex((icon) => icon.appId === action.app.id)
            if (iconIdx > -1) {
                ds.System.Manager.Desktop.icons.splice(iconIdx, 1)
            }
            break
        }
        case 'ClassicyDesktopIconMove': {
            let iconIdx = ds.System.Manager.Desktop.icons.findIndex((icon) => icon.appId === action.app.id)
            if (iconIdx > -1) {
                ds.System.Manager.Desktop.icons[iconIdx].location = action.location
            }
            break
        }
    }
    return ds
}
