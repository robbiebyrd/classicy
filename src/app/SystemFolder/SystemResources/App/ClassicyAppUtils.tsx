export const quitAppHelper = (appId: string, appName: string, appIcon: string) => {
    return {
        type: 'ClassicyAppClose',
        app: {
            id: appId,
            title: appName,
            icon: appIcon,
        },
    }
}

export const quitMenuItemHelper = (appId: string, appName: string, appIcon: string) => {
    return {
        id: appId + '_quit',
        title: 'Quit',
        event: 'ClassicyAppClose',
        eventData: {
            app: {
                id: appId,
                title: appName,
                icon: appIcon,
            },
        },
    }
}
