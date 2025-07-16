import { classicyAppEventHandler, ClassicyStore } from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import { MoviePlayerAppInfo } from '@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer'

export type ClassicyQuickTimeDocument = {
    url: string
    name?: string
    options?: any
    icon?: string
    type?: 'video' | 'audio' | 'image'
}

type classicyQuickTimeEvent = {
    type: string
    document?: ClassicyQuickTimeDocument
    documents?: ClassicyQuickTimeDocument[]
}

export const classicyQuickTimeMoviePlayerEventHandler = (ds: ClassicyStore, action: classicyQuickTimeEvent) => {
    const { id: appId } = MoviePlayerAppInfo

    if (!ds.System.Manager.App.apps[appId]?.data) {
        ds.System.Manager.App.apps[appId].data = {}
    }

    const openDocUrls = ds.System.Manager.App.apps[appId]?.data['openFiles'].map((app: ClassicyQuickTimeDocument) => app.url)

    switch (action.type) {
        case 'ClassicyAppMoviePlayerOpenDocument': {
            if (!action.document) {
                break
            }
            if (Array.isArray(openDocUrls) && !openDocUrls.includes(action.document.url)) {
                ds.System.Manager.App.apps[appId].data['openFiles'] = Array.from(
                    new Set([...ds.System.Manager.App.apps[appId].data['openFiles'], action.document])
                )
                ds = classicyAppEventHandler(ds, {
                    type: 'ClassicyAppOpen',
                    app: MoviePlayerAppInfo,
                })
            }
            break
        }
        case 'ClassicyAppMoviePlayerOpenDocuments': {
            const docs = action.documents?.filter((doc) => !openDocUrls.includes(doc.url))
            if (!docs) {
                break
            }
            ds.System.Manager.App.apps[appId].data['openFiles'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId].data['openFiles'], ...docs])
            )
            ds = classicyAppEventHandler(ds, {
                type: 'ClassicyAppOpen',
                app: MoviePlayerAppInfo,
            })
            break
        }
        case 'ClassicyAppMoviePlayerCloseDocument': {
            if (!action.document) {
                break
            }

            ds.System.Manager.App.apps[appId].data['openFiles'] = ds.System.Manager.App.apps[appId].data[
                'openFiles'
            ].filter((p: ClassicyQuickTimeDocument) => p.url != action.document?.url)
            break
        }
    }
    return ds
}
