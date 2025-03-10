import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyCheckbox from '@/app/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox'
import ClassicyControlGroup from '@/app/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup'
import ClassicyDisclosure from '@/app/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure'
import ClassicyInput from '@/app/SystemFolder/SystemResources/Input/ClassicyInput'
import ClassicyPopUpMenu from '@/app/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu'
import ClassicyProgressBar from '@/app/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar'
import ClassicyRadioInput from '@/app/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'

const Demo: React.FC = () => {
    const appName = 'Demo'
    const appId = 'Demo.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/folders/directory.png`

    const desktopEventDispatch = useDesktopDispatch()
    const [appContext] = React.useState({})

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const appMenu = [
        {
            id: 'file',
            title: 'File',
            menuChildren: [
                {
                    id: appId + '_quit',
                    title: 'Quit',
                    onClickFunc: quitApp,
                },
            ],
        },
    ]

    return (
        <>
            <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'} appContext={appContext}>
                <ClassicyWindow
                    id={'demo2'}
                    title={appName}
                    appId={appId}
                    closable={false}
                    resizable={false}
                    zoomable={false}
                    scrollable={false}
                    collapsable={false}
                    initialSize={[400, 0]}
                    initialPosition={[300, 50]}
                    modal={true}
                    appMenu={appMenu}
                >
                    <ClassicyPopUpMenu
                        id={'select_theme'}
                        small={false}
                        options={[
                            { value: 'hello', label: 'Hello' },
                            { value: 'hello2', label: 'Hello again!' },
                        ]}
                        selected={'hello'}
                    />
                    <ClassicyProgressBar value={59}></ClassicyProgressBar>
                    <ClassicyInput id={'test'} labelTitle={'Text Input'}></ClassicyInput>
                    <ClassicyControlGroup label={'Test Radio Inputs'}>
                        <ClassicyRadioInput
                            inputs={[
                                {
                                    id: 'test1',
                                    isDefault: true,
                                    disabled: false,
                                    label: 'Radio Button 1 (Default)',
                                },
                                {
                                    id: 'test2',
                                    label: 'Radio Button 2 (Regular)',
                                },
                                {
                                    id: 'test3',
                                    mixed: true,
                                    label: 'Radio Button 3 (Mixed)',
                                },
                            ]}
                            name={'test_radio'}
                            label={'Radio Buttons'}
                        />
                        <ClassicyRadioInput
                            inputs={[
                                {
                                    id: 'test4',
                                    disabled: true,
                                    label: 'Radio Button 4 (Disabled)',
                                },
                                {
                                    id: 'test5',
                                    checked: true,
                                    disabled: true,
                                    mixed: true,
                                    label: 'Radio Button 6 (Disabled + Checked + Mixed)',
                                },
                            ]}
                            name={'test_radio_disabled'}
                            label={'Disabled Radio Buttons'}
                        />
                    </ClassicyControlGroup>
                    <ClassicyControlGroup label={'Test Checkboxes'}>
                        <ClassicyCheckbox
                            id={'test6'}
                            isDefault={true}
                            checked={true}
                            label={'Default Checkbox'}
                            disabled={false}
                        />
                        <ClassicyCheckbox id={'test7'} isDefault={false} label={'Checkbox 2'} disabled={false} />
                        <ClassicyCheckbox
                            id={'test8'}
                            mixed={true}
                            isDefault={false}
                            label={'Mixed'}
                            disabled={false}
                        />
                        <ClassicyCheckbox
                            id={'test9'}
                            isDefault={false}
                            label={'Disabled'}
                            disabled={true}
                            onClickFunc={() => {
                                alert('This is disabled')
                            }}
                        />
                    </ClassicyControlGroup>
                    <ClassicyDisclosure label={'Expandable Section'}>
                        <p style={{ fontFamily: 'var(--header-font)' }}>HELLO!</p>
                    </ClassicyDisclosure>
                    <ClassicyButton isDefault={true}>Do Nothing</ClassicyButton>
                    <ClassicyButton isDefault={false} onClick={quitApp}>
                        Quit
                    </ClassicyButton>
                    <ClassicyButton isDefault={false} disabled={true}>
                        Disabled
                    </ClassicyButton>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default Demo
