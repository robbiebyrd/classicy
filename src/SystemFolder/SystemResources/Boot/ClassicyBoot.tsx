import './ClassicyBoot.scss'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import { FC as FunctionalComponent, useEffect } from 'react'

export const ClassicyBoot: FunctionalComponent = () => {
    const player = useSoundDispatch()
    useEffect(() => {
        player({type: 'ClassicySoundPlay', sound: 'ClassicyBoot'})
    }, [player])

    return <div className={"classicyBoot"}/>
}
