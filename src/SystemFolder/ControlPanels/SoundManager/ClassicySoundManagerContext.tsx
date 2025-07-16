import {ClassicyStoreSystemManager} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import {Howl} from 'howler'
import React, {createContext, type Dispatch, useContext, useReducer} from 'react'
import soundLabels from './ClassicySoundManagerLabels.json'
import soundData from "snd/platinum/platinum.json";

export const createSoundPlayer = ({soundData, options}: SoundPlayer): Howl | null => {
    if ('src' in soundData && 'sprite' in soundData) {
        return new Howl({
            src: soundData.src,
            sprite: soundData.sprite,
            ...options,
        })
    }
    return null
}

export const initialPlayer = {
    soundPlayer: createSoundPlayer({soundData: soundData}),
    disabled: [],
    labels: soundLabels,
    volume: 100,
}


export const ClassicySoundManagerContext = createContext<ClassicySoundState>(initialPlayer)
export const ClassicySoundDispatchContext = createContext<Dispatch<any>>((() => undefined) as Dispatch<any>)

export interface ClassicyStoreSystemSoundManager extends ClassicyStoreSystemManager {
    volume: number
    labels: Record<string, { group: string; label: string; description: string }>
    disabled: string[]
}

export type ClassicyThemeSound = {
    file: string
    disabled: string[]
}

export type ClassicySoundInfo = {
    id: string
    group: string
    label: string
    description: string
}

type ClassicySoundState = {
    soundPlayer: Howl | null
    disabled: string[]
    labels: ClassicySoundInfo[]
    volume?: number
}

enum ClassicySoundActionTypes {
    ClassicySoundStop,
    ClassicySoundPlay,
    ClassicySoundPlayInterrupt,
    ClassicySoundPlayError,
    ClassicySoundLoad,
    ClassicySoundSet,
    ClassicySoundDisable,
    ClassicySoundDisableOne,
    ClassicySoundEnableOne,
    ClassicyVolumeSet,
}

interface ClassicySoundAction {
    type: ClassicySoundActionTypes
    sound?: string
    file?: SoundPlayer
    disabled?: string | string[]
    enabled?: string | string[]
    soundPlayer?: any
}

interface SoundPlayer {
    soundData: {
        src: string[]
        sprite: Record<string, any>
    }
    options?: Record<string, any>
}

export const loadSoundTheme = (soundTheme: SoundPlayer): Howl | null => {
    return createSoundPlayer(soundTheme)
}

export function useSound() {
    return useContext(ClassicySoundManagerContext)
}

export function useSoundDispatch() {
    return useContext(ClassicySoundDispatchContext)
}

const playerCanPlayInterrupt = ({disabled, soundPlayer}: ClassicySoundState, sound: string) => {
    return !disabled.includes('*') && !disabled.includes(sound) && soundPlayer
}

const playerCanPlay = (ss: ClassicySoundState, sound: string) => {
    return playerCanPlayInterrupt(ss, sound) && !ss.soundPlayer?.playing()
}

export const ClassicySoundStateEventReducer = (ss: ClassicySoundState, action: ClassicySoundAction) => {
    if ('debug' in action) {
        console.group('Sound Event')
        console.log('Action: ', action)
        console.log('Start State: ', ss)
    }

    const validatedAction = ClassicySoundActionTypes[action.type as unknown as keyof typeof ClassicySoundActionTypes]
    switch (validatedAction) {
        case ClassicySoundActionTypes.ClassicySoundStop: {
            ss.soundPlayer?.stop()
            break
        }
        case ClassicySoundActionTypes.ClassicySoundPlay: {
            if (action.sound && playerCanPlay(ss, action.sound)) {
                ss.soundPlayer?.play(action.sound)
            }
            break
        }
        case ClassicySoundActionTypes.ClassicySoundPlayInterrupt: {
            if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
                ss.soundPlayer?.stop()
                ss.soundPlayer?.play(action.sound)
            }
            break
        }
        case ClassicySoundActionTypes.ClassicySoundPlayError: {
            if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
                ss.soundPlayer?.stop()
                ss.soundPlayer?.play(action.sound || 'ClassicyAlertWildEep')
            }
            break
        }
        case ClassicySoundActionTypes.ClassicySoundLoad: {
            if (action.file) {
                ss.soundPlayer = loadSoundTheme(action.file)
            }

            if (action.disabled) {
                ss.disabled = Array.isArray(action.disabled) ? action.disabled : [action.disabled]
            }

            break
        }
        case ClassicySoundActionTypes.ClassicySoundSet: {
            ss.soundPlayer = action.soundPlayer
            break
        }
        case ClassicySoundActionTypes.ClassicyVolumeSet: {
            ss.soundPlayer = action.soundPlayer
            break
        }
        case ClassicySoundActionTypes.ClassicySoundDisable: {
            if (action.disabled) {
                ss.disabled = Array.isArray(action.disabled) ? action.disabled : [action.disabled]
            }
            break
        }
        case ClassicySoundActionTypes.ClassicySoundDisableOne: {
            if (action.disabled) {
                let disabled = Array.isArray(action.disabled) ? action.disabled : [action.disabled]
                ss.disabled.push(...disabled)
                ss.disabled = Array.from(new Set(ss.disabled))
            }
            break
        }
        case ClassicySoundActionTypes.ClassicySoundEnableOne: {
            let enabled = Array.isArray(action.enabled) ? action.enabled : [action.enabled]
            ss.disabled = ss.disabled.filter((item) => !enabled.includes(item))
            break
        }
    }
    if ('debug' in action) {
        console.log('End State: ', ss)
        console.groupEnd()
    }

    return ss
}

export const ClassicySoundManagerProvider: React.FC<{ children: any }> = ({children}) => {
    const [sound, soundDispatch] = useReducer(ClassicySoundStateEventReducer, initialPlayer)

    return (
        <ClassicySoundManagerContext.Provider value={sound}>
            <ClassicySoundDispatchContext.Provider value={soundDispatch}>
                {children}
            </ClassicySoundDispatchContext.Provider>
        </ClassicySoundManagerContext.Provider>
    )
}
