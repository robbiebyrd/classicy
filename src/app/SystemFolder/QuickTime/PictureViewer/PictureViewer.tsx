import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitMenuItemHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useEffect } from 'react'

export type QuickTimeImageDocument = {
    url: string
    name?: string
    icon?: string
}

export const PictureViewerAppInfo = {
    name: 'Picture Viewer',
    id: 'PictureViewer.app',
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/player.png`,
}

const QuickTimePictureViewer: React.FC = () => {
    const { name: appName, id: appId, icon: appIcon } = PictureViewerAppInfo

    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

    const defaultDocumentIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/movie.png`
    const openDocuments = desktop.System.Manager.App.apps[appId]?.data['openFiles']

    // Load Default Demo documents on open
    useEffect(() => {
        const appData = desktop.System.Manager.App.apps[appId]?.data || {}
        if (
            (desktop.System.Manager.App.apps[appId]?.open && !appData['openDocuments']) ||
            appData['openDocuments']?.length === 0
        ) {
            const defaultDocs = [
                {
                    url: '/img/apps/quicktime/sample-picture.jpg',
                    name: 'Sample Picture',
                    icon: defaultDocumentIcon,
                },
            ]
            desktopEventDispatch({
                type: 'ClassicyAppPictureViewerOpenDocuments',
                documents: defaultDocs,
            })
        }
    }, [])

    const openUrl = (name: string, url: string, iconUrl?: string) => {
        desktopEventDispatch({
            type: 'ClassicyAppPictureViewerOpenDocument',
            document: { name, url: url, icon: iconUrl || defaultDocumentIcon },
        })

        const windowIndex = desktop.System.Manager.App.apps[appId].windows.findIndex(
            (w) => w.id === appId + '_PictureViewer_' + url
        )
        const ws = desktop.System.Manager.App.apps[appId].windows[windowIndex]
        if (ws) {
            ws.closed = false
            desktopEventDispatch({
                type: 'ClassicyWindowOpen',
                app: {
                    id: appId,
                },
                window: ws,
            })
            desktopEventDispatch({
                type: 'ClassicyWindowFocus',
                app: {
                    id: appId,
                },
                window: ws,
            })
        }
    }

    const appMenu = [
        {
            id: 'file',
            title: 'File',
            menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
        },
    ]

    return (
        <ClassicyApp id={appId} name={appName} icon={appIcon}>
            {Array.isArray(openDocuments) &&
                openDocuments.length > 0 &&
                openDocuments.map((doc: QuickTimeImageDocument) => (
                    <ClassicyWindow
                        key={doc.name + '_' + doc.url}
                        id={appId + '_PictureViewer_' + doc.url}
                        title={doc.name}
                        icon={doc.icon || undefined}
                        minimumSize={[300, 60]}
                        appId={appId}
                        closable={true}
                        resizable={true}
                        zoomable={true}
                        scrollable={true}
                        collapsable={false}
                        initialSize={[400, 100]}
                        initialPosition={[300, 50]}
                        modal={false}
                        appMenu={appMenu}
                        onCloseFunc={() =>
                            desktopEventDispatch({
                                type: 'ClassicyAppPictureViewerCloseDocument',
                                document: doc,
                            })
                        }
                    >
                        <img
                            src={doc.url}
                            alt={doc.name}
                            style={{
                                width: 'calc(100% - var(--window-padding-size))',
                                height: 'calc(100% - var(--window-padding-size))',
                                objectFit: 'contain',
                            }}
                        />
                    </ClassicyWindow>
                ))}
        </ClassicyApp>
    )
}

export default QuickTimePictureViewer
