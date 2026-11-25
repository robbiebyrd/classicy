import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import {
	type ClassicyEditTargetState,
	classicyEditCommands,
	ensureEditTracker,
	getEditTargetStateServerSnapshot,
	getEditTargetStateSnapshot,
	getUndoStateServerSnapshot,
	getUndoStateSnapshot,
	subscribeEditTargetState,
	subscribeUndoState,
} from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Menu-triggered window closes bypass ClassicyWindow's own close box, which
 * normally dispatches ClassicyWindowClose itself before calling onCloseFunc.
 * This hook packages both steps together for use from a menu item.
 */
export function useClassicyWindowClose(
	appId: string,
): (windowId: string, appCleanupAction: ActionMessage) => void {
	const dispatch = useAppManagerDispatch();
	return useCallback(
		(windowId: string, appCleanupAction: ActionMessage) => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: appId },
				window: { id: windowId },
			});
			dispatch(appCleanupAction);
		},
		[dispatch, appId],
	);
}

export type ClassicyAboutMenu = {
	aboutMenuItem: ClassicyMenuItem;
	aboutWindow: ReactNode;
};

/**
 * Bundles the showAbout state + About menu item + About window that every
 * app previously hand-rolled (Finder, Sound Manager, Appearance Manager,
 * Date & Time Manager all duplicated this exact pattern).
 */
export function useClassicyAboutMenu(
	appId: string,
	appName: string,
	appIcon: string,
): ClassicyAboutMenu {
	const [showAbout, setShowAbout] = useState(false);
	const hideAbout = useCallback(() => setShowAbout(false), []);
	// About's access key under a package that has them (WIG Appendix B
	// Table B.5: About A; notepad.exe's "&About Notepad").
	const ak = useClassicyBundledAccessKeys();

	// Every caller documents (see useClassicyHelpMenu above) that a menu array
	// must be referentially stable or it re-fires consuming effects every
	// render. aboutMenuItem is exactly that kind of dependency for any app that
	// folds it into its own memoized appMenu (every built-in app does) — an
	// unmemoized literal here silently defeated that memoization and, for
	// HyperCard specifically, fed back into ClassicyWindowMenu/desktopMenu
	// sync effects that dispatch whenever their input's identity changes,
	// producing an infinite render loop (issue: HyperCard crash on open).
	const aboutMenuItem: ClassicyMenuItem = useMemo(
		() => ({
			id: `${appId}_about`,
			title: "About",
			accessKey: ak("a"),
			onClickFunc: () => setShowAbout(true),
		}),
		[appId, ak],
	);

	const aboutWindow = showAbout ? (
		<ClassicyAboutWindow
			appId={appId}
			appName={appName}
			appIcon={appIcon}
			hideFunc={hideAbout}
		/>
	) : null;

	return { aboutMenuItem, aboutWindow };
}

/**
 * Publishes app-specific items into the standard Help menu (HIG Ch. 4), where
 * the menu bar renders them for the focused app only, after the system's
 * items and a divider; under a taskbar (`layout.taskbar`) each of the app's
 * window menu bars ends with that Help menu instead. The items of a top-level
 * Help menu in the app's own `appMenu` are merged in after them, so an app
 * never shows a second "Help" title. Unlike an About entry in the app's own
 * `appMenu`, items registered here are never hoisted into the Apple menu.
 *
 * `items` must be referentially stable — memoize it with `useMemo`, as apps
 * already do for `appMenu`. An array rebuilt every render re-fires this effect
 * every render.
 */
export function useClassicyHelpMenu(
	appId: string,
	items: ClassicyMenuItem[],
): void {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopHelpMenuAdd",
			app: { id: appId },
			helpItems: items,
		});
		return () => {
			dispatch({
				type: "ClassicyDesktopHelpMenuRemove",
				app: { id: appId },
			});
		};
	}, [dispatch, appId, items]);
}

// The target state's stand-in while the Mac form is drawn: nothing is
// subscribed, so the selection is never watched for it.
const noTargetSubscription = () => () => {};

/**
 * Builds a standard HIG Edit menu (Undo / Cut / Copy / Paste / Clear / Select
 * All) whose commands act on the last-focused text field. Keyboard equivalents
 * are handled natively by the browser in the focused field (the items are
 * flagged `nativeShortcut`), so their glyphs render but the app-wide dispatcher
 * leaves the keystrokes to the browser; the click handlers drive the same
 * actions for mouse users.
 *
 * Under a package with access keys (`layout.menu.accessKeys`, Windows 98)
 * the menu carries Windows 98 SE's letters (WIG Appendix B Table B.5:
 * Edit E, Undo U, Cut t, Copy C, Paste P, Select All A; notepad.exe's and
 * mspaint.exe's "&Undo", "Cu&t", "&Copy", "&Paste", "Select &All"), Clear
 * Paint's "C&lear Selection" and Microsoft Chat's "C&lear" beside Select
 * &All (Table B.5 names no Clear); and under its
 * `layout.menu.shortcutSpelling` `"names"` Clear shows the Delete key,
 * "Del", as those menus do (WIG Ch.5 "Shortcut Keys for Transfer
 * Operations", pp.67-68), a native key the browser's editing answers.
 * Platinum and System 7 keep Mac OS 8's menu: no keys, no Clear shortcut.
 *
 * Under the package's `layout.edit.menu` `"windows"` (Windows 98) it takes
 * Windows 98 SE's Notepad's form (notepad.exe's Edit menu: "&Undo\tCtrl+Z",
 * "Cu&t\tCtrl+X", "&Copy\tCtrl+C", "&Paste\tCtrl+V", "De&lete\tDel",
 * "Select &All"; WIG Ch.5 "Command Method", p.59): Undo is "Undo" alone,
 * dimmed with nothing to undo (never "Can't Undo" or "Undo Typing"), a
 * divider, Cut, Copy, Paste, Delete in Clear's place with Notepad's letter l
 * and the Delete key, a divider, and Select All. Its items are dimmed as
 * Notepad's menu dims them (Wine's `NOTEPAD_InitMenuPopup`): Cut, Copy and
 * Delete while the target field has no selection, Select All while it holds
 * no text, and every command while there is no target
 * (`subscribeEditTargetState`); Cut, Paste and Delete also while it is
 * read-only, and Cut and Copy in a password field, as user.exe's edit menu
 * has them. Paste is not dimmed by the clipboard, which a page cannot read
 * without the user's permission. Select All keeps ⌘A (Ctrl+A), Explorer's
 * and WordPad's chord, which the browser's editing answers; Notepad's own
 * carried none. The ids are the Mac form's (Delete is `${idPrefix}_clear`).
 *
 * `preferencesItem`, when supplied, is appended after a divider at the BOTTOM of
 * the Edit menu — the position Mac OS 8 standardized for the Preferences command
 * (HIGOS8 Ch.4 "Menu Bar Changes", p.91). Give it a title ending in an ellipsis
 * (e.g. "Preferences…") since it opens a further dialog.
 */
export function useClassicyEditMenu(
	idPrefix: string,
	preferencesItem?: ClassicyMenuItem,
): ClassicyMenuItem {
	useEffect(() => {
		ensureEditTracker();
	}, []);

	// Context-aware Undo (HIG 4.6): name the pending action ("Undo Typing") and
	// dim to "Can't Undo" when the focused/last field has nothing to undo. The
	// snapshot only changes when the wording would, so this doesn't re-render on
	// every keystroke.
	const undoState = useSyncExternalStore(
		subscribeUndoState,
		getUndoStateSnapshot,
		getUndoStateServerSnapshot,
	);
	const undoTitle = undoState.canUndo
		? undoState.label
			? `Undo ${undoState.label}`
			: "Undo"
		: "Can't Undo";
	const ak = useClassicyBundledAccessKeys();
	const layout = useClassicyAppearanceLayout();
	const clearShowsDel = layout.menu?.shortcutSpelling === "names";
	const windowsForm = layout.edit?.menu === "windows";
	const target = useSyncExternalStore(
		windowsForm ? subscribeEditTargetState : noTargetSubscription,
		windowsForm ? getEditTargetStateSnapshot : getEditTargetStateServerSnapshot,
		getEditTargetStateServerSnapshot,
	);

	const windowsMenu = useMemo(
		() =>
			windowsForm
				? windowsEditMenu(
						idPrefix,
						undoState.canUndo,
						target,
						ak,
						preferencesItem,
					)
				: undefined,
		[windowsForm, idPrefix, undoState.canUndo, target, ak, preferencesItem],
	);
	const macMenu = useMemo(
		() => ({
			id: `${idPrefix}_edit`,
			title: "Edit",
			accessKey: ak("e"),
			menuChildren: [
				{
					id: `${idPrefix}_undo`,
					title: undoTitle,
					accessKey: ak("u"),
					disabled: !undoState.canUndo,
					keyboardShortcut: "⌘Z",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.undo,
				},
				{ id: "spacer" },
				{
					id: `${idPrefix}_cut`,
					title: "Cut",
					accessKey: ak("t"),
					keyboardShortcut: "⌘X",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.cut,
				},
				{
					id: `${idPrefix}_copy`,
					title: "Copy",
					accessKey: ak("c"),
					keyboardShortcut: "⌘C",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.copy,
				},
				{
					id: `${idPrefix}_paste`,
					title: "Paste",
					accessKey: ak("p"),
					keyboardShortcut: "⌘V",
					nativeShortcut: true,
					onClickFunc: () => {
						void classicyEditCommands.paste();
					},
				},
				{
					id: `${idPrefix}_clear`,
					title: "Clear",
					accessKey: ak("l"),
					...(clearShowsDel
						? { keyboardShortcut: "⌦", nativeShortcut: true }
						: {}),
					onClickFunc: classicyEditCommands.clear,
				},
				{
					id: `${idPrefix}_select_all`,
					title: "Select All",
					accessKey: ak("A"),
					keyboardShortcut: "⌘A",
					nativeShortcut: true,
					onClickFunc: classicyEditCommands.selectAll,
				},
				// Mac OS 8 moved Preferences to the bottom of the Edit menu, after a
				// divider (HIGOS8 Ch.4, p.91). Only present when a host supplies it.
				...(preferencesItem
					? [{ id: "spacer" } as ClassicyMenuItem, preferencesItem]
					: []),
			],
		}),
		[
			idPrefix,
			preferencesItem,
			undoTitle,
			undoState.canUndo,
			ak,
			clearShowsDel,
		],
	);
	return windowsMenu ?? macMenu;
}

/**
 * Notepad's Edit menu (`edit.menu: "windows"`), its items dimmed from the
 * target's state as Notepad's menu-init dims them.
 */
const windowsEditMenu = (
	idPrefix: string,
	canUndo: boolean,
	target: ClassicyEditTargetState,
	ak: (key: string) => string | undefined,
	preferencesItem?: ClassicyMenuItem,
): ClassicyMenuItem => {
	const noSelection = !target.target || !target.selection;
	return {
		id: `${idPrefix}_edit`,
		title: "Edit",
		accessKey: ak("e"),
		menuChildren: [
			{
				id: `${idPrefix}_undo`,
				title: "Undo",
				accessKey: ak("u"),
				disabled: !canUndo,
				keyboardShortcut: "⌘Z",
				nativeShortcut: true,
				onClickFunc: classicyEditCommands.undo,
			},
			{ id: "spacer" },
			{
				id: `${idPrefix}_cut`,
				title: "Cut",
				accessKey: ak("t"),
				disabled: noSelection || target.readOnly || target.password,
				keyboardShortcut: "⌘X",
				nativeShortcut: true,
				onClickFunc: classicyEditCommands.cut,
			},
			{
				id: `${idPrefix}_copy`,
				title: "Copy",
				accessKey: ak("c"),
				disabled: noSelection || target.password,
				keyboardShortcut: "⌘C",
				nativeShortcut: true,
				onClickFunc: classicyEditCommands.copy,
			},
			{
				id: `${idPrefix}_paste`,
				title: "Paste",
				accessKey: ak("p"),
				disabled: !target.target || target.readOnly,
				keyboardShortcut: "⌘V",
				nativeShortcut: true,
				onClickFunc: () => {
					void classicyEditCommands.paste();
				},
			},
			{
				id: `${idPrefix}_clear`,
				title: "Delete",
				accessKey: ak("l"),
				disabled: noSelection || target.readOnly,
				keyboardShortcut: "⌦",
				nativeShortcut: true,
				onClickFunc: classicyEditCommands.clear,
			},
			{ id: "spacer" },
			{
				id: `${idPrefix}_select_all`,
				title: "Select All",
				accessKey: ak("A"),
				disabled: !target.target || !target.text,
				keyboardShortcut: "⌘A",
				nativeShortcut: true,
				onClickFunc: classicyEditCommands.selectAll,
			},
			...(preferencesItem
				? [{ id: "spacer" } as ClassicyMenuItem, preferencesItem]
				: []),
		],
	};
};
