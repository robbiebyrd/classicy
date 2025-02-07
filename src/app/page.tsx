'use client'

import Browser from '@/app/Applications/Browser/Browser'
import Demo from '@/app/Applications/Demo/Demo'
import SimpleText from '@/app/Applications/SimpleText/SimpleText'
import ClassicyControlPanels from '@/app/SystemFolder/ControlPanels/ClassicyControlPanels'
import {ClassicyDesktopProvider} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import ClassicyDesktop from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktop'
import React from 'react'
import QuickTime from "@/app/Applications/QuickTime/QuickTime";

export default function Home() {
    return (
        <ClassicyDesktopProvider>
            <ClassicyDesktop>
                <ClassicyControlPanels/>
                <Demo/>
                <QuickTime/>
                <Browser/>
                <SimpleText/>
            </ClassicyDesktop>
        </ClassicyDesktopProvider>
    )
}
