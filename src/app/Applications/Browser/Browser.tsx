import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import {useDesktopDispatch} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyControlGroup from '@/app/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup'
import ClassicyInput from '@/app/SystemFolder/SystemResources/Input/ClassicyInput'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'

const Browser = () => {
    const appName = 'Browser'
    const appId = 'Browser.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/network/internet-services.png`

    const desktopEventDispatch = useDesktopDispatch()
    const [appContext] = React.useState({})

    const refAddressBar = React.useRef(null)
    const [iframeSrc, setIframeUrl] = React.useState('https://theoldnet.com')

    const goBook = () => {
        setIframeUrl(refAddressBar.current.value)
    }

    const quitApp = () => {
        desktopEventDispatch({
            type: 'ClassicyAppClose',
            app: {
                id: appId,
                title: appName,
                icon: appIcon,
            },
        })
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
        <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'} appContext={appContext}>
            <ClassicyWindow
                id={'demo'}
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
                    <ClassicyButton onClick={goBook}>Submit</ClassicyButton>
                </ClassicyControlGroup>
                <iframe
                    title="myBook"
                    src={iframeSrc}
                    height="720"
                    width="1280"
                    allowFullScreen={true}
                    style={{width: '100%', height: '100%', padding: '0', margin: '0'}}
                ></iframe>
            </ClassicyWindow>
        </ClassicyApp>
    )
}

export default Browser
