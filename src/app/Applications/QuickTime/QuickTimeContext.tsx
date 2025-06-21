import { QuickTimeAppInfo } from '@/app/Applications/QuickTime/QuickTimeMoviePlayer'
import { classicyAppEventHandler, ClassicyStore } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export type ClassicyQuickTimeDocument = {
    url: string
    name?: string
    options?: any
    icon?: string
    type?: 'video' | 'audio'
}
type classicyQuickTimeEvent = {
    type: string
    document?: ClassicyQuickTimeDocument
    documents?: ClassicyQuickTimeDocument[]
}

export const classicyQuickTimeEventHandler = (ds: ClassicyStore, action: classicyQuickTimeEvent) => {
    const { id: appId } = QuickTimeAppInfo
    if (!ds.System.Manager.App.apps[appId]) {
        ds = classicyAppEventHandler(ds, {
            type: 'ClassicyAppLoad',
            app: QuickTimeAppInfo,
        })
    }

    if (!ds.System.Manager.App.apps[appId]?.hasOwnProperty('data')) {
        ds.System.Manager.App.apps[appId].data = {}
    }

    if (!ds.System.Manager.App.apps[appId]?.data?.hasOwnProperty('openFiles')) {
        ds.System.Manager.App.apps[appId].data['openFiles'] = []
    }

    const openDocUrls = ds.System.Manager.App.apps[appId].data['openFiles'].map((app) => app.url)

    switch (action.type) {
        case 'ClassicyAppQuickTimeOpenDocument': {
            if (Array.isArray(openDocUrls) && !openDocUrls.includes(action.document.url)) {
                ds.System.Manager.App.apps[appId].data['openFiles'] = Array.from(
                    new Set([...ds.System.Manager.App.apps[appId].data['openFiles'], action.document])
                )
                ds = classicyAppEventHandler(ds, {
                    type: 'ClassicyAppOpen',
                    app: QuickTimeAppInfo,
                })
            }
            break
        }
        case 'ClassicyAppQuickTimeOpenDocuments': {
            const docs = action.documents?.filter((doc) => !openDocUrls.includes(doc.url))
            if (!docs) {
                break
            }
            ds.System.Manager.App.apps[appId].data['openFiles'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId].data['openFiles'], ...docs])
            )
            ds = classicyAppEventHandler(ds, {
                type: 'ClassicyAppOpen',
                app: QuickTimeAppInfo,
            })
            break
        }
        case 'ClassicyAppQuickTimeCloseDocument': {
            ds.System.Manager.App.apps[appId].data['openFiles'] = ds.System.Manager.App.apps[appId].data[
                'openFiles'
            ].filter((p: ClassicyQuickTimeDocument) => p.url != action.document.url)
            break
        }
    }
    return ds
}
