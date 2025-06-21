'use client'

import { getTheme } from '@/app/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { useSoundDispatch } from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import { getClassicyAboutWindow } from '@/app/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow'
import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper, quitMenuItemHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import ClassicyPopUpMenu from '@/app/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu'
import ClassicyTabs from '@/app/SystemFolder/SystemResources/Tabs/ClassicyTabs'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useState } from 'react'

export const ClassicyAppearanceManager: React.FC = () => {
    const appName: string = 'Appearance Manager'
    const appId: string = 'AppearanceManager.app'
    const appIcon: string = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/appearance-manager/app.png`
    const packageIcon: string = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/appearance-manager/platinum.png`

    const desktopContext = useDesktop(),
        desktopEventDispatch = useDesktopDispatch()

    const player = useSoundDispatch()

    const [showAbout, setShowAbout] = useState(false)
    const [bg, setBg] = useState<string>(
        desktopContext.System.Manager.Appearance.activeTheme.desktop.backgroundImage ||
            `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/wallpapers/default.png`
    )

    const themesList = desktopContext.System.Manager.Appearance.availableThemes.map((a: any) =>
        (({ id, name }) => ({ value: id, label: name }))(a)
    )

    const fonts = [
        { label: 'Charcoal', value: 'Charcoal' },
        { label: 'ChicagoFLF', value: 'ChicagoFLF' },
        { label: 'Geneva', value: 'Geneva' },
        { label: 'AppleGaramond', value: 'AppleGaramond' },
    ]

    const backgroundPrefix: string = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/wallpapers`
    const backgrounds = [
        { label: 'Azul Dark', value: 'azul_dark.png' },
        { label: 'Azul Extra Light', value: 'azul_extra_light.png' },
        { label: 'Azul Light', value: 'azul_light.png' },
        { label: 'Bondi', value: 'bondi.png' },
        { label: 'Bondi Dark', value: 'bondi_dark.png' },
        { label: 'Bondi Extra Dark', value: 'bondi_extra_dark.png' },
        { label: 'Bondi Light', value: 'bondi_light.png' },
        { label: 'Bondi Medium', value: 'bondi_medium.png' },
        { label: 'Bossanova Bondi', value: 'bossanova_bondi.png' },
        { label: 'Bossanova Poppy', value: 'bossanova_poppy.png' },
        { label: 'Bossanova Poppy 2', value: 'bossanova_poppy_2.png' },
        { label: 'Bubbles bondi', value: 'bubbles_bondi.png' },
        { label: 'Bubbles poppy', value: 'bubbles_poppy.png' },
        { label: 'Candy Bar', value: 'candy_bar.png' },
        { label: 'Candy Bar Azul', value: 'candy_bar_azul.png' },
        { label: 'Candy Bar Pistachio', value: 'candy_bar_pistachio.png' },
        { label: 'Candy Bar Sunny', value: 'candy_bar_sunny.png' },
        { label: 'Default', value: 'default.png' },
        { label: 'Diagonals Bondi', value: 'diagonals_bondi.png' },
        { label: 'Diagonals Bondi dark', value: 'diagonals_bondi_dark.png' },
        { label: 'Diagonals Poppy', value: 'diagonals_poppy.png' },
        { label: 'Flat Peanuts', value: 'flat_peanuts.png' },
        { label: 'Flat Peanuts Poppy', value: 'flat_peanuts_poppy.png' },
        { label: 'French Blue Dark', value: 'french_blue_dark.png' },
        { label: 'French Blue Light', value: 'french_blue_light.png' },
        { label: 'macos', value: 'macos.png' },
        { label: 'Peanuts Azul', value: 'peanuts_azul.png' },
        { label: 'Peanuts Pistachio', value: 'peanuts_pistachio.png' },
        { label: 'Pistachio Dark', value: 'pistachio_dark.png' },
        { label: 'Pistachio Light', value: 'pistachio_light.png' },
        { label: 'Pistachio Medium', value: 'pistachio_medium.png' },
        { label: 'Poppy', value: 'poppy.png' },
        { label: 'Poppy Dark', value: 'poppy_dark.png' },
        { label: 'Poppy Light', value: 'poppy_light.png' },
        { label: 'Poppy Medium', value: 'poppy_medium.png' },
        { label: 'Rio Azul', value: 'rio_azul.png' },
        { label: 'Rio Pistachio', value: 'rio_pistachio.png' },
        { label: 'Ripple Azul', value: 'ripple_azul.png' },
        { label: 'Ripple Bondi', value: 'ripple_bondi.png' },
        { label: 'Ripple Poppy', value: 'ripple_poppy.png' },
        { label: 'Sunny', value: 'sunny.png' },
        { label: 'Sunny Dark', value: 'sunny_dark.png' },
        { label: 'Sunny Light', value: 'sunny_light.png' },
        { label: 'Waves Azul', value: 'waves_azul.png' },
        { label: 'Waves Bondi', value: 'waves_bondi.png' },
        { label: 'Waves Sunny', value: 'waves_sunny.png' },
    ]

    const switchTheme = (e) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeTheme',
            activeTheme: e.target.value,
        })
        loadSoundTheme(e.target.value)
    }

    const changeBackground = (e) => {
        setBg(backgroundPrefix + '/' + e.target.value)
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeBackground',
            backgroundImage: '/img/wallpapers/' + e.target.value,
        })
    }

    const changeFont = (e) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeFont',
            font: e.target.value,
            fontType: e.target.id,
        })
    }
    const loadSoundTheme = (themeName: string) => {
        const soundTheme = getTheme(themeName).sound
        player({
            type: 'ClassicySoundLoad',
            file: soundTheme.file,
            disabled: soundTheme.disabled,
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

    const cleanupIcons = () => {
        desktopEventDispatch({
            type: 'ClassicyDesktopIconCleanup',
        })
    }

    const tabs = [
        {
            title: 'Themes',
            children: (
                <>
                    <ClassicyControlLabel label={'The current Theme Package is Platinum'} icon={packageIcon} />
                    <br />
                    <ClassicyPopUpMenu
                        id={'select_theme'}
                        label={'Selected Theme'}
                        options={themesList}
                        onChangeFunc={switchTheme}
                        selected={desktopContext.System.Manager.Appearance.activeTheme.id || 'default'}
                    />
                    <br />
                </>
            ),
        },
        {
            title: 'Desktop',
            children: (
                <>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '1em' }}>
                        <img
                            draggable={false}
                            src={bg}
                            style={{ height: '100%', minWidth: '50%', userSelect: 'none' }}
                            alt={'Background'}
                        />
                        <div style={{ width: '100%' }}>
                            <ClassicyControlLabel label={'Desktop Background'} direction={'left'} />
                            <ClassicyPopUpMenu
                                id={'bg'}
                                options={backgrounds}
                                onChangeFunc={changeBackground}
                                selected={bg.split('/').pop()}
                            ></ClassicyPopUpMenu>
                        </div>
                    </div>
                </>
            ),
        },
        {
            title: 'Fonts',
            children: (
                <div>
                    <div>
                        <ClassicyControlLabel label={'System Font'} direction={'left'} />
                        <ClassicyPopUpMenu
                            id={'ui'}
                            options={fonts}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.typography.ui}
                            onChangeFunc={changeFont}
                        ></ClassicyPopUpMenu>
                    </div>
                    <div>
                        <ClassicyControlLabel label={'Body Font'} direction={'left'} />
                        <ClassicyPopUpMenu
                            id={'body'}
                            options={fonts}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.typography.body}
                            onChangeFunc={changeFont}
                        ></ClassicyPopUpMenu>
                    </div>
                    <div>
                        <ClassicyControlLabel label={'Header Font'} direction={'left'} />
                        <ClassicyPopUpMenu
                            id={'header'}
                            options={fonts}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.typography.header}
                            onChangeFunc={changeFont}
                        ></ClassicyPopUpMenu>
                    </div>
                </div>
            ),
        },
    ]

    return (
        <ClassicyApp
            id={appId}
            name={appName}
            icon={appIcon}
            defaultWindow={'AppearanceManager_1'}
            openOnBoot={false}
            noDesktopIcon={true}
            addSystemMenu={true}
        >
            <ClassicyWindow
                id={'AppearanceManager_1'}
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
                <ClassicyTabs tabs={tabs} />
                <ClassicyButton onClickFunc={cleanupIcons}>Cleanup Icons</ClassicyButton>
                <ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
            </ClassicyWindow>
            {showAbout && getClassicyAboutWindow({ appId, appName, appIcon, hideFunc: () => setShowAbout(false) })}
        </ClassicyApp>
    )
}
