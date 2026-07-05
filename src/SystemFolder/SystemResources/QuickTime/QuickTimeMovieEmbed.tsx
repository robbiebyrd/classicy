import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./QuickTimeMovieEmbed.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	type QuickTimeCaptionStyle,
	QuickTimeCaptionsOverlay,
} from "@/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay";
import { QuickTimeFullscreenButton } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeFullscreenButton";
import { QuickTimePlayPauseButton } from "@/SystemFolder/SystemResources/QuickTime/QuickTimePlayPauseButton";
import { QuickTimeSeekBar } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeSeekBar";
import { QuickTimeVolumeControl } from "@/SystemFolder/SystemResources/QuickTime/QuickTimeVolumeControl";
import { useControllableState } from "@/SystemFolder/SystemResources/QuickTime/useControllableState";
import { useQuickTimePlayback } from "@/SystemFolder/SystemResources/QuickTime/useQuickTimePlayback";
import { useQuickTimeSubtitles } from "@/SystemFolder/SystemResources/QuickTime/useQuickTimeSubtitles";

const ccIcon = ClassicyIcons.system.quicktime.cc;

type QuickTimeVideoEmbedProps = {
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
	playing?: boolean;
	onPlayingChange?: (playing: boolean) => void;
	volume?: number;
	onVolumeChange?: (volume: number) => void;
	captionsEnabled?: boolean;
	onCaptionsEnabledChange?: (enabled: boolean) => void;
	captionStyle?: QuickTimeCaptionStyle;
	onMediaElement?: (el: HTMLVideoElement | null) => void;
	onReady?: () => void;
	onWaiting?: () => void;
	onPlaying?: () => void;
	crossOrigin?: "" | "anonymous" | "use-credentials";
	playsInline?: boolean;
};

export const QuickTimeVideoEmbed: FunctionalComponent<
	QuickTimeVideoEmbedProps
> = ({
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
	playing: playingProp,
	onPlayingChange,
	volume: volumeProp,
	onVolumeChange,
	captionsEnabled,
	onCaptionsEnabledChange,
	captionStyle,
	onMediaElement,
	onReady,
	onWaiting,
	onPlaying,
	crossOrigin,
	playsInline,
}) => {
	const appWindows = useAppManager(
		(s) => s.System.Manager.Applications.apps[appId]?.windows,
	);

	const playback = useQuickTimePlayback({
		autoPlay,
		playing: playingProp,
		onPlayingChange,
		volume: volumeProp,
		onVolumeChange,
		onMediaElement,
	});
	const { activeCueText } = useQuickTimeSubtitles(subtitlesUrl);
	const [showSubtitles, setShowSubtitles] = useControllableState<boolean>(
		captionsEnabled,
		false,
		onCaptionsEnabledChange,
	);

	const toggleCC = useCallback(() => {
		setShowSubtitles((prev) => !prev);
	}, [setShowSubtitles]);

	const {
		attachMediaRef,
		playerRef,
		playing,
		handlePlayPause,
		volume,
		setVolume,
		loop,
		setLoop,
		currentTime,
		handleTimeUpdate,
		seekForward,
		seekBackward,
		seekToPct,
		toggleFullscreen,
		escapeFullscreen,
	} = playback;

	// Keyboard shortcuts belong to the visible chrome: with hideControls the
	// consumer owns all transport (and the window-id lookup below is
	// MoviePlayer-shaped anyway), so skip the listener entirely.
	useEffect(() => {
		if (hideControls) {
			return;
		}
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
		hideControls,
		handlePlayPause,
		appWindows,
		seekForward,
		seekBackward,
		toggleFullscreen,
		type,
		loop,
		setLoop,
		appId,
		url,
		escapeFullscreen,
	]);

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
					ref={attachMediaRef}
					src={url}
					playing={playing}
					loop={loop}
					controls={false}
					width="100%"
					height="100%"
					muted={muted}
					volume={muted ? 0 : volume}
					config={options}
					onTimeUpdate={handleTimeUpdate}
					onReady={onReady}
					onWaiting={onWaiting}
					onPlaying={onPlaying}
					crossOrigin={crossOrigin}
					playsInline={playsInline}
				/>
				{showSubtitles && (
					<QuickTimeCaptionsOverlay
						text={activeCueText(currentTime)}
						captionStyle={captionStyle}
					/>
				)}
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
					<QuickTimePlayPauseButton
						playing={playing}
						onToggle={handlePlayPause}
					/>
					<QuickTimeSeekBar
						id={`${appId}_${name}_progressBar`}
						currentTime={currentTime}
						duration={playerRef.current?.duration || 1}
						onSeekToPct={seekToPct}
						onSeekForward={seekForward}
						onSeekBackward={seekBackward}
					/>
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
					<QuickTimeVolumeControl
						id={`${url}_volume`}
						volume={volume}
						onVolumeChange={setVolume}
					/>
					{type !== "audio" && (
						<QuickTimeFullscreenButton onToggle={toggleFullscreen} />
					)}
				</div>
			)}
		</div>
	);
};
