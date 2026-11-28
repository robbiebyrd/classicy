import { useEffect } from "react";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { runClassicyWindowCommand } from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * The Windows shell's window keys (plan 0020-w98 §5, "The window pop-up
 * (system) menu"; WIG App. B, Table B.2, p.358): ALT+SPACEBAR, "Display
 * pop-up menu for the window", and ALT+F4, "Close the active window", bound
 * only under a layout that declares `window.systemMenu: true`; and ALT+F6
 * and ALT+SHIFT+F6, "Switch to the next window (modeless-compatible)" and
 * the previous one, bound only under a layout with a taskbar (shell
 * addendum B20). Internal: not exported from the package.
 */

// The character macOS gives for Option+Space: U+00A0 NO-BREAK SPACE.
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** Which of the shell's window keys a key press is. */
export type ClassicyWindowShellKey =
	| "systemMenu"
	| "close"
	| "nextWindow"
	| "previousWindow";

/**
 * The shell key `e` presses: ALT+SPACE is `"systemMenu"`, ALT+F4 `"close"`
 * and ALT+F6 `"nextWindow"`, each with Alt (Option) alone held, and
 * ALT+SHIFT+F6 `"previousWindow"`; anything else is `null`. Space is read
 * from the physical key (`code`) as well as the character, since macOS gives
 * Option+Space as a non-breaking space.
 */
export const classicyWindowShellKey = (
	e: Pick<
		KeyboardEvent,
		"altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code"
	>,
): ClassicyWindowShellKey | null => {
	if (!e.altKey || e.ctrlKey || e.metaKey) return null;
	if (e.key === "F6" || e.code === "F6")
		return e.shiftKey ? "previousWindow" : "nextWindow";
	if (e.shiftKey) return null;
	if (e.code === "Space" || e.key === " " || e.key === NO_BREAK_SPACE)
		return "systemMenu";
	if (e.key === "F4" || e.code === "F4") return "close";
	return null;
};

/**
 * The window the shell's keys act on: the focused app's focused, open window
 * (a modal over it, which the store focuses, included), or `undefined` when
 * none is focused (the desktop holds focus, or every window is minimized).
 */
export const classicyWindowShellKeyTarget = (
	state: ClassicyStore,
): { appId: string; windowId: string } | undefined => {
	const { apps, focusedAppId } = state.System.Manager.Applications;
	if (!focusedAppId) return undefined;
	const app = apps[focusedAppId];
	if (!app) return undefined;
	const focused = listAppWindows(app).find((w) => w.focused && !w.closed);
	return focused ? { appId: focusedAppId, windowId: focused.id } : undefined;
};

/**
 * The window ALT+F6 (`direction` `"next"`) or ALT+SHIFT+F6 (`"previous"`)
 * activates: among the focused app's open, unminimized, non-modal windows,
 * palettes included (a palette never minimizes, so its stored `collapsed` is
 * not read), in ascending `zOrder` (then id), the one after (or before) the
 * focused window, wrapping around; with no window of the app focused, the
 * first (or last). `undefined` when the focused window is a modal (its
 * owner's other windows wait for it), when there is no other window to go
 * to, or when no app is focused.
 */
export const classicyWindowShellSwitchTarget = (
	state: ClassicyStore,
	direction: "next" | "previous",
): { appId: string; windowId: string } | undefined => {
	const { apps, focusedAppId } = state.System.Manager.Applications;
	if (!focusedAppId) return undefined;
	const app = apps[focusedAppId];
	if (!app) return undefined;
	const open = listAppWindows(app).filter((w) => !w.closed);
	const focused = open.find((w) => w.focused);
	if (focused?.modal) return undefined;
	const candidates = open
		.filter(
			(w) => !w.modal && (w.windowType === "utility" || w.collapsed !== true),
		)
		.sort(
			(a, b) =>
				(a.zOrder ?? 0) - (b.zOrder ?? 0) ||
				(a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
		);
	if (candidates.length === 0) return undefined;
	const at = focused ? candidates.indexOf(focused) : -1;
	const n = candidates.length;
	const index =
		at < 0
			? direction === "next"
				? 0
				: n - 1
			: direction === "next"
				? (at + 1) % n
				: (at - 1 + n) % n;
	const target = candidates[index];
	if (target === focused) return undefined;
	return { appId: focusedAppId, windowId: target.id };
};

/**
 * Binds ALT+SPACE and ALT+F4 on the document while `enabled` (the active
 * layout's `window.systemMenu === true`; `ClassicyDesktop` calls it), and
 * nothing otherwise. Each acts on the focused window
 * (`classicyWindowShellKeyTarget`) through its own commands:
 * - ALT+SPACE runs its `systemMenu` command with no point, so the window pop-up
 *   menu drops from the caption's bottom-left with its first item selected,
 *   as Windows' keyboard does, and the key's default is prevented when the
 *   menu opens: a text field's Option+Space (a non-breaking space) gives way
 *   to the menu, as ALT+SPACE does in Windows, where the shortcut dispatcher
 *   leaves Option-only chords to a text field. A held key's repeats open
 *   nothing more.
 * - ALT+F4 runs its `close` command, the caption Close box's path (its
 *   `onBeforeClose` veto included), and closes any open contextual menu with
 *   it; a window that cannot close stays open, as Windows ignores ALT+F4 when
 *   Close is unavailable. The key's default is prevented whenever a window is
 *   focused. With none focused it does nothing.
 *
 * - ALT+F6 and ALT+SHIFT+F6, while `options.switchWindows` (a layout with a
 *   taskbar), activate the focused app's next or previous window
 *   (`classicyWindowShellSwitchTarget`) through its `activate` command, as
 *   Windows' "Switch to the next window" does; the key's default is
 *   prevented whenever an app is focused, even with no other window to go
 *   to. With `enabled` false only these two are bound, and with
 *   `switchWindows` false only the first two.
 *
 * An event another listener has already handled (`defaultPrevented`: a menu
 * shortcut, a keyboard mode) is left alone. Windows itself takes both keys
 * before a page sees them on a Windows host (ALT+F4 closes the browser), so
 * they reach the page where the browser lets them through: macOS gives them
 * as Option chords.
 */
export function useClassicyWindowShellKeys(
	enabled: boolean,
	options: { switchWindows?: boolean } = {},
): void {
	const { hideContextMenu } = useClassicyContextualMenu();
	const switchWindows = options.switchWindows === true;
	useEffect(() => {
		if ((!enabled && !switchWindows) || typeof document === "undefined") return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return;
			const key = classicyWindowShellKey(e);
			if (!key) return;
			if (typeof useAppManager.getState !== "function") return;
			if (key === "nextWindow" || key === "previousWindow") {
				if (!switchWindows) return;
				const state = useAppManager.getState();
				if (!state.System.Manager.Applications.focusedAppId) return;
				e.preventDefault();
				const to = classicyWindowShellSwitchTarget(
					state,
					key === "nextWindow" ? "next" : "previous",
				);
				if (to)
					runClassicyWindowCommand(to.appId, to.windowId, {
						type: "activate",
					});
				return;
			}
			if (!enabled) return;
			const target = classicyWindowShellKeyTarget(useAppManager.getState());
			if (!target) return;
			if (key === "systemMenu") {
				if (e.repeat) {
					e.preventDefault();
					return;
				}
				if (
					runClassicyWindowCommand(target.appId, target.windowId, {
						type: "systemMenu",
					})
				)
					e.preventDefault();
				return;
			}
			e.preventDefault();
			if (
				runClassicyWindowCommand(target.appId, target.windowId, {
					type: "close",
				})
			)
				hideContextMenu();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [enabled, switchWindows, hideContextMenu]);
}
