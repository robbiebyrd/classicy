import ClassicyBoot from '@/app/SystemFolder/SystemResources/Boot/ClassicyBoot'
import {classicyDesktopIconEventHandler} from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext'
import {
    ClassicyDesktopState,
    DefaultDesktopState,
} from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopState'
import {
    classicyWindowEventHandler
} from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext'
import {ClassicySoundManagerProvider} from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import React, {createContext, Suspense, useContext, useReducer} from 'react'

const ClassicyDesktopContext = createContext(null)
const ClassicyDesktopDispatchContext = createContext(null)

export const ClassicyDesktopProvider = ({children}) => {
    let desktopState =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('classicyDesktopState')) || DefaultDesktopState
            : DefaultDesktopState

    const [desktop, dispatch] = useReducer(classicyDesktopStateEventReducer, desktopState)

    React.useEffect(() => {
        localStorage.setItem('classicyDesktopState', JSON.stringify(desktop))
    }, [desktop])

    return (
        <Suspense fallback={<ClassicyBoot/>}>
            <ClassicyDesktopContext.Provider value={desktop}>
                <ClassicyDesktopDispatchContext.Provider value={dispatch}>
                    <ClassicySoundManagerProvider>{children}</ClassicySoundManagerProvider>
                </ClassicyDesktopDispatchContext.Provider>
            </ClassicyDesktopContext.Provider>
        </Suspense>
    )
}

export function useDesktop() {
    return useContext(ClassicyDesktopContext)
}

export function useDesktopDispatch() {
    return useContext(ClassicyDesktopDispatchContext)
}

export const classicyDesktopEventHandler = (ds: ClassicyDesktopState, action) => {
    switch (action.type) {
        case 'ClassicyDesktopFocus': {
            if ('e' in action && action.e.target.id === 'classicyDesktop') {
                ds.activeWindow = ''
                ds.activeApp = 'finder.app'
                ds.selectedDesktopIcons = []
                ds.showContextMenu = false
                ds.selectBox = true
                ds.selectBoxStart = [action.e.clientX, action.e.clientY]
            }

            if ('menuBar' in action) {
                ds.menuBar = action.menuBar
            }

            break
        }
        case 'ClassicyDesktopDoubleClick': {
            break
        }
        case 'ClassicyDesktopDrag': {
            ds.selectBoxSize = [action.e.clientX - ds.selectBoxStart[0], action.e.clientY - ds.selectBoxStart[1]]
            break
        }
        case 'ClassicyDesktopStop': {
            ds.selectBox = false
            ds.selectBoxStart = [0, 0]
            ds.selectBoxSize = [0, 0]
            break
        }
        case 'ClassicyDesktopContextMenu': {
            ds.showContextMenu = action.showContextMenu
            if (action.contextMenu) {
                ds.contextMenu = action.contextMenu
            }
            break
        }
        case 'ClassicyDesktopTheme': {
            ds.activeTheme = action.activeTheme
            break
        }
        case 'ClassicyDesktopLoadThemes': {
            ds.availableThemes = action.availableThemes
        }
    }
    return ds
}

export const classicyAppEventHandler = (ds: ClassicyDesktopState, action) => {
    switch (action.type) {
        case 'ClassicyAppOpen': {
            const findIcon = ds.openApps.find((i) => i.id === action.app.id)
            if (!findIcon) {
                ds.openApps.push({
                    id: action.app.id,
                    name: action.app.name,
                    icon: action.app.icon,
                    hidden: false,
                    defaultWindow: action.app.defaultWindow,
                })
            }
            break
        }
        case 'ClassicyAppClose': {
            ds.openApps = ds.openApps.filter((oa) => oa.id !== action.app.id)
            ds.activeWindow = ''
            ds.activeApp = 'Finder.app'
            break
        }
        case 'ClassicyAppFocus': {
            if (ds.activeApp !== action.app.id) {
                ds.activeWindow = action.window
            }
            ds.activeApp = action.app.id
            break
        }
        case 'ClassicyAppActivate': {
            ds.activeApp = action.app.id
            break
        }
    }

    return ds
}

export const classicyDesktopStateEventReducer = (ds: ClassicyDesktopState, action) => {
    const startDs = ds
    if ('type' in action) {
        if (action.type.startsWith('ClassicyWindow')) {
            ds = classicyWindowEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyApp')) {
            ds = classicyAppEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktopIcon')) {
            ds = classicyDesktopIconEventHandler(ds, action)
        } else if (action.type.startsWith('ClassicyDesktop')) {
            ds = classicyDesktopEventHandler(ds, action)
        }
    }
    if ('debug' in action) {
        console.group('Desktop Event')
        console.log('Action: ', action)
        console.log('Start State: ', startDs)
        console.log('End State: ', ds)
        console.groupEnd()
    }
    return {...ds}
}
