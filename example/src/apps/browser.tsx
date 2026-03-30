import { ClassicyApp, ClassicyButton, ClassicyControlLabel, ClassicyIcons, ClassicyInput, ClassicyWindow, quitAppHelper, useAppManagerDispatch } from 'classicy'
import React from 'react'

interface BrowserHistoryEntry {
    url: string
    visitedAt: string
}

const HISTORY_STORAGE_KEY = 'Browser.app.visitedHistory'

const loadVisitedHistory = (): BrowserHistoryEntry[] => {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

const saveVisitedHistory = (entries: BrowserHistoryEntry[]) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
}

const recordVisit = (url: string) => {
    const entries = loadVisitedHistory()
    entries.push({ url, visitedAt: new Date().toISOString() })
    saveVisitedHistory(entries)
}

const sanitizeUrl = (url: string): string => {
    try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href
        }
    } catch { /* invalid URL */ }
    return 'about:blank'
}

const Browser = () => {
    const appName = 'Browser'
    const appId = 'Browser.app'
    const appIcon = ClassicyIcons.applications.internetExplorer.app

    const desktopEventDispatch = useAppManagerDispatch()

    const defaultUrl = 'https://web.archive.org/web/19970404064352/http://www.apple.com/'

    const refAddressBar = React.useRef<HTMLInputElement>(null)
    const refIframe = React.useRef<HTMLIFrameElement>(null)
    const [history, setHistory] = React.useState<string[]>([defaultUrl])
    const [historyIndex, setHistoryIndex] = React.useState(0)
    const [iframeSrc, setIframeSrc] = React.useState(sanitizeUrl(defaultUrl))
    const [urlError, setUrlError] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)
    const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const refToolbar = React.useRef<HTMLDivElement>(null)
    const [isCompact, setIsCompact] = React.useState(false)

    // Refs to avoid stale closures in handleIframeLoad
    const historyRef = React.useRef(history)
    const historyIndexRef = React.useRef(historyIndex)
    historyRef.current = history
    historyIndexRef.current = historyIndex

    const canGoBack = historyIndex > 0
    const canGoForward = historyIndex < history.length - 1

    const clearLoadingTimeout = React.useCallback(() => {
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current)
            loadingTimeoutRef.current = null
        }
    }, [])

    const startLoading = React.useCallback(() => {
        clearLoadingTimeout()
        setIsLoading(true)
    }, [clearLoadingTimeout])

    const handleIframeLoad = React.useCallback(() => {
        clearLoadingTimeout()
        setIsLoading(false)

        // Try to read the iframe's current URL for in-iframe navigation
        try {
            const currentUrl = refIframe.current?.contentWindow?.location.href
            if (currentUrl && currentUrl !== 'about:blank') {
                const idx = historyIndexRef.current
                const hist = historyRef.current
                if (currentUrl !== hist[idx]) {
                    const newHistory = [...hist.slice(0, idx + 1), currentUrl]
                    setHistory(newHistory)
                    setHistoryIndex(idx + 1)
                    if (refAddressBar.current) {
                        refAddressBar.current.value = currentUrl
                    }
                    recordVisit(currentUrl)
                }
            }
        } catch {
            // Cross-origin: cannot read iframe URL
        }
    }, [clearLoadingTimeout])

    // Sync address bar and record default URL on mount
    React.useEffect(() => {
        if (refAddressBar.current) {
            refAddressBar.current.value = defaultUrl
        }
        recordVisit(defaultUrl)
    }, [])

    // Hide button labels when toolbar is narrow
    React.useEffect(() => {
        if (!refToolbar.current) return
        const observer = new ResizeObserver(([entry]) => {
            setIsCompact(entry.contentRect.width < 450)
        })
        observer.observe(refToolbar.current)
        return () => observer.disconnect()
    }, [])

    // Detect in-iframe clicks via window blur (cross-origin compatible)
    React.useEffect(() => {
        const handleWindowBlur = () => {
            if (document.activeElement === refIframe.current) {
                // Focus the browser window when the iframe is clicked
                desktopEventDispatch({
                    type: 'ClassicyWindowFocus',
                    app: { id: appId },
                    window: { id: 'browser' },
                })

                startLoading()
                // Reset after 10s if no load event fires (click wasn't a navigation)
                loadingTimeoutRef.current = setTimeout(() => {
                    setIsLoading(false)
                }, 10000)
            }
        }

        window.addEventListener('blur', handleWindowBlur)
        return () => {
            window.removeEventListener('blur', handleWindowBlur)
            clearLoadingTimeout()
        }
    }, [desktopEventDispatch, appId, startLoading, clearLoadingTimeout])

    const showError = () => {
        setUrlError(true)
        desktopEventDispatch({
            type: 'ClassicyWindowFocus',
            app: { id: appId },
            window: { id: 'browser_error' },
        })
    }

    const navigateTo = (url: string) => {
        startLoading()
        setHistory(prev => [...prev.slice(0, historyIndex + 1), url])
        setHistoryIndex(prev => prev + 1)
        setIframeSrc(sanitizeUrl(url))
        if (refAddressBar.current) {
            refAddressBar.current.value = url
        }
        recordVisit(url)
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
            navigateTo(value)
        } catch {
            showError()
        }
    }

    const goBack = () => {
        if (!canGoBack) return
        startLoading()
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setIframeSrc(sanitizeUrl(history[newIndex]))
        if (refAddressBar.current) {
            refAddressBar.current.value = history[newIndex]
        }
    }

    const goForward = () => {
        if (!canGoForward) return
        startLoading()
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setIframeSrc(sanitizeUrl(history[newIndex]))
        if (refAddressBar.current) {
            refAddressBar.current.value = history[newIndex]
        }
    }

    const quitApp = React.useCallback(() => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }, [desktopEventDispatch, appId, appName, appIcon])

    const appMenu = React.useMemo(() => [
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
    ], [appId, quitApp])

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
                <div ref={refToolbar} style={{backgroundColor: "var(--color-system-03)", display: "flex", flexDirection: "row"}}>
                    <div style={{minWidth: 0, flex: 1}}>
                        <div style={{display: "flex", flexDirection: "row", gap: "0.5em", alignItems: "center"}}>
                            <div style={{display: "flex", flexDirection: "row", flexShrink: 0}}>
                            <ClassicyButton onClickFunc={goBack} disabled={!canGoBack}>
                                <p style={{display: "flex", flexDirection: "row", margin: 0, padding: 0, opacity: canGoBack ? 1 : 0.4}}>
                                <img src={ClassicyIcons.applications.internetExplorer.backward}/>
                                    {!isCompact && <ClassicyControlLabel label='Back'></ClassicyControlLabel>}
                                </p>
                            </ClassicyButton>
                            <ClassicyButton buttonSize='medium' onClickFunc={goForward} disabled={!canGoForward}>
                                <p style={{display: "flex", flexDirection: "row", margin: 0, padding: 0, opacity: canGoForward ? 1 : 0.4}}>
                                    <img src={ClassicyIcons.applications.internetExplorer.forward} style={{width: "auto", height: "150%"}} />
                                    {!isCompact && <ClassicyControlLabel label='Forward'></ClassicyControlLabel>}
                                </p>
                            </ClassicyButton>
                            </div>
                            <div style={{minWidth: 0, flex: 1, display: "flex", flexDirection: "row", alignSelf: "center", gap: "4px", alignItems: "center"}}>
                                {!isCompact && <ClassicyControlLabel label="Address:" />}
                                <ClassicyInput id={'browserAddress'} ref={refAddressBar} backgroundColor="white" onEnterFunc={goBook}></ClassicyInput>
                            </div>
                            <ClassicyButton onClickFunc={goBook}>Go</ClassicyButton>
                        </div>
                    </div>
                    <img src={isLoading ? ClassicyIcons.applications.internetExplorer.loaderAnimated : ClassicyIcons.applications.internetExplorer.loader} style={{
                        aspectRatio: "1/1",
                        height: "38px",
                        boxShadow: "inset calc(var(--window-border-size) * -1) calc(var(--window-border-size) * -1) var(--color-system-03), inset calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-05), calc(var(--window-border-size) * 1) calc(var(--window-border-size) * 1) var(--color-system-06)"
                        }}/>
                </div>
                <iframe
                    ref={refIframe}
                    title="myBook"
                    src={iframeSrc}
                    height="720"
                    width="1280"
                    allowFullScreen={true}
                    onLoad={handleIframeLoad}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                    style={{ width: '100%', height: '100%', padding: '0', margin: '0' }}
                ></iframe>
            </ClassicyWindow>
        </ClassicyApp>
    )
}

export default Browser