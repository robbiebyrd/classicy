import { ClassicyStore } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'

export const classicyFinderEventHandler = (ds: ClassicyStore, action) => {
    const appId = 'Finder.app'

    switch (action.type) {
        case 'ClassicyAppFinderOpenFolder': {
            ds.System.Manager.App.apps[appId].data['openPaths'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId]?.data['openPaths'], action.path])
            )
            break
        }
        case 'ClassicyAppFinderOpenFolders': {
            ds.System.Manager.App.apps[appId].data['openPaths'] = Array.from(
                new Set([...ds.System.Manager.App.apps[appId]?.data['openPaths'], ...action.paths])
            )
            break
        }
        case 'ClassicyAppFinderCloseFolder': {
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
