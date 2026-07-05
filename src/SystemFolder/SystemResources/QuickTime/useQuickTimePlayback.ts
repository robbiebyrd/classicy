import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import screenfull from "screenfull";
import { useControllableState } from "@/SystemFolder/SystemResources/QuickTime/useControllableState";

export function useQuickTimePlayback(options: {
	autoPlay?: boolean;
	playing?: boolean;
	onPlayingChange?: (playing: boolean) => void;
	volume?: number;
	onVolumeChange?: (volume: number) => void;
	onMediaElement?: (el: HTMLVideoElement | null) => void;
}): {
	playerRef: RefObject<HTMLVideoElement | null>;
	attachMediaRef: (el: HTMLVideoElement | null) => void;
	playing: boolean;
	handlePlayPause: () => void;
	volume: number;
	setVolume: (v: number) => void;
	loop: boolean;
	setLoop: (l: boolean) => void;
	currentTime: number;
	handleTimeUpdate: () => void;
	seekTo: (seconds: number) => void;
	seekForward: () => void;
	seekBackward: () => void;
	seekToPct: (pct: number) => void;
	toggleFullscreen: () => void;
	escapeFullscreen: () => void;
} {
	const [playing, setPlaying] = useControllableState<boolean>(
		options.playing,
		options.autoPlay ?? false,
		options.onPlayingChange,
	);
	const [volume, setVolume] = useControllableState<number>(
		options.volume,
		0.5,
		options.onVolumeChange,
	);
	const [loop, setLoop] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [_isFullscreen, setIsFullscreen] = useState(false);

	const playerRef = useRef<HTMLVideoElement | null>(null);

	// Consumers pass inline arrows for onMediaElement; route through a ref so
	// attachMediaRef stays referentially stable and ReactPlayer's ref callback
	// doesn't detach/re-attach on every render.
	const onMediaElementRef = useRef(options.onMediaElement);
	onMediaElementRef.current = options.onMediaElement;
	const attachMediaRef = useCallback((el: HTMLVideoElement | null) => {
		playerRef.current = el;
		onMediaElementRef.current?.(el);
	}, []);

	// currentTime isn't reactive on its own — mirror the native timeupdate
	// event into state so progress UI re-renders during playback.
	const handleTimeUpdate = useCallback(() => {
		setCurrentTime(playerRef.current?.currentTime || 0);
	}, []);

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

	const handlePlayPause = useCallback(() => {
		setPlaying((prev) => !prev);
	}, [setPlaying]);

	const seekTo = useCallback((seconds: number) => {
		if (playerRef.current) {
			playerRef.current.currentTime = seconds;
			setCurrentTime(seconds);
		}
	}, []);

	const seekForward = useCallback(() => {
		seekTo((playerRef.current?.currentTime || 0) + 10);
	}, [seekTo]);

	const seekBackward = useCallback(() => {
		seekTo((playerRef.current?.currentTime || 0) - 10);
	}, [seekTo]);

	const seekToPct = useCallback((pct: number) => {
		if (playerRef.current) {
			const seconds = pct * playerRef.current.duration;
			playerRef.current.currentTime = seconds;
			setCurrentTime(seconds);
		}
	}, []);

	const toggleFullscreen = useCallback(() => {
		if (screenfull.isEnabled && playerRef.current) {
			screenfull.toggle(playerRef.current, { navigationUI: "hide" });
		}
	}, []);

	const escapeFullscreen = useCallback(() => {
		if (!screenfull.isEnabled) {
			return;
		}
		screenfull.exit();
	}, []);

	return {
		playerRef,
		attachMediaRef,
		playing,
		handlePlayPause,
		volume,
		setVolume,
		loop,
		setLoop,
		currentTime,
		handleTimeUpdate,
		seekTo,
		seekForward,
		seekBackward,
		seekToPct,
		toggleFullscreen,
		escapeFullscreen,
	};
}
