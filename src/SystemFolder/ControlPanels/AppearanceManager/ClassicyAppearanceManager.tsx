'use client'

import appIcon from 'img/icons/control-panels/appearance-manager/app.png'
import packageIcon from 'img/icons/control-panels/appearance-manager/platinum.png'
import AzulDark from 'img/wallpapers/azul_dark.png'
import AzulExtraLight from 'img/wallpapers/azul_extra_light.png'
import AzulLight from 'img/wallpapers/azul_light.png'
import Bondi from 'img/wallpapers/bondi.png'
import BondiDark from 'img/wallpapers/bondi_dark.png'
import BondiExtraDark from 'img/wallpapers/bondi_extra_dark.png'
import BondiLight from 'img/wallpapers/bondi_light.png'
import BondiMedium from 'img/wallpapers/bondi_medium.png'
import BossanovaBondi from 'img/wallpapers/bossanova_bondi.png'
import BossanovaPoppy from 'img/wallpapers/bossanova_poppy.png'
import BossanovaPoppy2 from 'img/wallpapers/bossanova_poppy_2.png'
import BubblesBondi from 'img/wallpapers/bubbles_bondi.png'
import BubblesPoppy from 'img/wallpapers/bubbles_poppy.png'
import CandyBar from 'img/wallpapers/candy_bar.png'
import CandyBarAzul from 'img/wallpapers/candy_bar_azul.png'
import CandyBarPistachio from 'img/wallpapers/candy_bar_pistachio.png'
import CandyBarSunny from 'img/wallpapers/candy_bar_sunny.png'
import Default from 'img/wallpapers/default.png'
import DiagonalsBondi from 'img/wallpapers/diagonals_bondi.png'
import DiagonalsBondiDark from 'img/wallpapers/diagonals_bondi_dark.png'
import DiagonalsPoppy from 'img/wallpapers/diagonals_poppy.png'
import FlatPeanuts from 'img/wallpapers/flat_peanuts.png'
import FlatPeanutsPoppy from 'img/wallpapers/flat_peanuts_poppy.png'
import FrenchBlueDark from 'img/wallpapers/french_blue_dark.png'
import FrenchBlueLight from 'img/wallpapers/french_blue_light.png'
import MacOS from 'img/wallpapers/macos.png'
import PeanutsAzul from 'img/wallpapers/peanuts_azul.png'
import PeanutsPistachio from 'img/wallpapers/peanuts_pistachio.png'
import PistachioDark from 'img/wallpapers/pistachio_dark.png'
import PistachioLight from 'img/wallpapers/pistachio_light.png'
import PistachioMedium from 'img/wallpapers/pistachio_medium.png'
import Poppy from 'img/wallpapers/poppy.png'
import PoppyDark from 'img/wallpapers/poppy_dark.png'
import PoppyLight from 'img/wallpapers/poppy_light.png'
import PoppyMedium from 'img/wallpapers/poppy_medium.png'
import RioAzul from 'img/wallpapers/rio_azul.png'
import RioPistachio from 'img/wallpapers/rio_pistachio.png'
import RippleAzul from 'img/wallpapers/ripple_azul.png'
import RippleBondi from 'img/wallpapers/ripple_bondi.png'
import RipplePoppy from 'img/wallpapers/ripple_poppy.png'
import Sunny from 'img/wallpapers/sunny.png'
import SunnyDark from 'img/wallpapers/sunny_dark.png'
import SunnyLight from 'img/wallpapers/sunny_light.png'
import WavesAzul from 'img/wallpapers/waves_azul.png'
import WavesBondi from 'img/wallpapers/waves_bondi.png'
import WavesSunny from 'img/wallpapers/waves_sunny.png'
import {getTheme} from '@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'
import {useDesktop, useDesktopDispatch} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import {getClassicyAboutWindow} from '@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow'
import {ClassicyApp} from '@/SystemFolder/SystemResources/App/ClassicyApp'
import {quitAppHelper, quitMenuItemHelper} from '@/SystemFolder/SystemResources/App/ClassicyAppUtils'
import {ClassicyButton} from '@/SystemFolder/SystemResources/Button/ClassicyButton'
import {ClassicyControlLabel} from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import {ClassicyInput} from '@/SystemFolder/SystemResources/Input/ClassicyInput'
import {ClassicyPopUpMenu} from '@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu'
import {ClassicyTabs} from '@/SystemFolder/SystemResources/Tabs/ClassicyTabs'
import {ClassicyWindow} from '@/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, {ChangeEvent, useState} from 'react'

function isValidUrlWithRegex(url: string): boolean {
    const urlPattern = /^(https?):\/\/[^\s/$.?#].[^\s]*$/i
    return urlPattern.test(url)
}

export const ClassicyAppearanceManager: React.FC = () => {
    const appName: string = 'Appearance Manager'
    const appId: string = 'AppearanceManager.app'

    const desktopContext = useDesktop(),
        desktopEventDispatch = useDesktopDispatch(),
        player = useSoundDispatch()

    const [showAbout, setShowAbout] = useState(false)
    const [bg, setBg] = useState<string>(
        desktopContext.System.Manager.Appearance.activeTheme.desktop.backgroundImage || Default
    )

    const themesList = desktopContext.System.Manager.Appearance.availableThemes?.map((a: any) =>
        (({id, name}) => ({value: id, label: name}))(a)
    )

    const fonts = [
        {label: 'Charcoal', value: 'Charcoal'},
        {label: 'ChicagoFLF', value: 'ChicagoFLF'},
        {label: 'Geneva', value: 'Geneva'},
        {label: 'AppleGaramond', value: 'AppleGaramond'},
    ]

    const backgrounds = [
        {label: 'Azul Dark', value: AzulDark},
        {label: 'Azul Extra Light', value: AzulExtraLight},
        {label: 'Azul Light', value: AzulLight},
        {label: 'Bondi', value: Bondi},
        {label: 'Bondi Dark', value: BondiDark},
        {label: 'Bondi Extra Dark', value: BondiExtraDark},
        {label: 'Bondi Light', value: BondiLight},
        {label: 'Bondi Medium', value: BondiMedium},
        {label: 'Bossanova Bondi', value: BossanovaBondi},
        {label: 'Bossanova Poppy', value: BossanovaPoppy},
        {label: 'Bossanova Poppy 2', value: BossanovaPoppy2},
        {label: 'Bubbles Bondi', value: BubblesBondi},
        {label: 'Bubbles Poppy', value: BubblesPoppy},
        {label: 'Candy Bar', value: CandyBar},
        {label: 'Candy Bar Azul', value: CandyBarAzul},
        {label: 'Candy Bar Pistachio', value: CandyBarPistachio},
        {label: 'Candy Bar Sunny', value: CandyBarSunny},
        {label: 'Default', value: Default},
        {label: 'Diagonals Bondi', value: DiagonalsBondi},
        {label: 'Diagonals Bondi Dark', value: DiagonalsBondiDark},
        {label: 'Diagonals Poppy', value: DiagonalsPoppy},
        {label: 'Flat Peanuts', value: FlatPeanuts},
        {label: 'Flat Peanuts Poppy', value: FlatPeanutsPoppy},
        {label: 'French Blue Dark', value: FrenchBlueDark},
        {label: 'French Blue Light', value: FrenchBlueLight},
        {label: 'MacOS', value: MacOS},
        {label: 'Peanuts Azul', value: PeanutsAzul},
        {label: 'Peanuts Pistachio', value: PeanutsPistachio},
        {label: 'Pistachio Dark', value: PistachioDark},
        {label: 'Pistachio Light', value: PistachioLight},
        {label: 'Pistachio Medium', value: PistachioMedium},
        {label: 'Poppy', value: Poppy},
        {label: 'Poppy Dark', value: PoppyDark},
        {label: 'Poppy Light', value: PoppyLight},
        {label: 'Poppy Medium', value: PoppyMedium},
        {label: 'Rio Azul', value: RioAzul},
        {label: 'Rio Pistachio', value: RioPistachio},
        {label: 'Ripple Azul', value: RippleAzul},
        {label: 'Ripple Bondi', value: RippleBondi},
        {label: 'Ripple Poppy', value: RipplePoppy},
        {label: 'Sunny', value: Sunny},
        {label: 'Sunny Dark', value: SunnyDark},
        {label: 'Sunny Light', value: SunnyLight},
        {label: 'Waves Azul', value: WavesAzul},
        {label: 'Waves Bondi', value: WavesBondi},
        {label: 'Waves Sunny', value: WavesSunny},
    ]

    const switchTheme = async (e: ChangeEvent<HTMLSelectElement>) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeTheme',
            activeTheme: e.currentTarget.value,
        })
        await loadSoundTheme(e.currentTarget.value)
    }

    const changeBackground = (e: ChangeEvent<HTMLSelectElement>) => {
        setBg(e.target.value)
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeBackground',
            backgroundImage: e.target.value,
        })
    }

    const setBackgroundURL = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isValidUrlWithRegex(e.target.value)) {
            setBg(e.target.value)
            desktopEventDispatch({
                type: 'ClassicyDesktopChangeBackground',
                backgroundImage: e.target.value,
            })
        }
    }

    const alignBackground = (e: ChangeEvent<HTMLSelectElement>) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeBackgroundPosition',
            backgroundPosition: e.target.value,
        })
    }

    const repeatBackground = (e: ChangeEvent<HTMLSelectElement>) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeBackgroundRepeat',
            backgroundRepeat: e.target.value,
        })
    }

    const backgroundSize = (e: ChangeEvent<HTMLSelectElement>) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeBackgroundSize',
            backgroundSize: e.target.value,
        })
    }

    const changeFont = (e: ChangeEvent<HTMLSelectElement>) => {
        desktopEventDispatch({
            type: 'ClassicyDesktopChangeFont',
            font: e.target.value,
            fontType: e.target.id,
        })
    }
    const loadSoundTheme = async (themeName: string) => {
        const soundTheme = getTheme(themeName).sound
        const data = fetch(soundTheme.file).then((response) => response.json())
        await data
        player({
            type: 'ClassicySoundLoad',
            file: data,
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
                    <ClassicyControlLabel label={'The current Theme Package is Platinum'} icon={packageIcon}/>
                    <br/>
                    {themesList && (
                        <ClassicyPopUpMenu
                            id={'select_theme'}
                            label={'Selected Theme'}
                            options={themesList}
                            onChangeFunc={switchTheme}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.id || 'default'}
                        />
                    )}
                    <br/>
                </>
            ),
        },
        {
            title: 'Desktop',
            children: (
                <>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                        <img
                            draggable={false}
                            src={bg}
                            style={{height: '100%', minWidth: '50%', userSelect: 'none'}}
                            alt={'Background'}
                        />
                        <div style={{width: '100%'}}>
                            <ClassicyControlLabel label={'Patterns'} direction={'left'}/>
                            <ClassicyPopUpMenu
                                id={'bg'}
                                options={backgrounds}
                                onChangeFunc={changeBackground}
                                selected={bg.split('/').pop()}
                            ></ClassicyPopUpMenu>
                            <br/>
                            <ClassicyControlLabel label={'Picture'} direction={'left'}/>
                            <ClassicyInput id={'custom_background_image_url'} onChangeFunc={setBackgroundURL}/>
                            <br/>
                            <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '1em'}}>
                                <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                                    <ClassicyControlLabel label={'Align'} direction={'left'}/>
                                    <ClassicyPopUpMenu
                                        onChangeFunc={alignBackground}
                                        id={'position_custom_background_image'}
                                        small={false}
                                        options={[
                                            {value: 'center', label: 'Center'},
                                            {value: 'top left', label: 'Top Left'},
                                            {value: 'top right', label: 'Top Right'},
                                            {value: 'top center', label: 'Top Center'},
                                            {value: 'bottom left', label: 'Bottom Left'},
                                            {value: 'bottom right', label: 'Bottom Right'},
                                            {value: 'bottom center', label: 'Bottom Center'},
                                            // { value: 'tile', label: 'Tile on Screen' },
                                        ]}
                                        selected={'center'}
                                    />
                                </div>
                                <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                                    <ClassicyControlLabel label={'Repeat'} direction={'left'}/>
                                    <ClassicyPopUpMenu
                                        onChangeFunc={repeatBackground}
                                        id={'repeat_background_image'}
                                        small={false}
                                        options={[
                                            {value: 'repeat', label: 'Repeat'},
                                            {value: 'repeat-x', label: 'Repeat Horizontally'},
                                            {value: 'repeat-y', label: 'Repeat Vertically'},
                                            {value: 'no-repeat', label: 'No Repeat'},
                                        ]}
                                        selected={'repeat'}
                                    />
                                </div>
                                <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                                    <ClassicyControlLabel label={'Size'} direction={'left'}/>
                                    <ClassicyPopUpMenu
                                        onChangeFunc={backgroundSize}
                                        id={'repeat_background_image'}
                                        small={false}
                                        options={[
                                            {value: 'normal', label: 'Normal'},
                                            {value: 'cover', label: 'Stretch'},
                                            {value: 'contain', label: 'Fill'},
                                        ]}
                                        selected={'repeat'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ),
        },
        {
            title: 'Fonts',
            children: (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1em'}}>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                        <div style={{width: '50%'}}>
                            <ClassicyControlLabel label={'Large System Font'} direction={'left'}/>
                        </div>
                        <ClassicyPopUpMenu
                            id={'ui'}
                            options={fonts}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.typography.ui}
                            onChangeFunc={changeFont}
                        ></ClassicyPopUpMenu>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                        <div style={{width: '50%'}}>
                            <ClassicyControlLabel label={'Small System Font'} direction={'left'}/>
                        </div>
                        <ClassicyPopUpMenu
                            id={'body'}
                            options={fonts}
                            selected={desktopContext.System.Manager.Appearance.activeTheme.typography.body}
                            onChangeFunc={changeFont}
                        ></ClassicyPopUpMenu>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'row', gap: '1em'}}>
                        <div style={{width: '50%'}}>
                            <ClassicyControlLabel label={'Header Font'} direction={'left'}/>
                        </div>
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
                    <ClassicyTabs tabs={tabs}/>
                    <ClassicyButton onClickFunc={cleanupIcons}>Cleanup Icons</ClassicyButton>
                    <ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
                </div>
            </ClassicyWindow>
            {showAbout && getClassicyAboutWindow({appId, appName, appIcon, hideFunc: () => setShowAbout(false)})}
        </ClassicyApp>
    )
}
