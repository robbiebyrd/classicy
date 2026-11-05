import "./ClassicyNoAppearancePackage.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useMemo,
} from "react";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { getThemeVars } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

interface ClassicyNoAppearancePackageProps {
	/** Extra class names, merged onto the screen's root after its own. */
	className?: string;
	/** Inline style, merged onto the screen's root after the core theme variables. */
	style?: CSSProperties;
}

// Once per page: not per render, remount or StrictMode's second effect.
let reported = false;

/**
 * What `ClassicyDesktop` draws in place of the whole desktop while no
 * Appearance Package is registered: a plain message saying a package must be
 * loaded, with the import that loads Platinum. Nothing crashed, so it is not
 * the Sad Mac (`ClassicyCrashScreen`). It relies on no package's look: its
 * base styles read only the core default theme's variables, which it sets on
 * its own root. The first time one mounts, it logs one error per page through
 * `classicyLog`. The desktop replaces it as soon as a package registers.
 */
export const ClassicyNoAppearancePackage: FunctionalComponent<
	ClassicyNoAppearancePackageProps
> = ({ className, style }) => {
	useEffect(() => {
		if (reported) return;
		reported = true;
		classicyLog(
			"error",
			"Appearance",
			'No Appearance Package is registered; import "@classicy/appearance-platinum" (or another package) at your app\'s entry.',
		);
	}, []);

	// No package supplies a variable here, so the screen carries the core
	// default theme's own (colors, fonts, sizes), as the desktop root would.
	// Computed at render, while no package is registered, so the knobs are
	// the core floor's alone.
	const rootStyle = useMemo(
		() =>
			({
				...getThemeVars(CLASSICY_CORE_DEFAULT_THEME),
				...style,
			}) as CSSProperties,
		[style],
	);

	return (
		<div
			className={classNames("classicyNoAppearancePackage", className)}
			style={rootStyle}
		>
			<div className={"classicyNoAppearancePackageMessage"} role={"alert"}>
				<h1 className={"classicyNoAppearancePackageHeading"}>
					No Appearance Package is loaded
				</h1>
				<p className={"classicyNoAppearancePackageBody"}>
					Classicy needs an Appearance Package to draw its desktop. Load one at
					your app's entry, for example:
				</p>
				<pre className={"classicyNoAppearancePackageCode"}>
					<code>import "@classicy/appearance-platinum";</code>
				</pre>
			</div>
		</div>
	);
};
