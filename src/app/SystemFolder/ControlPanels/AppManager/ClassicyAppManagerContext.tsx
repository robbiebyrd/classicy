import ClassicyBoot from '@/app/SystemFolder/SystemResources/Boot/ClassicyBoot'
import { ClassicySoundManagerProvider } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import React, { createContext, Suspense, useContext, useReducer } from 'react'
import { classicyDesktopStateEventReducer, ClassicyStore, DefaultDesktopState } from './ClassicyAppManager'

const ClassicyDesktopContext = createContext<ClassicyStore>(null)
const ClassicyDesktopDispatchContext = createContext(null)

export const ClassicyDesktopProvider = ({ children }) => {
    let desktopState: ClassicyStore

    if (typeof window !== 'undefined') {
        try {
            const storedState = localStorage.getItem('classicyDesktopState')
            desktopState = storedState ? JSON.parse(storedState) : DefaultDesktopState
        } catch (error) {
            console.error('Error parsing desktop state:', error)
            desktopState = DefaultDesktopState
        }
    } else {
        desktopState = DefaultDesktopState
    }

    const [desktop, dispatch] = useReducer(classicyDesktopStateEventReducer, desktopState)

    React.useEffect(() => {
        localStorage.setItem('classicyDesktopState', JSON.stringify(desktop))
    }, [desktop])

    return (
        <Suspense fallback={<ClassicyBoot />}>
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
