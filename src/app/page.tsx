'use client'

import Browser from '@/app/Applications/Browser/Browser'
import Demo from '@/app/Applications/Demo/Demo'
import SimpleText from '@/app/Applications/SimpleText/SimpleText'
import ClassicyControlPanels from '@/app/SystemFolder/ControlPanels/ClassicyControlPanels'
import { ClassicyDesktopProvider } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyDesktop from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktop'
import React from 'react'
import QuickTimeMoviePlayer from '@/app/Applications/QuickTime/QuickTimeMoviePlayer'

export default function Home() {
    return (
        <ClassicyDesktopProvider>
            <ClassicyDesktop>
                <ClassicyControlPanels />
                <Demo />
                <QuickTimeMoviePlayer />
                <Browser />
                <SimpleText />
            </ClassicyDesktop>
        </ClassicyDesktopProvider>
    )
}
