import { ClassicyStoreSystemManager } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export interface ClassicyStoreSystemSoundManager extends ClassicyStoreSystemManager {
    volume: number
    labels: Record<string, { group: string; label: string; description: string }>
    disabled: string[]
}

export type ClassicyThemeSound = {
    file: string
    disabled: string[]
}
