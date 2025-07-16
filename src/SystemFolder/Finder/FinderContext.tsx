import {ActionMessage, ClassicyStore} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export const classicyFinderEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    const appId = 'Finder.app'

    switch (action.type) {
        case 'ClassicyAppFinderOpenFolder': {

            if (!ds.System.Manager.App.apps[appId].data) {
                break
            }

            ds.System.Manager.App.apps[appId].data['openPaths'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId]?.data['openPaths'], action.path])
            )
            break
        }
        case 'ClassicyAppFinderOpenFolders': {
            if (!ds.System.Manager.App.apps[appId].data) {
                ds.System.Manager.App.apps[appId].data = {
                    "openPaths": []
                }
            }

            ds.System.Manager.App.apps[appId].data['openPaths'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId]?.data['openPaths'], ...action.paths])
            )
            break
        }
        case 'ClassicyAppFinderCloseFolder': {
            if (!ds.System.Manager.App.apps[appId].data) {
                ds.System.Manager.App.apps[appId].data = {
                    "openPaths": []
                }
            }
            ds.System.Manager.App.apps[appId].data['openPaths'] = ds.System.Manager.App.apps[appId]?.data[
                'openPaths'
            ].filter((p: string) => p !== action.path)
            break
        }
        case 'ClassicyAppFinderEmptyTrash': {
            // TODO: What will this do?
            break
        }
    }
    return ds
}
