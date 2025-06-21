import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitMenuItemHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyControlGroup from '@/app/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup'
import ClassicyInput from '@/app/SystemFolder/SystemResources/Input/ClassicyInput'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useRef, useState } from 'react'

const Browser = () => {
    const appName = 'Browser'
    const appId = 'Browser.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/network/internet-services.png`

    const desktopEventDispatch = useDesktopDispatch()

    const refAddressBar = useRef(null)
    const [iframeSrc, setIframeUrl] = useState('https://theoldnet.com')

    const goBook = () => {
        setIframeUrl(refAddressBar.current.value)
    }

    const appMenu = [
        {
            id: 'file',
            title: 'File',
            menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
        },
    ]

    return (
        <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'browser'}>
            <ClassicyWindow
                id={'browser'}
                title={appName}
                appId={appId}
                scrollable={false}
                initialSize={[100, 500]}
                initialPosition={[100, 100]}
                appMenu={appMenu}
                growable={true}
            >
                <ClassicyControlGroup columns={true}>
                    <ClassicyInput id={'browserAddress'} ref={refAddressBar}></ClassicyInput>
                    <ClassicyButton onClickFunc={goBook}>Submit</ClassicyButton>
                </ClassicyControlGroup>
                <iframe
                    title="myBook"
                    src={iframeSrc}
                    height="720"
                    width="1280"
                    allowFullScreen={true}
                    style={{ width: '100%', height: '100%', padding: '0', margin: '0' }}
                ></iframe>
            </ClassicyWindow>
        </ClassicyApp>
    )
}

export default Browser
