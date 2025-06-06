import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import quickTimeStyles from '@/app/Applications/QuickTime/QuickTime.module.scss'
import screenfull from 'screenfull'
import { parse } from '@plussub/srt-vtt-parser'
import { getVolumeIcon, timeFriendly } from './QuickTimeUtils'

export type QuickTimeDocument = {
    url: string
    name?: string
    type?: string
    icon?: string
    options?: Record<string, any>
    subtitlesUrl?: string
}

export const QuickTimeAppInfo = {
    name: 'QuickTime Player',
    id: 'QuickTime.app',
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/player.png`,
}

const QuickTimeMoviePlayer: React.FC = () => {
    const { name: appName, id: appId, icon: appIcon } = QuickTimeAppInfo

    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

    const defaultDocumentIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/movie.png`

    // Load Default Demo documents on open
    useEffect(() => {
        const appData = desktop.System.Manager.App.apps[appIndex]?.data || {}
        if (!appData['openDocuments'] || appData['openDocuments'].length === 0) {
            console.log('set default')
            const defaultDocs = [
                {
                    url: 'https://cdn1.911realtime.org/transcoded/newsw/2001-09-11/NEWSW_20010911_040000_The_National.m3u8',
                    name: 'Buck Bunny',
                    icon: defaultDocumentIcon,
                    options: {
                        forceHLS: true,
                        forceSafariHLS: false,
                    },
                    type: 'video',
                },
                {
                    url: 'http://www.samisite.com/sound/cropShadesofGrayMonkees.mp3',
                    name: 'Monkees',
                    type: 'audio',
                    icon: defaultDocumentIcon,
                    subtitlesUrl: `${process.env.NEXT_PUBLIC_BASE_PATH}/test.srt`,
                },
            ]
            desktopEventDispatch({
                type: 'ClassicyAppQuickTimeOpenDocuments',
                documents: defaultDocs,
                debug: true,
            })
        } else {
            desktopEventDispatch({
                type: 'ClassicyAppQuickTimeOpenDocuments',
                documents: appData['openDocuments'],
                debug: true,
            })
        }
    }, [])

    const appIndex = desktop.System.Manager.App.apps.findIndex((app) => app.id === appId)
    const openDocuments = desktop.System.Manager.App.apps[appIndex]?.data['openFiles']

    const openUrl = (name: string, url: string, iconUrl?: string) => {
        desktopEventDispatch({
            type: 'ClassicyAppQuickTimeOpenDocument',
            document: { name, url: url, icon: iconUrl || defaultDocumentIcon },
        })

        const windowIndex = desktop.System.Manager.App.apps[appIndex].windows.findIndex(
            (w) => w.id === appId + '_VideoPlayer_' + url
        )
        const ws = desktop.System.Manager.App.apps[appIndex].windows[windowIndex]
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
        <ClassicyApp id={appId} name={appName} icon={appIcon}>
            {Array.isArray(openDocuments) &&
                openDocuments.length > 0 &&
                openDocuments.map((doc: QuickTimeDocument) => (
                    <ClassicyWindow
                        key={doc.name + '_' + doc.url}
                        id={appId + '_VideoPlayer_' + doc.url}
                        title={doc.name}
                        icon={doc.icon || undefined}
                        minimumSize={[300, 60]}
                        appId={appId}
                        closable={true}
                        resizable={true}
                        zoomable={true}
                        scrollable={false}
                        collapsable={false}
                        initialSize={[400, 100]}
                        initialPosition={[300, 50]}
                        modal={true}
                        appMenu={appMenu}
                        onCloseFunc={() =>
                            desktopEventDispatch({
                                type: 'ClassicyAppQuickTimeCloseDocument',
                                document: doc,
                            })
                        }
                    >
                        <QuickTimeVideoEmbed
                            appId={appId}
                            name={doc.name}
                            url={doc.url}
                            options={doc.options}
                            type={doc.type}
                            subtitlesUrl={doc.subtitlesUrl}
                        />
                    </ClassicyWindow>
                ))}
        </ClassicyApp>
    )
}

export default QuickTimeMoviePlayer

type QuickTimeVideoEmbed = {
    appId: string
    name: string
    url: string
    type: string
    options: {}
    subtitlesUrl?: string
}

const QuickTimeVideoEmbed: React.FC<QuickTimeVideoEmbed> = ({ appId, name, url, options, type, subtitlesUrl }) => {
    const desktop = useDesktop()

    const [playing, setPlaying] = useState(false)
    const [volume, setVolume] = useState(0.5)
    const [loop, setLoop] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showVolume, setShowVolume] = useState<boolean>(false)
    const [subtitlesData, setSubtitlesData] = useState(null)
    const [showSubtitles, setShowSubtitles] = useState(false)

    const playerRef = useRef(null)

    useEffect(() => {
        if (screenfull.isEnabled) {
            screenfull.on('change', () => {
                setIsFullscreen(isFullscreen)
            })
        }
    })

    const toggleCC = useCallback(() => {
        setShowSubtitles((prev) => !prev)
    }, [])

    const handlePlayPause = useCallback(() => {
        setPlaying((prev) => !prev)
    }, [])

    const seekForward = useCallback(() => {
        seekTo(playerRef.current.getCurrentTime() + 10)
    }, [playerRef])

    const seekBackward = useCallback(() => {
        seekTo(playerRef.current.getCurrentTime() - 10)
    }, [playerRef])

    const toggleFullscreen = useCallback(() => {
        if (!screenfull.isEnabled) {
            return
        }
        screenfull.toggle(playerRef.current.getInternalPlayer(), { navigationUI: 'hide' })
    }, [playerRef])

    const seekTo = (seconds: number) => {
        playerRef.current.seekTo(seconds)
    }

    const seekToPct = (pct: number) => {
        playerRef.current.seekTo(pct * playerRef.current.getDuration())
    }

    const escapeFullscreen = () => {
        if (!screenfull.isEnabled) {
            return
        }
        screenfull.exit()
    }

    useEffect(() => {
        const handleKeyDown = (event) => {
            const appIndex = desktop.System.Manager.App.apps.findIndex((app) => app.id === appId)
            const { windows } = desktop.System.Manager.App.apps[appIndex]
            const a = windows.find((w) => (w.id = appId + '_VideoPlayer_' + url))
            if (!a.focused) {
                return
            }
            switch (event.key) {
                case ' ':
                    handlePlayPause()
                    event.preventDefault()
                    break
                case 'Escape':
                    escapeFullscreen()
                    break
                case 'ArrowRight':
                    seekForward()
                    break
                case 'ArrowLeft':
                    seekBackward()
                    break
                case 'f':
                case 'F':
                    if (type != 'audio') {
                        toggleFullscreen()
                    }
                    break
                case 'l':
                case 'L':
                    setLoop(!loop)
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handlePlayPause, seekForward, seekBackward, toggleFullscreen, type, loop])

    const volumeButtonRef = useRef(null)

    useEffect(() => {
        if (!subtitlesUrl) return
        fetch(subtitlesUrl)
            .then((res) => res.text())
            .then((text) => parse(text))
            .then(setSubtitlesData)
            .catch(() => setSubtitlesData(null))
    }, [subtitlesUrl])

    return (
        <div className={quickTimeStyles.quickTimePlayerWrapper}>
            <div className={quickTimeStyles.quickTimePlayerVideoHolder}>
                <ReactPlayer
                    ref={playerRef}
                    url={url}
                    playing={playing}
                    loop={loop}
                    controls={false}
                    playsinline={true}
                    width="100%"
                    height="100%"
                    volume={volume}
                    config={{ file: options }}
                />
                <Suspense>
                    {showSubtitles &&
                        subtitlesData?.entries?.length > 0 &&
                        subtitlesData.entries.find((i) => {
                            const time = playerRef.current?.getCurrentTime() * 1000
                            return i.from < time && i.to > time
                        }) && (
                            <div
                                className={
                                    quickTimeStyles.quickTimePlayerCaptionsHolder +
                                    ' ' +
                                    quickTimeStyles.quickTimePlayerCaptionsHolderBottom +
                                    ' ' +
                                    quickTimeStyles.quickTimePlayerCaptionsHolderCenter
                                }
                            >
                                <div className={quickTimeStyles.quickTimePlayerCaptions}>
                                    {
                                        subtitlesData.entries.find((i) => {
                                            const time = playerRef.current?.getCurrentTime() * 1000
                                            return i.from < time && i.to > time
                                        })?.text
                                    }
                                </div>
                            </div>
                        )}
                </Suspense>
            </div>
            <div className={quickTimeStyles.quickTimePlayerVideoControlsHolder}>
                <button onClick={handlePlayPause} className={quickTimeStyles.quickTimePlayerVideoControlsButton}>
                    <img
                        className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/${playing ? 'pause' : 'play'}-button.svg`}
                    />
                </button>
                <div className={quickTimeStyles.quickTimePlayerVideoControlsProgressBarHolder}>
                    <input
                        id={appId + '_' + name + '_progressBar'}
                        className={quickTimeStyles.quickTimePlayerVideoControlsProgressBar}
                        key={appId + '_' + name + '_progressBar'}
                        type="range"
                        min="0"
                        max="1"
                        step="0.001"
                        value={playerRef.current?.getCurrentTime() / playerRef.current?.getDuration()}
                        readOnly={false}
                        onChange={(e) => {
                            e.preventDefault()
                            seekToPct(parseFloat(e.target.value))
                        }}
                    />
                </div>
                <p className={quickTimeStyles.quickTimePlayerVideoControlsTime}>
                    {timeFriendly(playerRef.current?.getCurrentTime())}
                </p>
                <button onClick={seekBackward} className={quickTimeStyles.quickTimePlayerVideoControlsButton}>
                    <img
                        className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/backward-button.svg`}
                    />
                </button>
                <button onClick={seekForward} className={quickTimeStyles.quickTimePlayerVideoControlsButton}>
                    <img
                        className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/forward-button.svg`}
                    />
                </button>
                {subtitlesUrl && (
                    <button onClick={toggleCC} className={quickTimeStyles.quickTimePlayerVideoControlsButton}>
                        <img
                            className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/CC.png`}
                        />
                    </button>
                )}

                {showVolume && (
                    <div
                        style={{
                            zIndex: 999999,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <input
                            className={quickTimeStyles.quickTimePlayerVideoControlsVolumeBar}
                            id={url + '_volume'}
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            style={{
                                left: volumeButtonRef.current.left,
                            }}
                            value={1 - volume}
                            onClick={() => {
                                setShowVolume(false)
                            }}
                            onChange={(e) => {
                                setVolume(1 - parseFloat(e.target.value))
                            }}
                        />
                    </div>
                )}
                <button
                    className={quickTimeStyles.quickTimePlayerVideoControlsButton}
                    onClick={() => setShowVolume(!showVolume)}
                    ref={volumeButtonRef}
                >
                    <img
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/${getVolumeIcon(volume)}`}
                        className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                    />
                </button>
                {type != 'audio' && (
                    <button onClick={toggleFullscreen} className={quickTimeStyles.quickTimePlayerVideoControlsButton}>
                        <img
                            className={quickTimeStyles.quickTimePlayerVideoControlsIcon}
                            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/fullscreen-button.svg`}
                        />
                    </button>
                )}
            </div>
        </div>
    )
}
