import ccIcon from "@img/icons/system/quicktime/cc.png";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./QuickTimeMovieEmbed.scss";
import backwardButton from "@img/icons/system/quicktime/backward-button.svg";
import forwardButton from "@img/icons/system/quicktime/forward-button.svg";
import fullscreenButton from "@img/icons/system/quicktime/fullscreen-button.svg";
import pauseButton from "@img/icons/system/quicktime/pause-button.svg";
import playButton from "@img/icons/system/quicktime/play-button.svg";
import { parse } from "@plussub/srt-vtt-parser";
import type { ParsedResult } from "@plussub/srt-vtt-parser/dist/types";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import ReactPlayer from "react-player";
import screenfull from "screenfull";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";
import { getVolumeIcon, timeFriendly } from "./QuickTimeUtils";

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

export const QuickTimeVideoEmbed: FunctionalComponent<QuickTimeVideoEmbed> = ({
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
	const appWindows = useAppManager(
		(s) => s.System.Manager.App.apps[appId]?.windows,
	);

	const [playing, setPlaying] = useState(autoPlay);
	const [volume, setVolume] = useState(0.5);
	const [loop, setLoop] = useState(false);
	const [_isFullscreen, setIsFullscreen] = useState(false);
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
	}, []);

	const seekTo = (seconds: number) => {
		if (playerRef.current) {
			playerRef.current.currentTime = seconds;
		}
	};

	const seekForward = useCallback(() => {
		seekTo((playerRef.current?.currentTime || 0) + 10);
		// biome-ignore lint/correctness/useExhaustiveDependencies: playerRef is a ref; including it would cause infinite re-renders
	}, [seekTo]);

	const seekBackward = useCallback(() => {
		seekTo((playerRef.current?.currentTime || 0) - 10);
		// biome-ignore lint/correctness/useExhaustiveDependencies: playerRef is a ref; including it would cause infinite re-renders
	}, [seekTo]);

	const seekToPct = (pct: number) => {
		if (playerRef.current) {
			playerRef.current.currentTime = pct * playerRef.current.duration;
		}
	};

	const escapeFullscreen = useCallback(() => {
		if (!screenfull.isEnabled) {
			return;
		}
		screenfull.exit();
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!appWindows) {
				return;
			}
			const a = appWindows.find((w) => w.id === `${appId}_MoviePlayer_${url}`);
			if (!a?.focused) {
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
					if (type !== "audio") {
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
		appWindows,
		seekForward,
		seekBackward,
		toggleFullscreen,
		type,
		loop,
		appId,
		url,
		escapeFullscreen,
	]);

	const volumeButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!subtitlesUrl || !isValidHttpUrl(subtitlesUrl)) {
			return;
		}
		const controller = new AbortController();
		fetch(subtitlesUrl, { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.text();
			})
			.then((text) => parse(text))
			.then((result) => setSubtitlesData(result))
			.catch((error) => {
				if (error.name === "AbortError") return;
				console.error("[QuickTime] Subtitle fetch failed", {
					subtitlesUrl,
					error,
				});
				setSubtitlesData(null);
			});
		return () => controller.abort();
	}, [subtitlesUrl]);

	return (
		<div
			className={classNames(
				"quickTimePlayerWrapper",
				controlsDocked && "quickTimePlayerWrapperDocked",
			)}
		>
			<div
				className={classNames(
					"quickTimePlayerVideoHolder",
					controlsDocked
						? "quickTimePlayerVideoHolderDocked"
						: "quickTimePlayerVideoHolderUndocked",
				)}
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
				{(() => {
					if (!showSubtitles || !subtitlesData?.entries?.length) return null;
					const currentTime = (playerRef.current?.currentTime || 0) * 1000;
					const currentEntry = subtitlesData.entries.find(
						(i) => i.from < currentTime && i.to > currentTime,
					);
					if (!currentEntry) return null;
					return (
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
								{currentEntry.text}
							</div>
						</div>
					);
				})()}
			</div>
			{!hideControls && (
				<div
					className={classNames(
						"quickTimePlayerVideoControlsHolder",
						controlsDocked
							? "quickTimePlayerVideoControlsHolderDocked"
							: "quickTimePlayerVideoControlsHolderUndocked",
					)}
				>
					<button
						type="button"
						onClick={handlePlayPause}
						className={"quickTimePlayerVideoControlsButton"}
					>
						<img
							className={"quickTimePlayerVideoControlsIcon"}
							src={playing ? pauseButton : playButton}
							alt={playing ? "Pause" : "Play"}
						/>
					</button>
					<div className={"quickTimePlayerVideoControlsProgressBarHolder"}>
						<input
							id={`${appId}_${name}_progressBar`}
							className={"quickTimePlayerVideoControlsProgressBar"}
							key={`${appId}_${name}_progressBar`}
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
						type="button"
						onClick={seekBackward}
						className={"quickTimePlayerVideoControlsButton"}
					>
						<img
							className={"quickTimePlayerVideoControlsIcon"}
							src={backwardButton}
							alt="Seek backward 10 seconds"
						/>
					</button>
					<button
						type="button"
						onClick={seekForward}
						className={"quickTimePlayerVideoControlsButton"}
					>
						<img
							className={"quickTimePlayerVideoControlsIcon"}
							src={forwardButton}
							alt="Seek forward 10 seconds"
						/>
					</button>
					{subtitlesUrl && (
						<button
							type="button"
							onClick={toggleCC}
							className={"quickTimePlayerVideoControlsButton"}
						>
							<img
								className={"quickTimePlayerVideoControlsIcon"}
								src={ccIcon}
								alt={
									showSubtitles
										? "Hide closed captions"
										: "Show closed captions"
								}
							/>
						</button>
					)}

					{showVolume && (
						<div className={"quickTimePlayerVolumePopup"}>
							<input
								className={"quickTimePlayerVideoControlsVolumeBar"}
								id={`${url}_volume`}
								type="range"
								min="0"
								max="1"
								step="0.1"
								style={{ left: volumeButtonRef.current?.offsetLeft }}
								value={volume}
								onClick={() => {
									setShowVolume(false);
								}}
								onChange={(e) => {
									setVolume(parseFloat(e.target.value));
								}}
							/>
						</div>
					)}
					<button
						type="button"
						className={"quickTimePlayerVideoControlsButton"}
						onClick={() => setShowVolume(!showVolume)}
						ref={volumeButtonRef}
					>
						<img
							src={`/assets/img/icons/control-panels/sound-manager/${getVolumeIcon(volume)}`}
							className={"quickTimePlayerVideoControlsIcon"}
							alt="Volume"
						/>
					</button>
					{type !== "audio" && (
						<button
							type="button"
							onClick={toggleFullscreen}
							className={"quickTimePlayerVideoControlsButton"}
						>
							<img
								className={"quickTimePlayerVideoControlsIcon"}
								src={fullscreenButton}
								alt="Enter fullscreen"
							/>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
