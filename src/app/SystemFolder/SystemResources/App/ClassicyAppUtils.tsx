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
