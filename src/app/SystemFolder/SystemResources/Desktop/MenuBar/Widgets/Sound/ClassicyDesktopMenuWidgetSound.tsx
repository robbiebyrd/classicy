import classicyDesktopMenuWidgetSoundStyles from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.module.scss'
import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import { useSound, useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

type ClassicyDesktopMenuWidgetSoundProps = {
    hide?: boolean
}

const ClassicyDesktopMenuWidgetSound: React.FC<ClassicyDesktopMenuWidgetSoundProps> = ({ hide = false }) => {
    const soundOnImg = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/sound-on.png`
    const soundOffImg = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/sound-off.png`

    const player = useSoundDispatch()
    const playerState = useSound()

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
