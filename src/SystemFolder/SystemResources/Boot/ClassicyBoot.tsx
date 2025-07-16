import './ClassicyBoot.scss'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

export const ClassicyBoot: React.FC = () => {
    const player = useSoundDispatch()
    player({type: 'ClassicySoundPlay', sound: 'ClassicyBoot'})

    return <div className={classNames("classicyBoot")}/>
}
