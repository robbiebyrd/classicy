'use client'

import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import soundManagerStyles from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.module.scss'
import {
    ClassicySoundInfo,
    useSound,
    useSoundDispatch,
} from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import { getClassicyAboutWindow } from '@/app/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow'
import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper, quitMenuItemHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyCheckbox from '@/app/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox'
import ClassicyControlGroup from '@/app/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup'
import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import ClassicyDisclosure from '@/app/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useState } from 'react'

export const ClassicySoundManager: React.FC = () => {
    const desktopEventDispatch = useDesktopDispatch()

    const playerState = useSound()
    const player = useSoundDispatch()

    const appName: string = 'Sound Manager'
    const appId: string = 'SoundManager.app'
    const appIcon: string = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/app.png`

    const [showAbout, setShowAbout] = useState(false)

    const [enableAllSounds, setEnableAllSounds] = useState(true)

    const changeSounds = (e) => {
        setEnableAllSounds(!e.target.checked)
        player({
            type: 'ClassicySoundDisable',
            disabled: enableAllSounds ? [] : ['*'],
        })
    }

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const appMenu = [
        {
            id: appId + '_file',
            title: 'File',
            menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
        },
        {
            id: appId + '_help',
            title: 'Help',
            menuChildren: [
                {
                    id: appId + '_about',
                    title: 'About',
                    onClickFunc: () => {
                        setShowAbout(true)
                    },
                },
            ],
        },
    ]

    const getSoundLabelGroups = () => {
        const soundLabelGroups = [...new Set(playerState.labels.map((item) => item.group))]

        const index = soundLabelGroups.indexOf('Alert')
        if (index !== -1) {
            soundLabelGroups.splice(index, 1)
        }
        return soundLabelGroups
    }

    return (
        <ClassicyApp
            id={appId}
            name={appName}
            icon={appIcon}
            defaultWindow={'SoundManager_1'}
            openOnBoot={true}
            noDesktopIcon={true}
            addSystemMenu={true}
        >
            <ClassicyWindow
                id={'SoundManager_1'}
                title={appName}
                appId={appId}
                icon={appIcon}
                closable={true}
                resizable={false}
                zoomable={false}
                scrollable={false}
                collapsable={false}
                initialSize={[500, 0]}
                initialPosition={[300, 50]}
                modal={true}
                appMenu={appMenu}
            >
                <ClassicyCheckbox
                    id={'disable_sounds'}
                    isDefault={true}
                    label={'Enable Interface Sounds'}
                    onClickFunc={changeSounds}
                    checked={playerState.disabled.includes('*')}
                />
                <ClassicyDisclosure label={'Disable Sounds'}>
                    <ClassicyControlLabel label={'These settings are not currently connected.'} />
                    <div className={soundManagerStyles.soundManagerControlGroupHolder}>
                        {getSoundLabelGroups().map((group: string) => (
                            <ClassicyControlGroup label={group} columns={true} key={appId + '_' + group}>
                                {playerState.labels.map(
                                    (item: ClassicySoundInfo) =>
                                        item.group === group && (
                                            <ClassicyCheckbox
                                                key={appId + '_' + group + item.id}
                                                id={'enable_sound_' + item.id}
                                                label={item.label}
                                                checked={!playerState.disabled.includes('*')}
                                            />
                                        )
                                )}
                            </ClassicyControlGroup>
                        ))}
                    </div>
                </ClassicyDisclosure>
                <ClassicyButton isDefault={false} onClickFunc={quitApp}>
                    Quit
                </ClassicyButton>
            </ClassicyWindow>
            {showAbout && getClassicyAboutWindow({ appId, appName, appIcon, hideFunc: () => setShowAbout(false) })}
        </ClassicyApp>
    )
}
