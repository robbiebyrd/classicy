import ccIcon from "@img/icons/system/quicktime/cc.png";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./QuickTimeMovieEmbed.scss";
import { parse } from "@plussub/srt-vtt-parser";
import { ParsedResult } from "@plussub/srt-vtt-parser/dist/types";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player";
import screenfull from "screenfull";
import { getVolumeIcon, timeFriendly } from "./QuickTimeUtils";
import playButton from "@img/icons/system/quicktime/play-button.svg";
import pauseButton from "@img/icons/system/quicktime/pause-button.svg";
import backwardButton from "@img/icons/system/quicktime/backward-button.svg";
import forwardButton from "@img/icons/system/quicktime/forward-button.svg";
import fullscreenButton from "@img/icons/system/quicktime/forward-button.svg";

type QuickTimeVideoEmbed = {
  appId: string;
  name: string;
  url: string;
  type: "audio" | "video";
  options?: object;
  subtitlesUrl?: string;
  autoPlay?: boolean;
  hideControls?: boolean;
  controlsDocked?: boolean;
  muted?: boolean;
};

export const QuickTimeVideoEmbed: React.FC<QuickTimeVideoEmbed> = ({
  appId,
  name,
  url,
  options,
  type,
  subtitlesUrl,
  autoPlay,
  hideControls,
  controlsDocked,
  muted,
}) => {
  const desktop = useAppManager();

  const [playing, setPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(0.5);
  const [loop, setLoop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolume, setShowVolume] = useState<boolean>(false);
  const [subtitlesData, setSubtitlesData] = useState<ParsedResult | null>(null);
  const [showSubtitles, setShowSubtitles] = useState(false);

  const playerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (screenfull.isEnabled) {
      const handleFullscreenChange = () => {
        setIsFullscreen(screenfull.isFullscreen);
      };
      screenfull.on("change", handleFullscreenChange);
      
      return () => {
        screenfull.off("change", handleFullscreenChange);
      };
    }
  }, []);

  const toggleCC = useCallback(() => {
    setShowSubtitles((prev) => !prev);
  }, []);

  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (screenfull.isEnabled && playerRef.current) {
      screenfull.toggle(playerRef.current, { navigationUI: "hide" });
    }
    return;
  }, [playerRef]);

  const seekTo = (seconds: number) => {
    playerRef.current?.fastSeek(seconds);
  };

  const seekForward = useCallback(() => {
    seekTo((playerRef.current?.currentTime || 0) + 10);
  }, [playerRef]);

  const seekBackward = useCallback(() => {
    seekTo((playerRef.current?.currentTime || 0) - 10);
  }, [playerRef]);

  const seekToPct = (pct: number) => {
    playerRef.current?.fastSeek(pct * playerRef.current?.duration);
  };

  const escapeFullscreen = () => {
    if (!screenfull.isEnabled) {
      return;
    }
    screenfull.exit();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { windows } = desktop.System.Manager.App.apps[appId];
      const a = windows.find((w) => (w.id = appId + "_VideoPlayer_" + url));
      if (!a || !a.focused) {
        return;
      }
      switch (event.key) {
        case " ":
          handlePlayPause();
          event.preventDefault();
          break;
        case "Escape":
          escapeFullscreen();
          break;
        case "ArrowRight":
          seekForward();
          break;
        case "ArrowLeft":
          seekBackward();
          break;
        case "f":
        case "F":
          if (type != "audio") {
            toggleFullscreen();
          }
          break;
        case "l":
        case "L":
          setLoop(!loop);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handlePlayPause,
    desktop.System.Manager.App.apps,
    seekForward,
    seekBackward,
    toggleFullscreen,
    type,
    loop,
    appId,
    url,
  ]);

  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!subtitlesUrl) {
      return;
    }

    fetch(subtitlesUrl)
      .then((res) => res.text())
      .then((text) => parse(text))
      .then((text) => setSubtitlesData(text))
      .catch(() => setSubtitlesData(null));
  }, [subtitlesUrl]);

  return (
    <div
      className={"quickTimePlayerWrapper"}
      style={{
        height: controlsDocked
          ? "calc(100% - var(--window-control-size) * 1)"
          : "100%",
      }}
    >
      <div
        className={"quickTimePlayerVideoHolder"}
        style={{
          height: controlsDocked
            ? "calc(100% - var(--window-control-size) * 1)"
            : "calc(100% - var(--window-border-size) * 4)",
        }}
      >
        <ReactPlayer
          ref={playerRef}
          src={url}
          playing={playing}
          loop={loop}
          controls={false}
          width="100%"
          height="100%"
          volume={muted ? 0 : volume}
          config={options}
        />
        <Suspense>
          {showSubtitles &&
            subtitlesData?.entries &&
            subtitlesData?.entries?.length > 0 &&
            subtitlesData.entries.find((i) => {
              const time = (playerRef.current?.currentTime || 0) * 1000;
              return i.from < time && i.to > time;
            }) && (
              <div
                className={
                  "quickTimePlayerCaptionsHolder" +
                  " " +
                  "quickTimePlayerCaptionsHolderBottom" +
                  " " +
                  "quickTimePlayerCaptionsHolderCenter"
                }
              >
                <div className={"quickTimePlayerCaptions"}>
                  {
                    subtitlesData.entries.find((i) => {
                      const time = (playerRef.current?.currentTime || 0) * 1000;
                      return i.from < time && i.to > time;
                    })?.text
                  }
                </div>
              </div>
            )}
        </Suspense>
      </div>
      {!hideControls && (
        <div
          className={"quickTimePlayerVideoControlsHolder"}
          style={{ position: controlsDocked ? "absolute" : "relative" }}
        >
          <button
            onClick={handlePlayPause}
            className={"quickTimePlayerVideoControlsButton"}
          >
            <img
              className={"quickTimePlayerVideoControlsIcon"}
              src={`url('${playing ? playButton : pauseButton})`}
            />
          </button>
          <div className={"quickTimePlayerVideoControlsProgressBarHolder"}>
            <input
              id={appId + "_" + name + "_progressBar"}
              className={"quickTimePlayerVideoControlsProgressBar"}
              key={appId + "_" + name + "_progressBar"}
              type="range"
              min="0" // Zero percent
              max="1" // 100 percent
              step="0.001" // 1 percent
              value={
                (playerRef.current?.currentTime || 0) /
                (playerRef.current?.duration || 1)
              }
              readOnly={false}
              onChange={(e) => {
                seekToPct(parseFloat(e.target.value));
              }}
            />
          </div>
          <p className={"quickTimePlayerVideoControlsTime"}>
            {timeFriendly(playerRef.current?.currentTime || 0)}
          </p>
          <button
            onClick={seekBackward}
            className={"quickTimePlayerVideoControlsButton"}
          >
            <img
              className={"quickTimePlayerVideoControlsIcon"}
              src={`url('${backwardButton}')`}
            />
          </button>
          <button
            onClick={seekForward}
            className={"quickTimePlayerVideoControlsButton"}
          >
            <img
              className={"quickTimePlayerVideoControlsIcon"}
              src={`url('${forwardButton}')`}
            />
          </button>
          {subtitlesUrl && (
            <button
              onClick={toggleCC}
              className={"quickTimePlayerVideoControlsButton"}
            >
              <img
                className={"quickTimePlayerVideoControlsIcon"}
                src={ccIcon}
              />
            </button>
          )}

          {showVolume && (
            <div
              style={{
                zIndex: 999999,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <input
                className={"quickTimePlayerVideoControlsVolumeBar"}
                id={url + "_volume"}
                type="range"
                min="0"
                max="1"
                step="0.1"
                style={{
                  left: volumeButtonRef.current?.offsetLeft,
                }}
                value={1 - volume}
                onClick={() => {
                  setShowVolume(false);
                }}
                onChange={(e) => {
                  setVolume(1 - parseFloat(e.target.value));
                }}
              />
            </div>
          )}
          <button
            className={"quickTimePlayerVideoControlsButton"}
            onClick={() => setShowVolume(!showVolume)}
            ref={volumeButtonRef}
          >
            <img
              src={`/assets/img/icons/control-panels/sound-manager/${getVolumeIcon(volume)}`}
              className={"quickTimePlayerVideoControlsIcon"}
            />
          </button>
          {type != "audio" && (
            <button
              onClick={toggleFullscreen}
              className={"quickTimePlayerVideoControlsButton"}
            >
              <img
                className={"quickTimePlayerVideoControlsIcon"}
                src={`url(${fullscreenButton})`}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
