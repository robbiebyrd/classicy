import classicyBootStyles from '@/app/SystemFolder/SystemResources/Boot/ClassicyBoot.module.scss'
import { useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

const ClassicyBoot: React.FC = () => {
    const player = useSoundDispatch()
    player({ type: 'ClassicySoundPlay', sound: 'ClassicyBoot' })

    return <div className={classNames(classicyBootStyles.classicyBoot)} />
}

export default ClassicyBoot
