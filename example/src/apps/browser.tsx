import { ClassicyApp, ClassicyButton, ClassicyControlLabel, ClassicyIcons, ClassicyInput, ClassicyWindow, quitAppHelper, useAppManagerDispatch } from 'classicy'
import React from 'react'

const Browser = () => {
    const appName = 'Browser'
    const appId = 'Browser.app'
    const appIcon = ClassicyIcons.applications.internetExplorer.app

    const desktopEventDispatch = useAppManagerDispatch()

    const refAddressBar = React.useRef<HTMLInputElement>(null)
    const [iframeSrc, setIframeUrl] = React.useState('https://theoldnet.com')
    const [urlError, setUrlError] = React.useState(false)

    const showError = () => {
        setUrlError(true)
        desktopEventDispatch({
            type: 'ClassicyWindowFocus',
            app: { id: appId },
            window: { id: 'browser_error' },
        })
    }

    const goBook = () => {
        if (!refAddressBar.current) return
        const value = refAddressBar.current.value.trim()
        try {
            const url = new URL(value)
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                showError()
                return
            }
            setUrlError(false)
            setIframeUrl(value)
        } catch {
            showError()
        }
    }

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
        <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'browser'}>
            {urlError && (
                <ClassicyWindow
                    id={'browser_error'}
                    title={'Error'}
                    appId={appId}
                    modal={true}
                    type={'error'}
                    closable={true}
                    resizable={false}
                    zoomable={false}
                    scrollable={false}
                    collapsable={false}
                    initialPosition={[200, 200]}
                    onCloseFunc={() => setUrlError(false)}
                >
                    <p>Please enter a valid URL starting with http:// or https://</p>
                    <ClassicyButton onClickFunc={() => setUrlError(false)}>OK</ClassicyButton>
                </ClassicyWindow>
            )}
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
                <div style={{backgroundColor: "var(--color-system-03)", display: "flex", flexDirection: "row"}}>
                    <div style={{width: "100%"}}>
                        <div style={{display: "flex", flexDirection: "row"}}>
                            <ClassicyButton>
                                <p style={{display: "flex"}}>
                                <img src={ClassicyIcons.applications.internetExplorer.backward}/>
                                    <ClassicyControlLabel label='Back'></ClassicyControlLabel>
                                </p>
                            </ClassicyButton>
                            <ClassicyButton buttonSize='large' >
                                <p style={{display: "flex", flexDirection: "row", margin: 0, padding: 0}}>
                                    <img src={ClassicyIcons.applications.internetExplorer.forward} style={{width: "auto", height: "150%"}} />
                                    <ClassicyControlLabel label='Forward'></ClassicyControlLabel>
                                </p>
                            </ClassicyButton>
                            <div style={{width: "100%", display: "flex", flexDirection: "row", alignSelf: "center", gap: "4px"}}>
                                <ClassicyControlLabel label="Address:" />
                                <ClassicyInput id={'browserAddress'} ref={refAddressBar}></ClassicyInput>
                            </div>
                        <ClassicyButton onClickFunc={goBook}>Go</ClassicyButton>
                        </div>
                    </div>
                    <img src={ClassicyIcons.applications.internetExplorer.loaderAnimated} style={{
                        aspectRatio: "1/1",
                        height: "38px",
                        boxShadow: "inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-03), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-05), calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-06)"
                        }}/>
                </div>
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