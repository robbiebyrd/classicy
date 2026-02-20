import './ClassicyBoot.scss'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import { FC as FunctionalComponent } from 'react'

export const ClassicyBoot: FunctionalComponent = () => {
    const player = useSoundDispatch()
    player({type: 'ClassicySoundPlay', sound: 'ClassicyBoot'})

    return <div className={"classicyBoot"}/>
}
