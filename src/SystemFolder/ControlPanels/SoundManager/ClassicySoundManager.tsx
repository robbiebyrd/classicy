'use client'

import {useDesktopDispatch} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import './ClassicySoundManager.scss'
import {
    ClassicySoundInfo,
    useSound,
    useSoundDispatch,
} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import {getClassicyAboutWindow} from '@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow'
import {ClassicyApp} from '@/SystemFolder/SystemResources/App/ClassicyApp'
import {quitAppHelper, quitMenuItemHelper} from '@/SystemFolder/SystemResources/App/ClassicyAppUtils'
import {ClassicyButton} from '@/SystemFolder/SystemResources/Button/ClassicyButton'
import {ClassicyCheckbox} from '@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox'
import {ClassicyControlGroup} from '@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup'
import {ClassicyControlLabel} from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import {ClassicyDisclosure} from '@/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure'
import {ClassicyWindow} from '@/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, {useState} from 'react'
import appIcon from 'img/icons/control-panels/sound-manager/app.png'

export const ClassicySoundManager: React.FC = () => {
    const desktopEventDispatch = useDesktopDispatch()

    const playerState = useSound()
    const player = useSoundDispatch()

    const appName: string = 'Sound Manager'
    const appId: string = 'SoundManager.app'

    const [showAbout, setShowAbout] = useState(false)

    const changeSounds = (checked: boolean) => {
        player({
            type: 'ClassicySoundDisable',
            disabled: checked ? [] : ['*'],
        })
    }

    const disableSounds = (checked: boolean, sound: string) => {
        if (checked) {
            player({
                type: 'ClassicySoundEnableOne',
                enabled: sound,
            })
        } else {
            player({
                type: 'ClassicySoundDisableOne',
                disabled: sound,
            })
        }
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
                modal={false}
                appMenu={appMenu}
            >
                <div
                    style={{
                        backgroundColor: 'var(--color-system-03)',
                        height: '100%',
                        width: '100%',
                        padding: 'var(--window-padding-size)',
                        boxSizing: 'border-box',
                    }}
                >
                    <ClassicyCheckbox
                        id={'disable_sounds'}
                        isDefault={true}
                        label={'Enable Interface Sounds'}
                        onClickFunc={changeSounds}
                        checked={!playerState.disabled.includes('*')}
                    />
                    <ClassicyDisclosure label={'Disable Sounds'}>
                        <ClassicyControlLabel label={'These settings are not currently connected.'}/>
                        <div className={'soundManagerControlGroupHolder'}>
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
                                                    onClickFunc={(checked: boolean) => disableSounds(checked, item.id)}
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
                </div>
            </ClassicyWindow>
            {showAbout && getClassicyAboutWindow({appId, appName, appIcon, hideFunc: () => setShowAbout(false)})}
        </ClassicyApp>
    )
}
