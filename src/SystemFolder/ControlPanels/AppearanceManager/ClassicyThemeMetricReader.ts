import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Render and handler code only. This module evaluates getThemeVars at
// runtime, so it must never be imported from a reducer path: reducers derive
// geometry from the theme in state (getThemeVars(theme)), never the DOM.

let defaultThemeVars: Record<string, string> | undefined;

// The default theme (the Platinum preset) never changes at runtime, so its
// variables are computed once, on first use, rather than per read.
const getDefaultThemeVars = (): Record<string, string> => {
	defaultThemeVars ??= getThemeVars(getTheme("default")) as Record<
		string,
		string
	>;
	return defaultThemeVars;
};

/**
 * The default theme's value of a theme variable, in px: what
 * `readClassicyThemeVar` falls back to before the desktop mounts (or with no
 * DOM). Throws — after logging — when `getThemeVars` does not emit `name` or
 * its value is not a number, so a typo fails loudly instead of yielding NaN.
 */
export const classicyDefaultThemeVarPx = (name: string): number => {
	const vars = getDefaultThemeVars();
	if (!Object.hasOwn(vars, name)) {
		const message = `Theme variable ${name} is not emitted by getThemeVars`;
		classicyLog("error", "Theme", message);
		throw new Error(message);
	}
	const value = Number.parseFloat(vars[name]);
	if (!Number.isFinite(value)) {
		const message = `Theme variable ${name} is not a number (${vars[name]})`;
		classicyLog("error", "Theme", message);
		throw new Error(message);
	}
	return value;
};

/**
 * A theme variable's computed value in px, read from `el`, else
 * `#classicyDesktop` (where the theme variables are set), else the document
 * root. Anything that is not a finite number above 0 — the variable unset
 * (jsdom and pre-mount reads see ""), or a non-length value — yields
 * `fallback`, which defaults to the default theme's value; so does a call
 * with no `document`.
 *
 * Each call forces a style read: call it once per gesture or layout pass,
 * never inside a mousemove handler.
 */
export const readClassicyThemeVar = (
	name: string,
	fallback: number = classicyDefaultThemeVarPx(name),
	el?: Element | null,
): number => {
	if (typeof document === "undefined" || typeof getComputedStyle !== "function")
		return fallback;
	const target =
		el ??
		document.getElementById("classicyDesktop") ??
		document.documentElement;
	const value = Number.parseFloat(
		getComputedStyle(target).getPropertyValue(name),
	);
	return Number.isFinite(value) && value > 0 ? value : fallback;
};
