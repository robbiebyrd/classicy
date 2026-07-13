import "./ClassicyStartupScreen.scss";
import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

const SESSION_KEY = "classicyStartupScreenShown";

const hasShownThisSession = (): boolean => {
	try {
		return sessionStorage.getItem(SESSION_KEY) !== null;
	} catch {
		// Storage unavailable (private browsing, SSR): degrade to showing.
		return false;
	}
};

const markShownThisSession = (): void => {
	try {
		sessionStorage.setItem(SESSION_KEY, "true");
	} catch {
		// Storage unavailable: the splash will simply show again next load.
	}
};

interface ClassicyStartupScreenProps {
	duration?: number;
}

/**
 * Mac OS 8 boot splash: covers the already-mounted desktop, plays the boot
 * chime, fills a progress bar over `duration` ms, then removes itself.
 * Shows once per browser-tab session. Deliberately self-contained — it does
 * not touch the window manager, app registration, or focus system.
 */
export const ClassicyStartupScreen: FunctionalComponent<
	ClassicyStartupScreenProps
> = ({ duration = 4000 }) => {
	const [visible, setVisible] = useState(() => !hasShownThisSession());
	const [progress, setProgress] = useState(0);
	const player = useSoundDispatch();

	useEffect(() => {
		if (!visible) return;
		markShownThisSession();
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
					<img src={ClassicyIcons.system.macosSvg} alt="Mac OS" />
					<span className="classicyStartupScreenWordmark">Mac OS</span>
				</div>
				<div className="classicyStartupScreenProgress">
					<ClassicyProgressBar
						value={progress}
						max={100}
						label="Starting Up…"
						labelPosition="above"
					/>
				</div>
			</div>
		</div>
	);
};
