import {
	ClassicyApp,
	ClassicyButton,
	ClassicyControlLabel,
	ClassicyIcons,
	ClassicyWindow,
	quitMenuItemHelper,
	useClassicyDateTime,
} from "classicy";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import type { MediaItem } from "../../Providers/MediaStream/MediaStreamContext";
import { useMediaStream } from "../../Providers/MediaStream/useMediaStream";
import styles from "./TV.module.scss";

/** Seconds into the media file that corresponds to the given wall-clock time. */
function calcSeekSeconds(item: MediaItem, clockMs: number): number {
	const startMs = new Date(item.start_date).getTime();
	const raw = (clockMs - startMs) / 1000 + item.jump;
	// Do not cap by calc_duration — it may be inaccurate for archive streams.
	// Let the player handle out-of-bounds positions natively.
	return Math.max(0, raw);
}

type ClassicyTVProps = Record<string, never>;

export const TV: React.FC<ClassicyTVProps> = () => {
	const appName = "TV";
	const appId = "TV.app";
	const appIcon = ClassicyIcons.applications.epg.app as string;

	const { items } = useMediaStream({ format: ["m3u8"], approved: true });
	const { dateTime } = useClassicyDateTime();

	const [showSettings, setShowSettings] = useState<boolean>(false);
	const [activePlayer, setActivePlayer] = useState<number>(0);
	// Browsers block autoplay with audio until the user interacts with the page.
	// Track first interaction so the active player stays muted until then.
	const [hasInteracted, setHasInteracted] = useState<boolean>(false);

	// Underlying video elements per item — react-player 3.x forwards refs to
	// the native <video> element, so we set currentTime directly for seeking.
	const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
	const prevDateTimeRef = useRef(dateTime);
	// Stable ref to the latest UTC dateTime string for use in config callbacks.
	const dateTimeRef = useRef(dateTime);
	dateTimeRef.current = dateTime;
	// Stable ref to items so the seek effect never captures a stale closure.
	const itemsRef = useRef(items);
	itemsRef.current = items;

	// Track the real-clock instant when dateTime last changed so the health
	// check can compute an accurate sub-minute Classicy time between updates.
	const dateTimeUpdatedAtRef = useRef<number>(Date.now());

	// Per-item hls config objects. Two maps are kept so the config reference
	// changes only when isActive changes, triggering a ReactPlayer remount to
	// switch quality levels. startPosition is computed once at first render.
	// Inactive: startLevel 0 (lowest quality, saves bandwidth for thumbnails).
	// Active:   startLevel -1 (ABR, ramps up to highest available quality).
	const hlsInactiveConfigsRef = useRef<Map<number, object>>(new Map());
	const hlsActiveConfigsRef = useRef<Map<number, object>>(new Map());

	// Select the first item once items arrive
	useEffect(() => {
		if (activePlayer === 0 && items.length > 0) {
			setActivePlayer(items[0].id);
		}
	}, [items, activePlayer]);

	// Record the real-clock instant each time the Classicy dateTime is updated.
	// dateTime is an intentional trigger dep; Date.now() is what we capture.
	// biome-ignore lint/correctness/useExhaustiveDependencies: trigger-only dep
	useEffect(() => {
		dateTimeUpdatedAtRef.current = Date.now();
	}, [dateTime]);

	// Periodic health check: ensure every player is playing and in sync.
	// Runs every 15 s. Uses real elapsed time to compute accurate Classicy
	// time between the minute-boundary Zustand updates.
	useEffect(() => {
		const healthId = setInterval(() => {
			const elapsedRealMs = Date.now() - dateTimeUpdatedAtRef.current;
			const nowMs = new Date(dateTimeRef.current).getTime() + elapsedRealMs;

			for (const item of itemsRef.current) {
				const el = videoRefs.current.get(item.id);
				if (!el) continue;

				// Resume if stalled or paused
				if (el.paused || el.ended) {
					el.play().catch(() => {});
				}

				// Re-seek if drift exceeds 30 seconds
				const expected = calcSeekSeconds(item, nowMs);
				if (Math.abs(el.currentTime - expected) > 30) {
					el.currentTime = expected;
				}
			}
		}, 15_000);

		return () => clearInterval(healthId);
	}, []);

	// Seek all mounted players whenever the stored dateTime changes.
	// Natural 60-second minute-boundary ticks are skipped because the players
	// are already advancing on their own; only genuine jumps need a seek.
	useEffect(() => {
		const prevMs = new Date(prevDateTimeRef.current).getTime();
		const nowMs = new Date(dateTime).getTime();
		const delta = nowMs - prevMs;
		const isNaturalMinuteTick = delta > 0 && Math.abs(delta - 60_000) < 3_000;

		if (!isNaturalMinuteTick && prevMs !== nowMs) {
			for (const item of itemsRef.current) {
				const el = videoRefs.current.get(item.id);
				if (el) {
					el.currentTime = calcSeekSeconds(item, nowMs);
				}
			}
		}

		prevDateTimeRef.current = dateTime;
	}, [dateTime]);

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
		},
	];

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={`${appId}_main`}
		>
			{showSettings && (
				<ClassicyWindow
					id={`${appId}_settings`}
					title={appName}
					appId={appId}
					closable={false}
					resizable={false}
					zoomable={false}
					scrollable={false}
					collapsable={false}
					initialSize={[200, 100]}
					initialPosition={[100, 100]}
					minimumSize={[200, 100]}
					modal={true}
					hidden={true}
					appMenu={appMenu}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							flexDirection: "column",
						}}
					>
						<ClassicyControlLabel label={"Nothing Here"}></ClassicyControlLabel>
						<ClassicyButton onClickFunc={() => setShowSettings(!showSettings)}>
							Close
						</ClassicyButton>
					</div>
				</ClassicyWindow>
			)}
			<ClassicyWindow
				id={`${appId}_main`}
				title={appName}
				appId={appId}
				closable={true}
				resizable={true}
				zoomable={true}
				scrollable={false}
				collapsable={true}
				initialSize={[800, 400]}
				initialPosition={[100, 50]}
				minimumSize={[600, 300]}
				modal={false}
				appMenu={appMenu}
			>
				<div className={styles.tvContainer}>
					<div className={styles.tvMainArea} />
					<div className={styles.tvThumbnailStrip}>
						{items.slice(0, 12).map((item) => {
							const isActive = item.id === activePlayer;

							// Build stable hls configs the first time each item is seen.
							// Two configs per item — inactive (low quality) and active (ABR)
							// — so switching active triggers a remount with the correct
							// quality level while unchanged players keep a stable reference.
							if (item.url.endsWith("m3u8") && !hlsInactiveConfigsRef.current.has(item.id)) {
								const nowMs = new Date(dateTimeRef.current).getTime();
								const startPosition = calcSeekSeconds(item, nowMs);
								hlsInactiveConfigsRef.current.set(item.id, {
									hls: { startLevel: 0, startPosition },
								});
								hlsActiveConfigsRef.current.set(item.id, {
									hls: { startLevel: -1, startPosition },
								});
							}
							const itemConfig = isActive
								? hlsActiveConfigsRef.current.get(item.id)
								: hlsInactiveConfigsRef.current.get(item.id);

							return (
								<button
									key={item.id}
									className={`${styles.tvPlayer}${isActive ? ` ${styles.tvPlayerActive}` : ""}`}
									onClick={() => { setActivePlayer(item.id); setHasInteracted(true); }}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											setActivePlayer(item.id);
											setHasInteracted(true);
										}
									}}
									type="button"
								>
									<div className={styles.tvChannelTitleHolder}>
										<p className={styles.tvChannelTitle}>{item.source}</p>
									</div>
									<ReactPlayer
										ref={(el: HTMLVideoElement | null) => {
											if (el) videoRefs.current.set(item.id, el);
											else videoRefs.current.delete(item.id);
										}}
										onReady={() => {}}
										src={item.url}
										playing={true}
										loop={false}
										controls={false}
										playsInline={true}
										muted={!(isActive && hasInteracted)}
										volume={isActive && hasInteracted ? 1 : 0}
										width="100%"
										height="100%"
										config={itemConfig}
									/>
								</button>
							);
						})}
					</div>
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
};
