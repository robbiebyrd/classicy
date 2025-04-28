import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'

const StateDebugger: React.FC = () => {
    const appName = 'StateDebugger'
    const appId = appName + '.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/folders/directory.png`

    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

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
            <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'stateDebuggerWindow'}>
                <ClassicyWindow
                    id={'stateDebuggerWindow'}
                    title={appName}
                    appId={appId}
                    closable={false}
                    initialSize={[400, 0]}
                    initialPosition={[10, 300]}
                    appMenu={appMenu}
                    scrollable={true}
                >
                    <pre style={{ height: '100%', overflow: 'scroll' }}>
                        {JSON.stringify(desktop.System.Manager.App.apps, null, 2)}
                    </pre>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default StateDebugger
