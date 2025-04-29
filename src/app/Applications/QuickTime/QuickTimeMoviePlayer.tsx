import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import quickTimeStyles from '@/app/Applications/QuickTime/QuickTime.module.scss'
import screenfull from 'screenfull'

export type QuickTimeDocument = {
    url: string
    name?: string
    type?: string
    options?: Record<string, any>
}

const QuickTimeMoviePlayer: React.FC = () => {
    const appName = 'QuickTime Player'
    const appId = 'QuickTime Player.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/quicktime/player.png`

    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

    const testingDocuments = [
        {
            url: 'https://cdn1.911realtime.org/transcoded/newsw/2001-09-11/NEWSW_20010911_040000_The_National.m3u8',
            name: 'Buck Bunny',
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
        },
    ]

    const [openDocuments, setOpenDocuments] = React.useState<QuickTimeDocument[]>(testingDocuments)

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
        <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'}>
            {openDocuments.map((doc: QuickTimeDocument) => (
                <ClassicyWindow
                    key={doc.name + '_' + doc.url}
                    id={appId + '_VideoPlayer_' + doc.name}
                    title={doc.name}
                    minimumSize={[225, 0]}
                    appId={appId}
                    closable={true}
                    resizable={true}
                    zoomable={true}
                    scrollable={false}
                    collapsable={true}
                    initialSize={[400, 0]}
                    initialPosition={[300, 50]}
                    modal={true}
                    appMenu={appMenu}
                >
                    <QuickTimeVideoEmbed
                        appId={appId}
                        name={doc.name}
                        url={doc.url}
                        options={doc.options}
                        type={doc.type}
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
}

const QuickTimeVideoEmbed: React.FC<QuickTimeVideoEmbed> = ({ appId, name, url, options, type }) => {
    const desktop = useDesktop()

    const playerRef = React.useRef(null)
    const [playing, setPlaying] = React.useState(false)
    const [volume, setVolume] = React.useState(0.5)
    const [played, setPlayed] = React.useState(0)
    const [loop, setLoop] = React.useState(false)
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    React.useEffect(() => {
        if (screenfull.isEnabled) {
            screenfull.on('change', () => {
                setIsFullscreen(isFullscreen)
            })
        }
    }, [])
    const handlePlayPause = React.useCallback(() => {
        setPlaying((prev) => !prev)
    }, [playing])

    const seekForward = () => {
        playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10)
    }

    const seekBackward = () => {
        playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10)
    }

    const toggleFullscreen = () => {
        if (!screenfull.isEnabled) {
            return
        }
        screenfull.toggle(playerRef.current.getInternalPlayer(), { navigationUI: 'hide' })
    }

    const escapeFullscreen = () => {
        if (!screenfull.isEnabled) {
            return
        }
        screenfull.exit()
    }

    React.useEffect(() => {
        const handleKeyDown = (event) => {
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
    }, [handlePlayPause, seekForward, seekBackward, toggleFullscreen])

    const handleClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        alert('Input was clicked!')
    }

    const [showVolume, setShowVolume] = useState<boolean>(false)

    const volumeButtonRef = useRef(null)

    const getVolumeIcon = () => {
        if (volume === 0) {
            return 'sound-off.png'
        } else if (volume > 0 && volume < 0.3) {
            return 'sound-33.png'
        } else if (volume > 0.3 && volume < 0.7) {
            return 'sound-66.png'
        }
        return 'sound-on.png'
    }

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
                    onProgress={({ played }) => setPlayed(played)}
                    config={{ file: options }}
                />
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
                        className={quickTimeStyles.quickTimePlayerVideoControlsProgressBar}
                        key={appId + '_' + name + '_progressBar'}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={played}
                        readOnly={true}
                    />
                </div>
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
                            id="volume"
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
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/sound-manager/${getVolumeIcon()}`}
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
