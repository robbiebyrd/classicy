'use client'

import { ClassicyAppearanceManager } from '@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager'
import { ClassicyDateAndTimeManager } from '@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager'
import { ClassicySoundManager } from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager'
import React from 'react'

export function ClassicyControlPanels() {
    return (
        <>
            <ClassicyAppearanceManager />
            <ClassicySoundManager />
            <ClassicyDateAndTimeManager />
        </>
    )
}
