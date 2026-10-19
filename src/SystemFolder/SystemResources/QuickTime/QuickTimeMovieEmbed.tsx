import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./QuickTimeMovieEmbed.scss";
import classNames from "classnames";
import { type FC as FunctionalComponent, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
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
	/**
	 * Id of the owning app. Keyboard shortcuts only act while that app's
	 * `${appId}_MoviePlayer_${url}` window is focused.
	 */
	appId: string;
	/** Name of the media; used to build the seek bar's element id. */
	name: string;
	/** Media URL, handed to `react-player` (files, streams, YouTube, …). */
	url: string;
	/** `"audio"` hides the fullscreen button and the F shortcut. */
	type: "audio" | "video";
	/** Passed through to `react-player` as its `config`. */
	options?: object;
	/**
	 * SRT or VTT subtitle file (an http(s) URL or a root-relative path).
	 * Adds a CC button that toggles the caption overlay.
	 */
	subtitlesUrl?: string;
	/** Initial playing state when `playing` is uncontrolled. Defaults to `false`. */
	autoPlay?: boolean;
	/**
	 * Hide the controller bar and disable the keyboard shortcuts, for
	 * consumers that drive transport themselves (`playing`, `onMediaElement`).
	 */
	hideControls?: boolean;
	/**
	 * Pin the controller bar to the bottom of the nearest positioned ancestor
	 * (the window, in Movie Player), with the picture shortened to leave room
	 * for it. When off, the bar flows directly beneath the picture.
	 */
	controlsDocked?: boolean;
	/** Mute playback (forces the effective volume to 0). */
	muted?: boolean;
	/** Controlled playing state; omit to let the play/pause button own it. */
	playing?: boolean;
	/** Fired with the requested playing state on every toggle. */
	onPlayingChange?: (playing: boolean) => void;
	/** Controlled volume, 0–1; uncontrolled it starts at 0.5. */
	volume?: number;
	/** Fired with the new volume (0–1) when the volume slider moves. */
	onVolumeChange?: (volume: number) => void;
	/** Controlled caption visibility; uncontrolled it starts off. */
	captionsEnabled?: boolean;
	/** Fired when the CC button toggles captions. */
	onCaptionsEnabledChange?: (enabled: boolean) => void;
	/** Caption font, colours, opacity and size; theme defaults when omitted. */
	captionStyle?: QuickTimeCaptionStyle;
	/** Receives the underlying media element on mount (and `null` on unmount). */
	onMediaElement?: (el: HTMLVideoElement | null) => void;
	/** Fired when the media is ready to play. */
	onReady?: () => void;
	/** Fired when playback stalls waiting for data. */
	onWaiting?: () => void;
	/** Fired when playback starts or resumes. */
	onPlaying?: () => void;
	/** CORS mode for the media element, e.g. for remote captions or canvas reads. */
	crossOrigin?: "" | "anonymous" | "use-credentials";
	/** Play inline on iOS rather than forcing native fullscreen. */
	playsInline?: boolean;
};

/**
 * A QuickTime-style movie player: the picture plus a Platinum controller bar
 * (play/pause, seek bar with elapsed time, ±10 s skip, optional CC toggle,
 * volume pop-up and fullscreen). It is the Classicy replacement for raw
 * `<video>` / `<audio>` (set `type`), plays anything `react-player` can,
 * and is what the built-in Movie Player app renders.
 *
 * Playing state, volume and caption visibility are each controlled when
 * their prop is passed and uncontrolled otherwise. Keyboard shortcuts —
 * Space play/pause, ←/→ skip 10 s, F fullscreen, L loop, Escape leave
 * fullscreen — are only live while the Movie Player window for this
 * `appId`/`url` (`${appId}_MoviePlayer_${url}`) is focused, so an embed in any
 * other window gets none; `hideControls` turns them off entirely. The
 * individual controls (`QuickTimePlayPauseButton`, `QuickTimeSeekBar`,
 * `QuickTimeVolumeControl`, `QuickTimeFullscreenButton`,
 * `QuickTimeCaptionsOverlay`) and hooks (`useQuickTimePlayback`,
 * `useQuickTimeSubtitles`) are exported for building a custom player.
 *
 * ```tsx
 * <QuickTimeVideoEmbed appId={appId} name="Intro" url={movieUrl} type="video" controlsDocked />
 * ```
 */
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
	// Keyboard shortcuts only act while this movie's MoviePlayer window is the
	// focused one.
	const playerWindowFocused = useAppManager(
		(s) =>
			getAppWindow(
				s.System.Manager.Applications.apps[appId],
				`${appId}_MoviePlayer_${url}`,
			)?.focused === true,
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
			if (!playerWindowFocused) {
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
		playerWindowFocused,
		seekForward,
		seekBackward,
		toggleFullscreen,
		type,
		loop,
		setLoop,
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
