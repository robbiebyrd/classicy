import "./ClassicyBootSequence.scss";
import { type FC as FunctionalComponent, type ReactNode, useState } from "react";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { hasShownStartupScreenThisSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";

interface ClassicyBootSequenceProps {
	startupScreen?: boolean;
	startupDuration?: number;
	preBootScreen?: (powerOn: () => void) => ReactNode;
}

/**
 * Orchestrates the boot phases. When a preBootScreen is supplied and the
 * splash has not run this session, shows a "power on" overlay first; the
 * consumer's button calls powerOn() to advance to ClassicyStartupScreen
 * (which plays the chime + parade). Gating the chime behind that click also
 * satisfies the browser's autoplay gesture requirement. ClassicyStartupScreen
 * self-gates on the session flag, so a reload before power-on replays the
 * overlay, and a reload after boot skips everything.
 */
export const ClassicyBootSequence: FunctionalComponent<
	ClassicyBootSequenceProps
> = ({ startupScreen = true, startupDuration = 4000, preBootScreen }) => {
	const [phase, setPhase] = useState<"powerOn" | "startup">(() =>
		preBootScreen && !hasShownStartupScreenThisSession()
			? "powerOn"
			: "startup",
	);

	if (phase === "powerOn" && preBootScreen) {
		return (
			<div className="classicyPreBootScreen" role="dialog" aria-modal="true">
				{preBootScreen(() => setPhase("startup"))}
			</div>
		);
	}

	return startupScreen ? (
		<ClassicyStartupScreen duration={startupDuration} />
	) : null;
};
