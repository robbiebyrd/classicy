import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { useClassicySelectedIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicySelectedIconImage.internal";
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex.internal";
import "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss";
import {
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { defaultBalloonForKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
import { takeClassicyDesktopIconKeyboardSelection } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKeyboardSelection.internal";
import { isAliasKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds";
import {
	startClassicyDesktopIconRename,
	stopClassicyDesktopIconRename,
	useClassicyDesktopIconRenaming,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import {
	type ClassicyDesktopIconSelectMode,
	classicyDesktopFocusIconId,
	classicyDesktopSpaceSelection,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import { classicyDesktopIconSelectMode } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopSelectBox.internal";
import { useClassicyFileCut } from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import { transferClassicyFileSystemItems } from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	type ClassicyFileDropDestination,
	type ClassicyFileDropEffect,
	type ClassicyFileDropTarget,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	classicyFileDragAppearanceCallbacks,
	useClassicyFileDragEndOnUnmount,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAppearance.internal";
import type { ClassicyFileDragOutlinePart } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import {
	classicyFileDropEffects,
	useClassicyFileDropMenu,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDropMenu";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	renameClassicyFileSystemItem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	classicyDesktopIconPropertiesTarget,
	classicyPropertiesOpenAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import { APP_SHORTCUT_ICON_KIND } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicyDisplayFileName } from "@/SystemFolder/SystemResources/File/useClassicyDisplayFileName";
import { ClassicyRenameField } from "@/SystemFolder/SystemResources/Icon/ClassicyRenameField.internal";
import {
	classicyIconsRoveFocus,
	classicyWindowsSelectionKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { useClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	classicyIconDragThreshold,
	classicySecondaryButtonSelects,
	classicyTraveledPast,
	isClassicyGestureButton,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

import "./ClassicyDesktopIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

interface ClassicyDesktopIconProps {
	/**
	 * Id of the app (or other target) the icon stands for. Keys the icon's
	 * store record (position, selection) and forms the DOM id
	 * `${appId}.shortcut`.
	 */
	appId: string;
	/**
	 * App name, used as the label when `label` is unset and as the image alt
	 * text; for an `app_shortcut`, an Appearance Package's `apps` override is
	 * shown instead. The open action and analytics always carry this name.
	 */
	appName: string;
	/**
	 * Icon image (URL or data URI); for an `app_shortcut`, an Appearance
	 * Package's `apps` override is shown instead.
	 */
	icon: string;
	/** Text under the icon. Defaults to the displayed app name. */
	label?: string;
	/**
	 * Icon kind: `drive`, `directory`, `app_shortcut`, `shortcut`, `trash`,
	 * `file` or `icon` (also the desktop's sort order). `app_shortcut` and
	 * `shortcut` draw the alias arrow and an italic label; `trash` and `drive`
	 * get stock balloon help. Defaults to `"icon"`, the same default
	 * `ClassicyDesktopIconAdd` gives a record without one.
	 */
	kind?: string;
	/**
	 * Called when the icon is opened: a double-click, or Enter or Space when
	 * focused (Enter alone under `layout.selection.keyboard` `"windows"`,
	 * where Space selects).
	 */
	onClickFunc?: () => void;
	/**
	 * Action type dispatched when the icon is opened, with `eventData` spread
	 * in. Dispatched only when `eventData` is also set.
	 */
	event?: string;
	/** Fields spread into the `event` action. */
	eventData?: Record<string, unknown>;
	/**
	 * Skip the default open (`ClassicyDesktopIconOpen`, which opens the app)
	 * so only `onClickFunc` and `event` run — e.g. a web shortcut that
	 * dispatches `ClassicyDesktopOpenUrl`. Defaults to `false`.
	 */
	noLaunch?: boolean;
	/**
	 * Right-click menu for this icon. Right-clicking selects the icon first;
	 * with no menu it shows nothing. Under a package whose layout says
	 * `selection.secondaryButton: "select"` (Windows 98), a right-click on
	 * an icon that is already selected keeps the whole selection, so the
	 * menu acts on every selected icon.
	 */
	contextMenu?: ClassicyMenuItem[];
	/**
	 * Balloon help, `{ title?, content, position?, delay? }`, titled with the
	 * label (or the displayed app name) when it has no title. When omitted, an
	 * `app_shortcut` shows its app's description (an Appearance Package's
	 * `apps` override, else the registered manifest's), `trash` and `drive`
	 * icons use stock copy titled with the label, and other kinds show no
	 * balloon. (`ClassicyApp` fills this from its `desktopIconBalloonHelp`.)
	 */
	balloonHelp?: ClassicyIconBalloonHelp;
	/**
	 * The file system path the icon stands for (a drive, the Trash, or an item
	 * in the Desktop Folder). A drive, `trash` or `directory` icon with a path
	 * is a drop target for Finder drags. Any other kind is itself dragged as a
	 * file: its dotted outline can be let go on the desktop (the icon moves
	 * there) or on a folder (`onMoveFilePaths`).
	 */
	filePath?: string;
	/**
	 * Move file-backed desktop icons' items into a folder. Called with the
	 * paths of every selected file-backed icon when the outline is let go on a
	 * folder, a drive or a Finder window, the drop target itself, its
	 * marked element included (for `activateClassicyDropWindow`, which
	 * activates an inactive Finder window a drop lands in under
	 * `layout.transfer.activateDropWindow`), and what the drop does:
	 * `"move"`, else, under the package's `layout.transfer` (Windows 98),
	 * `"copy"` (Control held at the release, or the transfer menu's Copy
	 * Here) or `"link"` (Control and Shift, or Create Shortcut(s) Here); a
	 * copy or shortcut let go on the desktop itself is made by the icon.
	 * `ClassicyDesktop` supplies it.
	 */
	onMoveFilePaths?: (
		paths: string[],
		destination: ClassicyFileDropDestination,
		target?: ClassicyFileDropTarget,
		effect?: ClassicyFileDropEffect,
	) => void;
	/**
	 * Open a file-backed icon's item (a folder in Finder, a file in its app).
	 * Called with `filePath` when a non-drive file-backed icon is opened, in
	 * addition to `onClickFunc`/`event`. `ClassicyDesktop` supplies it.
	 */
	onOpenFilePath?: (path: string) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/**
	 * Inline style, merged onto the root element after the component's own, so
	 * its keys win. A `left`/`top` here overrides the icon's stored desktop
	 * location, so the icon no longer follows a drag.
	 * Stacking belongs to the icon states (ClassicyDesktopIcon.scss: 10, dragging 500), so a
	 * `zIndex` here is dropped.
	 */
	style?: CSSProperties;
}

/** File-backed icons drag as files; drives and the Trash only take drops. */
const draggedAsFile = (kind: string, filePath: string | undefined) =>
	filePath !== undefined && kind !== "drive" && kind !== "trash";

/**
 * A Mac OS 8 desktop icon: image plus label, positioned on the desktop. Click
 * selects it, drag moves it (dragging a selected icon moves the whole
 * selection), and double-click — or Enter/Space when focused — opens it. The
 * icon of an open app, or of a folder with an open Finder window, draws in the
 * shaded "open" state.
 *
 * Under a package whose layout says `mouse: "windows"` (Windows 98), only
 * button 1 drags an icon and a non-file icon moves only once the pointer is
 * 4 px from the press; button 2 selects, and the middle button does
 * nothing. Under `selection.secondaryButton: "select"`, a right-click on a
 * selected icon keeps the whole selection for its menu; under
 * `input.escapeCancels`, Escape mid-drag puts a non-file icon (and the
 * selection it carries) back where the press found it.
 *
 * Under `selection.modifiers: "windows"` (WIG Ch.5 "Selection Adjustment",
 * pp.38-39; App. A Tables A.2 and A.3) a Control- or ⌘-click toggles the
 * icon, a Shift-click selects the anchor's rectangle to it, both set that
 * rectangle to the anchor's state (`ClassicyDesktopIconSelect`); a modified
 * press on an unselected icon applies at the press, as Table A.3's
 * "CTRL+Press" selects, and on a selected one at the click, so a drag from
 * it carries the selection as it is (A.6). Under `selection.keyboard:
 * "windows"` the icon is an option of the desktop's list box
 * (`role="option"`, `aria-selected`): Space selects it, Control or ⌘ with
 * Space toggles it, Shift with Space extends to it, and Enter alone opens
 * it. Under `selection.iconNavigation: "roving"` only the desktop's focus
 * icon (`classicyDesktopFocusIconId`: the icon last pressed or moved to,
 * else the first) is a Tab stop.
 *
 * Icons whose `kind` is `app_shortcut` or `shortcut` — every icon `ClassicyApp`
 * registers — render the alias arrow over the bottom-left corner and an
 * italic label (`isAliasKind`); system kinds get neither. Swap the arrow art by
 * registering your own `aliasBadge` with
 * `registerClassicySystemArt("<package>", { aliasBadge })`
 * (read at render time, so a later registration takes effect).
 *
 * You rarely render this directly: `ClassicyDesktop` draws one for each record
 * in `System.Manager.Desktop.icons`, which `ClassicyApp` and the
 * `ClassicyDesktopIconAdd` action populate. Reads selection, position and
 * open state from the store, so it must render inside a desktop.
 *
 * ```ts
 * dispatch({
 *   type: "ClassicyDesktopIconAdd",
 *   app: { id: "example_site", name: "Example", icon },
 *   kind: "shortcut",
 *   noLaunch: true,
 *   event: "ClassicyDesktopOpenUrl",
 *   eventData: { url: "https://example.com/", disposition: "classicy" },
 * });
 * ```
 */
/**
 * A Desktop Folder item's name field while it is renamed in place
 * (`startClassicyDesktopIconRename`): Return or a click elsewhere renames
 * the item through `renameClassicyFileSystemItem` (its refusals told as
 * any rename's) and selects its icon under the new name; Escape cancels.
 */
const ClassicyDesktopIconRenameField: FunctionalComponent<{
	iconId: string;
	filePath: string;
}> = ({ iconId, filePath }) => {
	const getFileSystem = useClassicyFileSystemAccessor();
	const desktopEventDispatch = useAppManagerDispatch();
	const shownNames = useClassicyDisplayFileName();
	const fs = getFileSystem();
	const name = filePath.split(fs.separator).pop() ?? filePath;
	// A hidden extension (`layout.files.extensions`) is left off the field
	// and kept on the new name.
	const extension = shownNames.hiddenExtension(name, fs.resolve(filePath));
	return (
		<ClassicyRenameField
			className={"classicyDesktopIconRename"}
			name={name.slice(0, name.length - extension.length)}
			onCommit={(typed) => {
				stopClassicyDesktopIconRename(iconId);
				const value = typed + extension;
				if (value === name) return;
				const renamed = renameClassicyFileSystemItem(
					getFileSystem(),
					filePath,
					value,
					desktopEventDispatch,
				);
				if (renamed) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconFocus",
						iconId: `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${renamed}`,
					});
				}
			}}
			onCancel={() => stopClassicyDesktopIconRename(iconId)}
		/>
	);
};

export const ClassicyDesktopIcon: FunctionalComponent<ClassicyDesktopIconProps> =
	memo(
		({
			appId,
			appName,
			icon,
			label,
			kind = "icon",
			onClickFunc,
			event,
			eventData,
			noLaunch = false,
			contextMenu,
			balloonHelp,
			filePath,
			onMoveFilePaths,
			onOpenFilePath,
			className,
			style,
		}) => {
			const aliasBadge = useClassicyAsset("systemArt", "aliasBadge") ?? "";
			// A Desktop Folder item cut and waiting for a Paste (Explorer's
			// Cut): the root carries `classicyFileCut` until the Paste, another
			// Cut or Copy, or Escape.
			const isCut = useClassicyFileCut(
				draggedAsFile(kind, filePath) ? filePath : undefined,
			);
			// The icon draws at the theme's desktop icon size: a theme that sets
			// it to the small-icon size or less draws the leaf's small image.
			const desktopIconSize = useAppManager(
				(s) => s.System?.Manager?.Appearance?.activeTheme?.desktop?.iconSize,
			);
			// How the active package shows the app. Only an app shortcut stands
			// for its app: drives share Finder.app's id, and other kinds name
			// their own target.
			const isAppShortcut = kind === APP_SHORTCUT_ICON_KIND;
			const identity = useClassicyAppIdentity(
				isAppShortcut ? appId : undefined,
				{
					name: appName,
					icon,
					description: isAppShortcut
						? getAppManifest(appId)?.description
						: undefined,
				},
			);
			const [clickPosition, setClickPosition] = useState<[number, number]>([
				0, 0,
			]);
			const [dragging, setDragging] = useState<boolean>(false);
			const didDragRef = useRef(false);
			// The press discipline (`layout.mouse`, button 2's selection,
			// Escape's cancel): the active package's layout.
			const layout = useClassicyAppearanceLayout();
			// The press of a drag of the icon itself (a non-file icon): where
			// the pointer went down, to wait for the drag threshold, and the
			// icon's location then, for Escape to put it back.
			const pressRef = useRef<{
				point: [number, number];
				location: [number, number] | null;
			}>({ point: [0, 0], location: null });
			// Set when Escape took the drag back: the release ending its press
			// reports no halt (`stopChangeIcon`), and its click selects nothing.
			const canceledRef = useRef(false);
			// The press's modified selection (`selection.modifiers` "windows"):
			// its mode, null for a plain press, and whether the press applied
			// it (an unselected icon) or left it to the click (a selected one,
			// so a drag from it carries the selection, A.6). Undefined before
			// any press, and after the click that ends one.
			const pressModeRef = useRef<
				| { mode: ClassicyDesktopIconSelectMode | null; applied: boolean }
				| undefined
			>(undefined);
			// Set when the press's file drag began: the click a release over
			// the icon ends it with applies no deferred selection.
			const fileDraggedRef = useRef(false);
			// Set when the press's outline drag began (`layout.transfer.
			// desktopIconDrag` "outline"): the click a release over the icon
			// ends it with selects nothing, as after a drag of the icon itself.
			const outlineDraggedRef = useRef(false);
			// Windows' selection keys (`selection.keyboard`): Space selects and
			// the icon is a list box option. One Tab stop on the desktop
			// (`selection.iconNavigation` "roving"): the focus icon.
			const windowsKeys = classicyWindowsSelectionKeys(layout);
			const roving = classicyIconsRoveFocus(layout);
			// A Desktop Folder item's name, edited in place (Explorer's Rename
			// and New, F2): only an item's icon has a name to edit.
			const isDesktopItem =
				filePath !== undefined &&
				appId.startsWith(CLASSICY_DESKTOP_ITEM_ICON_PREFIX);
			const renaming = useClassicyDesktopIconRenaming(appId) && isDesktopItem;

			const isSelected = useAppManager(
				(s) => s.System.Manager.Desktop.selectedIcons?.includes(appId) ?? false,
			);
			// Selected, the image the active package draws for it selected, as
			// ClassicyIcon does (`registerClassicySelectedIconImages`).
			const {
				image: iconImage,
				plain: iconUrl,
				drawsSelectedImage,
			} = useClassicySelectedIconImage(
				identity.icon,
				desktopIconSize ?? Number.POSITIVE_INFINITY,
				isSelected,
			);
			// A click on a selected icon still changes the selection when it
			// collapses a multiple selection down to this icon.
			const isMultipleSelection = useAppManager(
				(s) => (s.System.Manager.Desktop.selectedIcons?.length ?? 0) > 1,
			);
			const iconLocation = useAppManager((s) => {
				const icon = s.System.Manager.Desktop.icons.find(
					(i) => i.appId === appId,
				);
				return icon?.location ?? null;
			});
			const isOpen = useAppManager(
				(s) => !!s.System.Manager.Applications.apps[appId]?.open,
			);
			// The desktop's focus icon, its one Tab stop under "roving".
			const isFocusIcon = useAppManager((s) => {
				if (!roving) return false;
				const desktop = s.System.Manager.Desktop;
				return (
					classicyDesktopFocusIconId(
						(desktop.icons ?? []).filter((i) => !i.hidden),
						desktop.focusIcon,
					) === appId
				);
			});
			// Only Finder folder icons — drives, and folders in the Desktop
			// Folder — care about a window: true while the Finder window for this
			// icon's folder path is registered and not closed.
			const finderFolderPath = appId.startsWith("Finder.app")
				? eventData?.path
				: kind === "directory"
					? filePath
					: undefined;
			const finderPathWindowOpen = useAppManager((s) => {
				if (finderFolderPath === undefined) return false;
				const path = finderFolderPath;
				const w = getAppWindow(
					s.System.Manager.Applications.apps["Finder.app"],
					typeof path === "string" ? path : undefined,
				);
				return w !== undefined && !w.closed;
			});
			const desktopEventDispatch = useAppManagerDispatch();
			const { showContextMenu } = useClassicyContextualMenu();

			const iconRef = useRef<HTMLDivElement>(null);
			// The press that selects an icon reports it; the click ending that
			// press must not report it again.
			const selectedOnPressRef = useRef(false);
			// Set when a press or click on the icon has reported the selection
			// change it makes, so the selection effect below does not report it
			// again.
			const selectReportedRef = useRef(false);
			// One dragEnd per dragStart: mouseup also ends presses that never dragged.
			const dragEmittedRef = useRef(false);
			// A file drag in progress ends (canceled) before the icon unmounts.
			const endFileDragOnUnmount = useClassicyFileDragEndOnUnmount();
			// Button 2 drags a file icon too, ending in Windows 98 SE's
			// transfer menu (`layout.transfer.secondaryButton` "menu").
			const dropMenu = useClassicyFileDropMenu();

			// Stock copy, the app's description and the title are resolved here,
			// not stored on the icon record, so revised text ships with the
			// library rather than staying frozen in localStorage, and they follow
			// the active package.
			// The text under the icon, which also titles its balloon: an empty
			// label falls back to the name too. (Only an app shortcut's name can
			// differ from `appName`, and only kinds that are not one get stock
			// copy.)
			// A Desktop Folder item's name as the package shows it: under
			// `layout.files.extensions` "hideRegistered" (Windows 98) a
			// registered type's extension is hidden.
			const shownNames = useClassicyDisplayFileName();
			const getItemFileSystem = useClassicyFileSystemAccessor();
			const itemName =
				shownNames.hides && isDesktopItem && filePath !== undefined && !label
					? shownNames.display(
							identity.name,
							getItemFileSystem().resolve(filePath),
						)
					: identity.name;
			const shownName = label || itemName;
			const effectiveBalloonHelp = balloonHelp
				? { ...balloonHelp, title: balloonHelp.title ?? shownName }
				: identity.description
					? { title: shownName, content: identity.description }
					: defaultBalloonForKind(kind, shownName);
			const { handlers: balloonHandlers, balloon } = useClassicyBalloonHelp(
				iconRef,
				effectiveBalloonHelp,
			);

			const id = `${appId}.shortcut`;
			const { track } = useClassicyAnalytics();
			const analyticsArgs = { appId, appName, icon, label, kind };

			const clickFocus = (e: MouseEvent<HTMLDivElement>) => {
				e.stopPropagation();
				const press = pressModeRef.current;
				pressModeRef.current = undefined;
				if (didDragRef.current || outlineDraggedRef.current) {
					didDragRef.current = false;
					outlineDraggedRef.current = false;
					selectedOnPressRef.current = false;
					return;
				}
				// Only when selection actually changes, so "focus" means the icon
				// BECAME selected rather than "an icon was clicked". The dispatch
				// below stays unconditional -- clicking an already-selected icon
				// still collapses a multiple selection down to this one.
				if (!isSelected) {
					track("focus", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				}
				// A modified click under `selection.modifiers` "windows" (the
				// press's modifiers; a click no press began reads its own):
				// the press applied it to an unselected icon, the click applies
				// it to a selected one, unless a file drag took the press.
				// Never the collapse below.
				const mode =
					e.type !== "click"
						? null
						: press
							? press.mode
							: classicyDesktopIconSelectMode(e, layout);
				if (mode) {
					// The press's change, if it made one, is committed and
					// reported by now; one that changed nothing (a Control-Shift
					// press by an unselected anchor) must not hide the next.
					if (press?.applied) selectReportedRef.current = false;
					if (!press?.applied && !fileDraggedRef.current) {
						desktopEventDispatch({
							type: "ClassicyDesktopIconSelect",
							iconId: appId,
							mode,
						});
						selectReportedRef.current = true;
						appearance.emit("select", withClassicyAppearanceInput());
					}
					selectedOnPressRef.current = false;
					iconRef.current?.focus({ preventScroll: true });
					return;
				}
				// "select" reports a change of selection: this icon becoming
				// selected, or a multiple selection collapsing to it -- never a
				// click on the icon that already is the selection.
				const selectionChanges = !isSelected || isMultipleSelection;
				desktopEventDispatch({
					type: "ClassicyDesktopIconFocus",
					iconId: appId,
				});
				if (selectedOnPressRef.current) selectedOnPressRef.current = false;
				else if (selectionChanges) {
					selectReportedRef.current = true;
					appearance.emit("select", withClassicyAppearanceInput());
				}
				// Take keyboard focus from whatever window had it, so Delete and
				// the arrow keys act on the desktop's selection.
				iconRef.current?.focus({ preventScroll: true });
			};

			const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
				if (dragging) {
					// Under `layout.mouse` "windows" the icon stays put until the
					// pointer is 4 px from the press (Windows' drag rectangle),
					// so a click that jitters is still a click.
					if (
						!didDragRef.current &&
						!classicyTraveledPast(
							pressRef.current.point,
							[e.clientX, e.clientY],
							classicyIconDragThreshold(layout),
						)
					) {
						return;
					}
					didDragRef.current = true;
					desktopEventDispatch({
						type: "ClassicyDesktopIconMove",
						app: {
							id: appId,
						},
						location: [
							e.clientX - clickPosition[0],
							e.clientY - clickPosition[1],
						],
					});
				}
			};

			// Explorer's Properties from the icon (`layout.finder.commands`
			// "windows"; WIG App. B Table B.2, p.358: Alt+Enter; Ch.5 "View
			// Shortcuts", p.47: an Alt double-click): the property sheet of
			// the desktop's selection when the icon is in it, else of the
			// icon's item or application.
			const propertiesFromIcon = layout.finder?.commands === "windows";
			const showProperties = () => {
				const desktop = useAppManager.getState?.()?.System?.Manager?.Desktop;
				if (!desktop) return;
				const target = classicyDesktopIconPropertiesTarget(
					desktop.icons,
					desktop.selectedIcons ?? [],
					appId,
				);
				if (target) desktopEventDispatch(classicyPropertiesOpenAction(target));
			};

			const launchIcon = () => {
				// A double-click or Enter/Space.
				appearance.emit("open", withClassicyAppearanceInput());
				if (onClickFunc) {
					onClickFunc();
				}
				if (filePath !== undefined && draggedAsFile(kind, filePath)) {
					onOpenFilePath?.(filePath);
				}
				if (event && eventData) {
					desktopEventDispatch({
						type: event,
						...eventData,
					});
				}
				track("open", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				if (!noLaunch) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconOpen",
						iconId: id,
						app: {
							id: appId,
							name: appName,
							icon: icon,
						},
					});
				}
			};

			const thisLocation = useMemo(() => {
				if (!iconLocation) return [0, 0];
				return [iconLocation[1], iconLocation[0]];
			}, [iconLocation]);

			const isLaunched = () => {
				// Check if a Finder window is open
				if (finderFolderPath !== undefined) {
					return finderPathWindowOpen;
				}
				return isOpen;
			};

			const appearance = useClassicyAppearance(
				"DesktopIcon",
				{ selected: isSelected, open: isLaunched(), dragging },
				iconRef,
			);

			// Selection the desktop makes from the keyboard (its arrow keys and
			// type-ahead; ruling I-R14) reaches the icon only as store state, so
			// the icon reports it here, after the commit, when it became
			// selected or a multiple selection collapsed to it. The desktop
			// marks the id it selects (ClassicyDesktopIconKeyboardSelection),
			// and only a marked change is reported: a selection rectangle or a
			// selection set in code carries no mark, whatever key was pressed
			// last. A press or click on the icon has already reported its own
			// change (selectReportedRef).
			const selectionRef = useRef({ isSelected, isMultipleSelection });
			const emitAppearance = appearance.emit;
			useEffect(() => {
				const previous = selectionRef.current;
				selectionRef.current = { isSelected, isMultipleSelection };
				const reported = selectReportedRef.current;
				selectReportedRef.current = false;
				// Deselected mid-press (an arrow key while the mouse is down):
				// the click ending the press re-selects the icon, a new change
				// it must report.
				if (previous.isSelected && !isSelected)
					selectedOnPressRef.current = false;
				const becameSelection =
					isSelected &&
					(!previous.isSelected ||
						(previous.isMultipleSelection && !isMultipleSelection));
				if (!becameSelection) return;
				const fromKeyboard = takeClassicyDesktopIconKeyboardSelection(appId);
				if (fromKeyboard && !reported)
					emitAppearance("select", { input: "keyboard" });
			}, [appId, isSelected, isMultipleSelection, emitAppearance]);

			// `lost`: ended by the pointer stream being lost, not by a release.
			const stopChangeIcon = (lost: boolean) => {
				// Bound to onMouseUp, so this runs on every release on the icon.
				// Report only a drag that actually happened. didDragRef -- not
				// the `dragging` state -- is the signal: setDragging(true) runs
				// in startDrag on mousedown, so `dragging` is already true for a
				// plain click, while didDragRef is set in changeIcon only once
				// the pointer moved while held down.
				if (didDragRef.current && !canceledRef.current) {
					track("halt", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				}
				setDragging(false);
				setClickPosition([0, 0]);
				if (dragEmittedRef.current) {
					dragEmittedRef.current = false;
					appearance.emit("dragEnd", { lost });
				}
			};

			// Escape mid-drag, under a package whose layout says
			// `input.escapeCancels` (Windows 98; WIG Ch.4 "Shortcut Keys",
			// p.27): the icon goes back where the press found it (and the
			// selection it carried with it, ClassicyDesktopIconMove moving
			// them by the same distance), and the drag ends there.
			const cancelChangeIcon = () => {
				const from = pressRef.current.location;
				if (didDragRef.current && from) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconMove",
						app: { id: appId },
						location: from,
					});
				}
				canceledRef.current = true;
				// The click ending the press must not select as a click would.
				didDragRef.current = true;
				setDragging(false);
				setClickPosition([0, 0]);
				if (dragEmittedRef.current) {
					dragEmittedRef.current = false;
					appearance.emit("dragEnd", { lost: false, canceled: true });
				}
			};
			useClassicyEscapeCancel(dragging, cancelChangeIcon);

			// The pointer stream lost mid-drag (the window blurred, a
			// pointercancel, the page hidden): the icon stays where it was
			// dragged, as if released there, instead of following the pointer
			// back with no button held.
			useClassicyPointerStreamLost(dragging, () => stopChangeIcon(true));

			const startDrag = (e: MouseEvent<HTMLDivElement>) => {
				if (iconRef.current == null) {
					return;
				}
				// Under `layout.mouse` "windows" only buttons 1 and 2 press an
				// icon: the middle button and the others do nothing (WIG Ch.4
				// "Mouse Actions", pp.24-25).
				if (e.button !== 2 && !isClassicyGestureButton(e, layout)) return;

				track("move", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				didDragRef.current = false;
				canceledRef.current = false;
				fileDraggedRef.current = false;
				outlineDraggedRef.current = false;
				// Control, ⌘ or Shift under `selection.modifiers` "windows":
				// an unselected icon takes the modified selection now (WIG App.
				// A Table A.3, "CTRL+Press": "Selects the object"); a selected
				// one waits for the click, so a drag carries the selection.
				const mode = classicyDesktopIconSelectMode(e, layout);
				pressModeRef.current = { mode, applied: !isSelected };

				// If icon is not already selected, select just this one for the
				// drag (or, modified, adjust the selection by it).
				selectedOnPressRef.current = !isSelected;
				if (!isSelected) {
					desktopEventDispatch(
						mode
							? { type: "ClassicyDesktopIconSelect", iconId: appId, mode }
							: { type: "ClassicyDesktopIconFocus", iconId: appId },
					);
					selectReportedRef.current = true;
					appearance.emit("select", withClassicyAppearanceInput());
				} else if (roving && !isFocusIcon) {
					// A press on a selected icon gives it the focus alone
					// (comctl32's `LISTVIEW_LButtonDown`: `LISTVIEW_SetItemFocus`).
					desktopEventDispatch({
						type: "ClassicyDesktopIconMoveFocus",
						iconId: appId,
					});
				}

				if (draggedAsFile(kind, filePath)) {
					if (dropMenu.startsDrag(e)) startFileDrag(e);
					return;
				}
				// Button 2 selects (above) but drags only under the Mac's rule.
				if (!isClassicyGestureButton(e, layout)) return;
				// Under `layout.transfer.desktopIconDrag` "outline" (Windows 98)
				// the icons stay put and an outline of them is dragged.
				if (layout.transfer?.desktopIconDrag === "outline") {
					if (e.button === 0) startOutlineDrag(e);
					return;
				}

				const rect = iconRef.current.getBoundingClientRect();
				setClickPosition([e.clientX - rect.left, e.clientY - rect.top]);
				pressRef.current = {
					point: [e.clientX, e.clientY],
					location: iconLocation,
				};

				setDragging(true);
				dragEmittedRef.current = true;
				appearance.emit("dragStart");
			};

			// A file-backed icon drags as Finder items do: a dotted outline of every
			// selected icon follows the pointer, and the icons stay put until it is
			// let go — on the desktop they move there, on a folder their items move
			// into it.
			const startFileDrag = (e: MouseEvent<HTMLDivElement>) => {
				const desktop = useAppManager.getState().System.Manager.Desktop;
				const selected = new Set(desktop.selectedIcons ?? []);
				selected.add(appId);
				const dragged = desktop.icons.filter(
					(i) =>
						selected.has(i.appId) &&
						(i.appId === appId || draggedAsFile(i.kind, i.filePath)),
				);
				const parts: ClassicyFileDragOutlinePart[] = dragged.flatMap((i) => {
					const el =
						i.appId === appId
							? iconRef.current
							: document.getElementById(`${i.appId}.shortcut`);
					return el
						? [
								{
									image: el.querySelector<HTMLImageElement>(
										".classicyDesktopIconMask img",
									),
									label: el.querySelector("p"),
								},
							]
						: [];
				});
				const start: [number, number] = [e.clientX, e.clientY];
				const dragCallbacks = classicyFileDragAppearanceCallbacks(
					appearance.emit,
				);
				const paths = dragged.flatMap((i) =>
					i.filePath !== undefined && draggedAsFile(i.kind, i.filePath)
						? [i.filePath]
						: [],
				);
				// The drop by its effect: let go on the desktop, a move takes
				// the icons where their outline was, a copy or shortcut is
				// made there (each where its original's outline was); on a
				// folder, `onMoveFilePaths` transfers the items.
				const transferAt =
					(target: ClassicyFileDropTarget, point: [number, number]) =>
					(effect: ClassicyFileDropEffect) => {
						track("halt", { type: "ClassicyDesktopIcon", ...analyticsArgs });
						const delta: [number, number] = [
							point[0] - start[0],
							point[1] - start[1],
						];
						if (target.destination.kind !== "desktop") {
							onMoveFilePaths?.(paths, target.destination, target, effect);
							return;
						}
						const icons = useAppManager.getState().System.Manager.Desktop.icons;
						if (effect !== "move") {
							const placeOf = (path: string) =>
								icons.find((i) => i.filePath === path)?.location;
							transferClassicyFileSystemItems(
								getItemFileSystem(),
								paths,
								target.destination,
								desktopEventDispatch,
								effect,
								{
									desktopLocationFor: (_index, from) => {
										const place = placeOf(from);
										return place
											? [place[0] + delta[0], place[1] + delta[1]]
											: undefined;
									},
								},
							);
							return;
						}
						// Moving one icon moves the selection with it (see the
						// ClassicyDesktopIconMove reducer).
						const from = icons.find((i) => i.appId === appId)?.location ?? [
							0, 0,
						];
						desktopEventDispatch({
							type: "ClassicyDesktopIconMove",
							app: { id: appId },
							location: [from[0] + delta[0], from[1] + delta[1]],
						});
					};
				const abandon = startClassicyFileDrag({
					start: {
						clientX: start[0],
						clientY: start[1],
						ctrlKey: e.ctrlKey,
						shiftKey: e.shiftKey,
					},
					parts,
					source: iconRef.current,
					// The outline drags, not the icon: `dragging` stays off.
					...dragCallbacks,
					...dropMenu.dragOptions(e, {
						effects: (target) =>
							classicyFileDropEffects(
								getItemFileSystem(),
								paths,
								target.destination,
							),
						onStart: () => {
							fileDraggedRef.current = true;
							dragCallbacks.onStart();
						},
						transferAt,
					}),
					onDrop: (target, point, _outlineTopLeft, effect) => {
						if (target) transferAt(target, point)(effect);
					},
				});
				endFileDragOnUnmount(abandon);
			};

			// Under `layout.transfer.desktopIconDrag` "outline" (Windows 98; WIG
			// Ch.5 "Direct Manipulation Transfers", p.66: the source stays
			// where it is until the transfer completes): an icon that stands
			// for no file drags as Finder items do, a dotted outline of every
			// selected icon following the pointer while the icons stay put.
			// Only the desktop takes it (a folder, drive or the Trash neither
			// highlights nor accepts it, and shows the no-drop feedback); let
			// go there, the icons move as far as the pointer did; Escape or a
			// lost pointer stream leaves them where they were.
			const startOutlineDrag = (e: MouseEvent<HTMLDivElement>) => {
				const desktop = useAppManager.getState().System.Manager.Desktop;
				const selected = new Set(desktop.selectedIcons ?? []);
				selected.add(appId);
				const parts: ClassicyFileDragOutlinePart[] = desktop.icons
					.filter((i) => selected.has(i.appId))
					.flatMap((i) => {
						const el =
							i.appId === appId
								? iconRef.current
								: document.getElementById(`${i.appId}.shortcut`);
						return el
							? [
									{
										image: el.querySelector<HTMLImageElement>(
											".classicyDesktopIconMask img",
										),
										label: el.querySelector("p"),
									},
								]
							: [];
					});
				const start: [number, number] = [e.clientX, e.clientY];
				const abandon = startClassicyFileDrag({
					start: { clientX: start[0], clientY: start[1] },
					parts,
					source: iconRef.current,
					canDrop: (target) => target.destination.kind === "desktop",
					effects: () => ["move"],
					// The outline drags, not the icon: `dragging` stays off. The
					// package hears the drag as it hears the icon's own.
					onStart: () => {
						outlineDraggedRef.current = true;
						appearance.emit("dragStart");
					},
					onEnd: ({ canceled, lost }) =>
						appearance.emit(
							"dragEnd",
							canceled && !lost ? { lost, canceled: true } : { lost },
						),
					onDrop: (target, point) => {
						if (!target) return;
						track("halt", { type: "ClassicyDesktopIcon", ...analyticsArgs });
						// Moving one icon moves the selection with it (see the
						// ClassicyDesktopIconMove reducer).
						const from = useAppManager
							.getState()
							.System.Manager.Desktop.icons.find((i) => i.appId === appId)
							?.location ?? [0, 0];
						desktopEventDispatch({
							type: "ClassicyDesktopIconMove",
							app: { id: appId },
							location: [
								from[0] + point[0] - start[0],
								from[1] + point[1] - start[1],
							],
						});
					},
				});
				endFileDragOnUnmount(abandon);
			};

			const isAlias = isAliasKind(kind);

			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: the role is spread (a button, or an option of the desktop's list box under Windows' selection keys); desktop icon is a draggable div with ref and complex mouse handling incompatible with <button>
				<div
					{...appearance.attrs}
					{...(windowsKeys
						? { role: "option", "aria-selected": isSelected }
						: { role: "button" })}
					tabIndex={roving && !isFocusIcon ? -1 : 0}
					ref={iconRef}
					id={`${id}`}
					onMouseDown={startDrag}
					onMouseMove={changeIcon}
					onMouseUp={() => stopChangeIcon(false)}
					onDoubleClick={(e: MouseEvent<HTMLDivElement>) => {
						if (propertiesFromIcon && e.altKey) {
							e.preventDefault();
							showProperties();
							return;
						}
						launchIcon();
					}}
					draggable={false}
					{...(filePath !== undefined &&
					(kind === "drive" || kind === "directory" || kind === "trash")
						? { [CLASSICY_DROP_FOLDER_ATTRIBUTE]: filePath }
						: {})}
					onClick={clickFocus}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						// Windows: Alt+Enter shows the Properties (Table B.2).
						if (
							e.key === "Enter" &&
							e.altKey &&
							propertiesFromIcon &&
							!e.ctrlKey &&
							!e.metaKey &&
							!e.shiftKey
						) {
							e.preventDefault();
							e.stopPropagation();
							showProperties();
							return;
						}
						// Windows: F2 renames the item (Explorer's Rename), the
						// one selected (`layout.fileBrowser.keys` "windows").
						if (
							e.key === "F2" &&
							layout.fileBrowser?.keys === "windows" &&
							isDesktopItem &&
							isSelected &&
							!isMultipleSelection &&
							!e.shiftKey &&
							!e.altKey &&
							!e.ctrlKey &&
							!e.metaKey
						) {
							e.preventDefault();
							e.stopPropagation();
							startClassicyDesktopIconRename(appId);
							return;
						}
						// Space is the Select key under Windows' selection keys
						// (WIG Ch.5 "Keyboard Selection", p.43; comctl32's
						// `LISTVIEW_KeySelection`): it selects the icon, Control or
						// ⌘ toggling it, Shift extending to it, and is the icon's
						// alone (the desktop's type-ahead never sees it); Enter
						// opens.
						if (e.key === " " && windowsKeys) {
							const how = classicyDesktopSpaceSelection(e);
							if (!how) return;
							e.preventDefault();
							e.stopPropagation();
							const changes =
								how !== "select" || !isSelected || isMultipleSelection;
							desktopEventDispatch(
								how === "select"
									? { type: "ClassicyDesktopIconFocus", iconId: appId }
									: {
											type: "ClassicyDesktopIconSelect",
											iconId: appId,
											mode: how,
										},
							);
							if (changes) {
								selectReportedRef.current = true;
								appearance.emit("select", withClassicyAppearanceInput());
							}
							return;
						}
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							launchIcon();
						}
					}}
					onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
						// A Control-press (a macOS host's secondary click) ends in
						// this menu, never in a click.
						pressModeRef.current = undefined;
						if (e.defaultPrevented) return;
						e.preventDefault();
						// Under `selection.secondaryButton` "select" (Windows; WIG
						// Ch.5 "Selection with the Mouse", pp.37-38) a selected
						// icon keeps the whole selection, which its menu acts on;
						// the press (a discrete event, rendered before this one)
						// already selected an unselected one.
						if (classicySecondaryButtonSelects(layout) && isSelected) {
							e.stopPropagation();
							iconRef.current?.focus({ preventScroll: true });
						} else {
							clickFocus(e); // selects the icon and stops propagation
						}
						if (contextMenu && contextMenu.length > 0) {
							showContextMenu(contextMenu, [e.clientX, e.clientY]);
						}
					}}
					className={classNames(
						"classicyDesktopIcon",
						appearance.className,
						isAlias ? "classicyDesktopIconAlias" : "",
						isCut && "classicyFileCut",
						className,
					)}
					style={{
						// Package style first: the icon's location is its own (a
						// package never moves it), and only a consumer's wins over it.
						...withoutZIndex(appearance.style),
						top: thisLocation[0],
						left: thisLocation[1],
						...withoutZIndex(style),
					}}
					{...balloonHandlers}
				>
					<div className={"classicyDesktopIconImage"}>
						<div
							className={classNames(
								"classicyDesktopIconMaskOuter",
								drawsSelectedImage && "classicyDesktopIconSelectedImage",
							)}
							style={
								{
									"--classicy-icon-mask": `url("${iconUrl}")`,
								} as CSSProperties
							}
						>
							<div className={"classicyDesktopIconMask"}>
								<img src={iconImage} alt={identity.name} />
							</div>
						</div>
						{isAlias && (
							<div
								className={
									"classicyDesktopIconMaskOuter classicyDesktopIconAliasBadge"
								}
								style={
									{
										"--classicy-icon-mask": `url("${aliasBadge}")`,
									} as CSSProperties
								}
							>
								<div className={"classicyDesktopIconMask"}>
									<img src={aliasBadge} alt="" aria-hidden="true" />
								</div>
							</div>
						)}
					</div>
					{renaming && filePath !== undefined ? (
						<ClassicyDesktopIconRenameField
							iconId={appId}
							filePath={filePath}
						/>
					) : (
						<p>{shownName}</p>
					)}
					{balloon}
				</div>
			);
		},
	);

ClassicyDesktopIcon.displayName = "ClassicyDesktopIcon";
