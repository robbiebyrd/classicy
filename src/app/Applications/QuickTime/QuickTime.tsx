import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import {quitAppHelper} from "@/app/SystemFolder/SystemResources/App/ClassicyAppUtils";
import {useDesktopDispatch} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'
import ReactPlayer from "react-player";
import quickTimeStyles from "@/app/Applications/QuickTime/QuickTime.module.scss";

const QuickTime: React.FC = () => {
    const appName = 'QuickTime Player'
    const appId = 'QuickTime Player.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/player.png`

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
                    id={'VideoPlayer'}
                    title={appName}
                    appId={appId}
                    closable={true}
                    resizable={true}
                    zoomable={true}
                    scrollable={false}
                    collapsable={false}
                    initialSize={[400, 0]}
                    initialPosition={[300, 50]}
                    modal={true}
                    appMenu={appMenu}
                >
                    <div className={quickTimeStyles.quickTimePlayerVideoHolder}>
                        {/*<img style={{margin: 'auto', width: "100%"}}*/}
                        {/*     src={process.env.NEXT_PUBLIC_BASE_PATH || '' + '/img/icons/system/quicktime/splash.png'}/>*/}
                        <ReactPlayer
                            url='https://www3.cde.ca.gov/download/rod/big_buck_bunny.mp4'
                            playing={false}
                            loop={true}
                            controls={true}
                            playsinline={true}
                            width='100%'
                            height='100%'
                        />

                    </div>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default QuickTime
