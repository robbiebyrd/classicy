import classicyDesktopMenuWidgetSoundStyles from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.module.scss'
import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import classNames from 'classnames'
import React from 'react'
import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { useSound, useSoundDispatch } from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'

type ClassicyDesktopMenuWidgetSoundProps = {
    hide?: boolean
}

const ClassicyDesktopMenuWidgetSound: React.FC<ClassicyDesktopMenuWidgetSoundProps> = ({ hide = false }) => {
    const soundOnImg = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/sound-on.png`
    const soundOffImg = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/sound-off.png`

    const player = useSoundDispatch()
    const playerState = useSound()
    const desktopEventDispatch = useDesktopDispatch()

    const openSoundManager = (e) => {
        e.preventDefault()
        desktopEventDispatch({
            type: 'ClassicyAppOpen',
            app: {
                id: 'SoundManager.app',
                name: 'Sound Manager',
                icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/app.png`,
            },
        })
    }

    const mute = () => {
        player({
            type: 'ClassicySoundDisable',
            disabled: playerState.disabled.includes('*') ? [] : ['*'],
        })
        return
    }

    return (
        <>
            {!hide && (
                <li
                    className={classNames(
                        classicyDesktopMenuWidgetSoundStyles.classicyDesktopMenuWidgetSound,
                        classicyMenuStyles.classicyMenuItem,
                        classicyMenuStyles.classicyMenuItemNoImage
                    )}
                    onClick={mute}
                    onDoubleClick={openSoundManager}
                >
                    <img
                        src={playerState.disabled.includes('*') ? soundOffImg : soundOnImg}
                        alt={playerState.disabled.includes('*') ? 'Unmute' : 'Mute'}
                    />
                </li>
            )}
        </>
    )
}

export default ClassicyDesktopMenuWidgetSound
