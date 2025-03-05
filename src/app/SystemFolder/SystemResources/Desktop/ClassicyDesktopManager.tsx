import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import { ClassicyStoreSystemManager } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export interface ClassicyStoreSystemDesktopManagerIcon {
    appId: string
    appName: string
    icon: string
    label?: string
    kind?: 'app_shortcut' | 'file'
    location?: [number, number]
    onClickFunc: (event: MouseEvent) => void
}

export interface ClassicyStoreSystemDesktopManager extends ClassicyStoreSystemManager {
    selectedIcons?: string[]
    systemMenu: ClassicyMenuItem[]
    appMenu: ClassicyMenuItem[]
    contextMenu: ClassicyMenuItem[]
    showContextMenu: boolean
    icons: ClassicyStoreSystemDesktopManagerIcon[]
    selectBox: {
        size: [number, number]
        start: [number, number]
        active: boolean
    }
}

// export interface ClassicyDesktopState {
//     activeTheme: string
//     availableThemes: ClassicyTheme[]
//
//     soundPlayer: Howl
//     selectedDesktopIcons: string[]
//
//     activeWindow: string
//     activeApp: string
//
//     menuBar: ClassicyMenuItem[]
//     systemMenu: ClassicyMenuItem[]
//     appSwitcherMenu: ClassicyMenuItem[]
//     contextMenu: ClassicyMenuItem[]
//     showContextMenu: boolean
//     selectBox: boolean
//     selectBoxSize: number[]
//     selectBoxStart: number[]
//     desktopIcons: ClassicyDesktopIconState[]
//     openApps: ClassicyAppItem[]
//     new?: ClassicyStore
// }
//
// export type ClassicyAppItem = {
//     id: string
//     name: string
//     icon: string
//     hidden: boolean
//     defaultWindow?: string
// }
// activeTheme: 'default', RENAMED
// availableThemes: [],
// selectedDesktopIcons: [],
// soundPlayer: null, TODO: FIX THIS!
// activeWindow: '', TODO: MOVED
// menuBar: [],
// systemMenu: [
//     {
//         id: 'about',
//         title: 'About This Computer',
//         keyboardShortcut: '&#8984;S',
//     },
//     {id: 'spacer'},
// ],
// activeApp: 'finder.app',
// appSwitcherMenu: [
//     {
//         id: 'finder.app',
//         title: 'Finder',
//         icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
//         onClickFunc: () => alert("e")
//     },
// ],
// openApps: [
//     {
//         id: 'finder.app',
//         name: 'Finder',
//         icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/macos.svg`,
//         hidden: false,
//     },
// ],
// desktopIcons: [],
// contextMenu: [],
// showContextMenu: false,
// selectBox: false,
// selectBoxSize: [0, 0],
// selectBoxStart: [0, 0],
