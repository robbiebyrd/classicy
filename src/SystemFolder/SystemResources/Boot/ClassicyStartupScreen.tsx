import "./ClassicyStartupScreen.scss";
import {
	type FC as FunctionalComponent,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import {
	hasShownStartupScreenThisSession,
	markStartupScreenShownThisSession,
} from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

interface ClassicyStartupScreenProps {
	duration?: number;
}

/**
 * Classicy boot splash: covers the already-mounted desktop, plays the boot
 * chime, fills a progress bar over `duration` ms, then removes itself.
 * Shows once per browser-tab session. Deliberately self-contained — it does
 * not touch the window manager, app registration, or focus system.
 */
export const ClassicyStartupScreen: FunctionalComponent<
	ClassicyStartupScreenProps
> = ({ duration = 4000 }) => {
	const [visible, setVisible] = useState(
		() => !hasShownStartupScreenThisSession(),
	);
	const [progress, setProgress] = useState(0);
	const player = useSoundDispatch();

	// Extension apps have already dispatched ClassicyAppLoad by the time the
	// splash covers the desktop, so the store is the parade's source of truth.
	// Select the stable apps record and derive with useMemo — a filtering
	// selector would return a fresh array every snapshot.
	const apps = useAppManager((state) => state.System.Manager.Applications.apps);
	const extensions = useMemo(
		() => Object.values(apps).filter((app) => app.extension),
		[apps],
	);

	// Mac OS 7-style parade: with N extensions, icon i appears once elapsed
	// time passes (i + 1) × duration / (N + 1) — the last icon lands before
	// the progress bar completes.
	const revealInterval = duration / (extensions.length + 1);
	const elapsed = (progress / 100) * duration;
	const visibleExtensions = extensions.slice(
		0,
		Math.min(extensions.length, Math.floor(elapsed / revealInterval)),
	);

	useEffect(() => {
		if (!visible) return;
		markStartupScreenShownThisSession();
		player({ type: "ClassicySoundPlay", sound: "ClassicyBoot" });
	}, [visible, player]);

	useEffect(() => {
		if (!visible) return;
		const startedAt = Date.now();
		const tick = setInterval(() => {
			const elapsed = Date.now() - startedAt;
			if (elapsed >= duration) {
				setVisible(false);
			} else {
				setProgress((elapsed / duration) * 100);
			}
		}, 50);
		return () => clearInterval(tick);
	}, [visible, duration]);

	if (!visible) return null;

	return (
		<div className="classicyStartupScreen" role="status">
			<div className="classicyStartupScreenPanel">
				<div className="classicyStartupScreenLogo">
					<img src={ClassicyIcons.system.macosSvg} alt="Classicy" />
					<span className="classicyStartupScreenWordmark">Classicy</span>
				</div>
				<div className="classicyStartupScreenProgress">
					<ClassicyProgressBar
						value={progress}
						max={100}
						label="Starting Up…"
						labelPosition="above"
						labelAlign="center"
					/>
				</div>
			</div>
			{visibleExtensions.length > 0 && (
				<div className="classicyStartupScreenExtensions">
					{visibleExtensions.map((ext) => (
						<img key={ext.id} src={ext.icon} alt={ext.name} title={ext.name} />
					))}
				</div>
			)}
		</div>
	);
};
