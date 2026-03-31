import { ClassicyApp, ClassicyButton, ClassicyControlLabel, ClassicyIcons, ClassicyInput, ClassicyWindow, quitAppHelper, useAppManagerDispatch } from 'classicy'
import DOMPurify from 'dompurify'
import React from 'react'
import './browser.scss'
import { useBrowserNavigation } from './useBrowserNavigation'

interface ShadowLinkClick {
    href: string;
    rawHref: string;
}

const ShadowContent: React.FC<{ html: string; onLinkClick: (link: ShadowLinkClick) => void }> = ({ html, onLinkClick }) => {
    const hostRef = React.useRef<HTMLDivElement>(null)
    const shadowRef = React.useRef<ShadowRoot | null>(null)
    const onLinkClickRef = React.useRef(onLinkClick)
    onLinkClickRef.current = onLinkClick

    React.useEffect(() => {
        if (hostRef.current && !shadowRef.current) {
            shadowRef.current = hostRef.current.attachShadow({ mode: 'open' })
        }
        // No cleanup: ShadowRoot cannot be detached once attached (browser limitation)
    }, [])

    React.useEffect(() => {
        if (shadowRef.current) {
            shadowRef.current.innerHTML = DOMPurify.sanitize(html, { FORCE_BODY: true })
        }
    }, [html])

    React.useEffect(() => {
        const shadow = shadowRef.current
        if (!shadow) return
        const target = shadow as unknown as EventTarget
        const handler = (e: Event) => {
            const mouseEvent = e as MouseEvent
            const clickTarget = mouseEvent.composedPath()[0] as HTMLElement | undefined
            if (!clickTarget) return
            const anchor = clickTarget.closest?.('a')
            if (!anchor) return
            mouseEvent.preventDefault()
            onLinkClickRef.current({
                href: anchor.href,
                rawHref: anchor.getAttribute('href') || '',
            })
        }
        target.addEventListener('click', handler)
        return () => target.removeEventListener('click', handler)
    }, [])

    return <div ref={hostRef} className="browserPage" />
}

const Browser = () => {
    const appName = 'Browser'
    const appId = 'Browser.app'
    const appIcon = ClassicyIcons.applications.internetExplorer.app

    const desktopEventDispatch = useAppManagerDispatch()

    const defaultUrl = 'http://www.apple.com/'

    const [urlError, setUrlError] = React.useState(false)
    const refAddressBar = React.useRef<HTMLInputElement>(null)
    const refToolbar = React.useRef<HTMLDivElement>(null)
    const [isCompact, setIsCompact] = React.useState(false)

    const showError = React.useCallback(() => {
        setUrlError(true)
        desktopEventDispatch({
            type: 'ClassicyWindowFocus',
            app: { id: appId },
            window: { id: 'browser_error' },
        })
    }, [desktopEventDispatch, appId])

    const {
        htmlContent,
        pageTitle,
        addressBarValue,
        setAddressBarValue,
        isLoading,
        statusText,
        canGoBack,
        canGoForward,
        goTo,
        goBack,
        goForward,
        refresh,
        handleContentClick,
    } = useBrowserNavigation({ defaultUrl, onShowError: showError })

    // Hide button labels when toolbar is narrow
    React.useEffect(() => {
        if (!refToolbar.current) return
        const observer = new ResizeObserver(([entry]) => {
            setIsCompact(entry.contentRect.width < 450)
        })
        observer.observe(refToolbar.current)
        return () => observer.disconnect()
    }, [])

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
                title={pageTitle || appName}
                appId={appId}
                scrollable={false}
                initialSize={[100, 500]}
                initialPosition={[100, 100]}
                appMenu={appMenu}
                growable={true}
            >
                <div className="browser">
                <div className="browserToolbar" ref={refToolbar}>
                    <div className="browserToolbarInner">
                        <div className="browserToolbarControls">
                            <div className="browserNavButtons">
                            <ClassicyButton onClickFunc={goBack} disabled={!canGoBack}>
                                <div className={`browserNavButtonContent browserHoverSwap${!canGoBack ? ' browserNavButtonContentDisabled' : ''}`}>
                                    <img src={ClassicyIcons.applications.internetExplorer.backward} className="browserIconDefault"/>
                                    <img src={ClassicyIcons.applications.internetExplorer.backwardOn} className="browserIconHover"/>
                                    {!isCompact && <ClassicyControlLabel label='Back'></ClassicyControlLabel>}
                                </div>
                            </ClassicyButton>
                            <ClassicyButton buttonSize='medium' onClickFunc={goForward} disabled={!canGoForward}>
                                <div className={`browserNavButtonContent browserHoverSwap${!canGoForward ? ' browserNavButtonContentDisabled' : ''}`}>
                                    <img src={ClassicyIcons.applications.internetExplorer.forward} className="browserIconDefault" />
                                    <img src={ClassicyIcons.applications.internetExplorer.forwardOn} className="browserIconHover" />
                                    {!isCompact && <ClassicyControlLabel label='Forward'></ClassicyControlLabel>}
                                </div>
                            </ClassicyButton>
                            </div>
                            <div className="browserAddressBar">
                                {!isCompact && <ClassicyControlLabel label="Address:" />}
                                <ClassicyInput id={'browserAddress'} ref={refAddressBar} prefillValue={addressBarValue} onChangeFunc={(e) => setAddressBarValue(e.target.value)} backgroundColor="white" onEnterFunc={goTo}></ClassicyInput>
                            </div>
                            <ClassicyButton onClickFunc={refresh}>
                                <div className="browserNavButtonContent browserHoverSwap">
                                    <img src={ClassicyIcons.applications.internetExplorer.refresh} className="browserIconDefault" />
                                    <img src={ClassicyIcons.applications.internetExplorer.refreshOn} className="browserIconHover" />
                                    {!isCompact && <ClassicyControlLabel label='Refresh'></ClassicyControlLabel>}
                                </div>
                            </ClassicyButton>
                            <ClassicyButton onClickFunc={goTo}>Go</ClassicyButton>
                        </div>
                    </div>
                    <img src={isLoading ? ClassicyIcons.applications.internetExplorer.loaderAnimated : ClassicyIcons.applications.internetExplorer.loader} className="browserLoaderIcon"/>
                </div>
                <div className="browserContents">
                    <ShadowContent html={htmlContent} onLinkClick={handleContentClick} />
                </div>
                <div className="browserStatusBar">
                    {statusText}
                </div>
                </div>
            </ClassicyWindow>
        </ClassicyApp>
    )
}

export default Browser