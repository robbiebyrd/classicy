import { Calculator } from "@/SystemFolder/Calculator/Calculator";
import {
	getAllThemes,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useFrontAppId } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontApp";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import { AppleGuide } from "@/SystemFolder/Extensions/AppleGuide/AppleGuide";
import { ClassicyApplicationSwitcher } from "@/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcher";
import { ClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { classicyFinderFindMenuItem } from "@/SystemFolder/FindFile/ClassicyFinderFindMenuItem.internal";
import { FindFile } from "@/SystemFolder/FindFile/FindFile";
import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";
import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
import { SimpleText } from "@/SystemFolder/SimpleText/SimpleText";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import { isClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	isClassicyControlPress,
	openClassicyControlPressContextMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualPress.internal";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
import {
	ClassicyFloatingLayer,
	ClassicyFloatingLayerProvider,
} from "@/SystemFolder/SystemResources/Window/ClassicyFloatingLayer";
// Static, never lazy: WebViewer.tsx registers the "ClassicyAppWebViewer" plugin
// handler as a module-graph side effect (it imports ./WebViewerContext), not a
// mount side effect. A static import means the handler exists even when
// disableWebViewer is set — matching disableMoviePlayer — whereas a lazy import
// would make the "classicy" disposition a silent no-op until something else
// happened to pull the module in.
import { WebViewer } from "@/SystemFolder/WebViewer/WebViewer";
import "./ClassicyDesktop.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	startTransition,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	useActiveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import {
	useClassicyAsset,
	useClassicyAssetTree,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyLayoutThemeVars,
	classicyLayoutVars,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	resetClassicyPersistedState,
	resolveClassicyStateChoice,
	useClassicyStateMirrored,
	useClassicyStateSyncGate,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { getClassicyDefaultParadeIcons } from "@/SystemFolder/SystemResources/Boot/ClassicyDefaultParadeIcons";
import {
	ClassicyControlStrip,
	type ClassicyControlStripProps,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { markClassicyDesktopIconKeyboardSelection } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKeyboardSelection.internal";
import {
	type ArrowDirection,
	iconForArrowKey,
	iconForTabKey,
	typeaheadMatch,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import {
	classicyDisabledDefaultAppCleanup,
	classicyDisabledDefaultAppIds,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDisabledDefaultApps";
import { ClassicyNoAppearancePackage } from "@/SystemFolder/SystemResources/Desktop/ClassicyNoAppearancePackage";
import { ClassicyOpenUrlController } from "@/SystemFolder/SystemResources/Desktop/ClassicyOpenUrlController";
import {
	ClassicyEmptyTrashAlert,
	classicySpecialMenuItems,
	SYSTEM_DIALOG_WINDOW_IDS,
} from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { useClassicyThemeLinkImport } from "@/SystemFolder/SystemResources/Desktop/ClassicyThemeLinkImport.internal";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { useClassicyClientRender } from "@/SystemFolder/SystemResources/Desktop/useClassicyClientRender.internal";
import { useClassicyDesktopMarquee } from "@/SystemFolder/SystemResources/Desktop/useClassicyDesktopMarquee.internal";
import {
	CLASSICY_DROP_DESKTOP_ATTRIBUTE,
	type ClassicyFileDropDestination,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { APP_SHORTCUT_ICON_KIND } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	emptyClassicyTrash,
	listClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { moveClassicyFocusOutOf } from "@/SystemFolder/SystemResources/Keyboard/ClassicyTabbable.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyNotificationController } from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationController.internal";
import { useClassicyPatternOriginElements } from "@/SystemFolder/SystemResources/PatternOrigin/ClassicyPatternOrigin.internal";
import { withClassicyLaunchZoom } from "@/SystemFolder/SystemResources/Window/ClassicyLaunchZoom";
import type { ClassicyZoomOrigin } from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

import "../../../index.css";

// Stored package ids already reported as unregistered, once per page each.
const reportedUnregisteredPackageIds = new Set<string>();

export interface ClassicyDesktopProps {
	/** Your apps (`ClassicyApp`) and anything else to mount on the desktop. */
	children?: ReactNode;
	/**
	 * Show the startup screen (chime, progress bar and extension parade) once
	 * per browser-tab session. `false` skips it, along with a
	 * custom `bootScreen`. Defaults to `true`.
	 */
	startupScreen?: boolean;
	/** How long the default startup screen runs, in ms. Defaults to `4000`. */
	startupDuration?: number;
	/**
	 * Optional pre-boot "power on" screen shown before the startup sequence.
	 * Receives a `powerOn` callback — wire it to your button (e.g. POWER ON);
	 * calling it dismisses this screen and starts the boot chime + parade.
	 * Shown once per browser-tab session, like the startup screen.
	 */
	preBootScreen?: (powerOn: () => void) => ReactNode;
	/** Overrides the logo image on the default startup screen. Ignored when `bootScreen` is supplied. */
	startupLogo?: string;
	/** Overrides the wordmark text on the default startup screen. Ignored when `bootScreen` is supplied. */
	startupWordmark?: string;
	/**
	 * Replaces the default startup screen entirely. Rendered as-is in place of
	 * the built-in splash — it owns its own visuals, timing, and (if desired)
	 * session-once gating via the exported
	 * `hasShownStartupScreenThisSession`/`markStartupScreenShownThisSession`
	 * helpers. Still subject to the `startupScreen` gate. Call
	 * `useClassicyBootScreenActive(visible)` from it, so the desktop holds
	 * what must not open unseen behind it (a theme link's alerts, the
	 * Notification Manager's sounds and alerts) until it ends. Pass its real
	 * visibility: one that stays mounted, hidden, while passing `true` holds
	 * them for the whole session.
	 */
	bootScreen?: ReactNode;
	/**
	 * The Control Strip (HIGOS8 Figure 6-15) along the bottom left of the
	 * desktop — home of the Sound control. Shown by default with every
	 * registered module (`registerClassicyControlStripModule`); pass its props
	 * to configure it (`disabledModules`, `defaultCollapsed`, `defaultWidth`),
	 * or `false` to hide it.
	 */
	controlStrip?: boolean | ClassicyControlStripProps;
	/**
	 * Open the theme link in the page's address (`#classicy-theme=…`, which
	 * the Appearance Manager's Copy Theme Link makes), and offer Copy Theme
	 * Link. Off by default: the host decides whether its URLs import themes.
	 * A link is validated as a theme file is, the theme is added only when the
	 * user agrees in an alert (and in a second one before a remote desktop
	 * picture is used), and the link is then removed from the address.
	 */
	themeLinks?: boolean;
	/** Extra class names, merged onto the `#classicyDesktop` surface (a style is merged after the theme custom properties) after the component's own. */
	className?: string;
	/** Inline style, merged onto the `#classicyDesktop` surface (a style is merged after the theme custom properties) after the component's own. */
	style?: CSSProperties;
}

const ClassicyDesktopInner: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen = true,
	startupDuration = 4000,
	preBootScreen,
	startupLogo,
	startupWordmark,
	bootScreen,
	controlStrip = true,
	themeLinks = false,
	className,
	style,
}) => {
	const themeLinkAlert = useClassicyThemeLinkImport(themeLinks);
	const macosIcon = useClassicyAsset("icons", "system.macos") ?? "";
	const [showAbout, setShowAbout] = useState(false);

	const { showContextMenu } = useClassicyContextualMenu();
	const desktopRef = useRef<HTMLDivElement>(null);
	// The selection rectangle a drag from the bare desktop draws.
	const desktopMarquee = useClassicyDesktopMarquee(desktopRef);
	// The elements a package lays a pattern in from a fixed origin
	// (`layout.patternOrigin.elements`): those outside every window.
	useClassicyPatternOriginElements(desktopRef);
	const typePrefixRef = useRef<string>("");
	const typePrefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const availableThemes = useAppManager(
		(s) => s.System.Manager.Appearance.availableThemes,
	);
	const appearancePackages = useClassicyAppearancePackages();
	const activeTheme = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme,
	);
	// Mac OS 8 Smart Scrolling (Appearance control panel). Defaults to on when
	// unset (persisted stores from before this setting existed). Off adds the
	// split-arrows modifier class, which cascades scrollbar styling to every
	// scrollable surface below the desktop root.
	const smartScrolling = useAppManager(
		(s) => s.System.Manager.Appearance.smartScrolling,
	);
	const allDesktopIcons = useAppManager((s) => s.System.Manager.Desktop.icons);
	// Hidden icons exist only to populate the derived Applications folder; they
	// must never be drawn on, or navigable within, the desktop.
	const desktopIcons = useMemo(
		() => allDesktopIcons.filter((i) => !i.hidden),
		[allDesktopIcons],
	);
	// Type-select matches the name each icon shows: an unlabeled app
	// shortcut shows the active package's display name for its app.
	const appIdentityOverrides = useClassicyAppIdentityOverrides();
	const typeaheadIcons = useMemo(
		() =>
			desktopIcons.map((i) =>
				i.kind === APP_SHORTCUT_ICON_KIND && !i.label
					? {
							...i,
							label: classicyAppIdentityFrom(appIdentityOverrides, i.appId, {
								name: i.appName,
								icon: i.icon,
							}).name,
						}
					: i,
			),
		[desktopIcons, appIdentityOverrides],
	);
	const selectedIcons = useAppManager(
		(s) => s.System.Manager.Desktop.selectedIcons ?? [],
	);
	const errorDialog = useAppManager(
		(s) => s.System.Manager.Desktop.errorDialog,
	);
	const systemDialog = useAppManager(
		(s) => s.System.Manager.Desktop.systemDialog ?? null,
	);
	const focusedAppId = useFrontAppId();
	const finderHasOpenWindow = useAppManager((s) =>
		listAppWindows(s.System.Manager.Applications.apps["Finder.app"]).some(
			(w) => !w.closed,
		),
	);
	const desktopEventDispatch = useAppManagerDispatch();

	const defaultApps = useContext(ClassicyDefaultAppsContext);
	const {
		disableSimpleText,
		disablePDFViewer,
		disableMoviePlayer,
		disablePictureViewer,
		disableHyperCard,
		disableWebViewer,
		disableCalculator,
	} = defaultApps;

	// A disabled default app never mounts, so nothing it saved in an earlier
	// visit (its Apple-menu entry, its Applications listing, an open record)
	// would otherwise go away. Runs after the children's effects, so an app
	// the host renders itself is already marked mounted and kept.
	const disabledAppsKey = classicyDisabledDefaultAppIds(defaultApps).join("|");
	useEffect(() => {
		if (!disabledAppsKey) return;
		for (const action of classicyDisabledDefaultAppCleanup(
			disabledAppsKey.split("|"),
			useAppManager.getState(),
			isClassicyAppMounted,
		))
			desktopEventDispatch(action);
	}, [disabledAppsKey, desktopEventDispatch]);

	// Special ▸ Reset PRAM: forget every saved setting and start over (a
	// desktop state adapter's copy too: ClassicyStateSync.internal.ts). The
	// wristwatch shows while the adapters take the reset (HIG7 p.270).
	const stateMirrored = useClassicyStateMirrored();
	const setCursor = useClassicyCursor();
	const resetPram = useCallback(() => {
		setCursor("watch");
		resetClassicyPersistedState(() => {
			resetStartupScreenSession();
			window.location.reload();
		});
	}, [setCursor]);

	const closeSystemDialog = useCallback(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopShowSystemDialog",
			dialog: null,
		});
	}, [desktopEventDispatch]);

	// Focus the Special menu's alert when it opens
	useEffect(() => {
		if (systemDialog) {
			desktopEventDispatch({
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: { id: SYSTEM_DIALOG_WINDOW_IDS[systemDialog] },
			});
		}
	}, [systemDialog, desktopEventDispatch]);

	// Desktop items (Desktop Folder files and folders) and the Trash are read
	// through the shared file system at the moment of the event — the desktop
	// itself doesn't re-render on file system changes.
	const getFileSystem = useClassicyFileSystemAccessor();

	// Special ▸ Empty Trash, once confirmed: remove the Trash's contents for
	// good, and close any Finder window open on a folder inside it.
	const emptyTrash = useCallback(() => {
		emptyClassicyTrash(getFileSystem());
		const finder =
			useAppManager.getState().System.Manager.Applications.apps["Finder.app"];
		const openPaths = (finder?.data as { openPaths?: unknown } | undefined)
			?.openPaths;
		for (const path of Array.isArray(openPaths) ? openPaths : []) {
			if (
				typeof path === "string" &&
				path.startsWith(`${CLASSICY_TRASH_PATH}:`)
			) {
				desktopEventDispatch({ type: "ClassicyAppFinderCloseFolder", path });
			}
		}
	}, [getFileSystem, desktopEventDispatch]);

	// File ▸ Move To Trash, ⌃⌫ or Delete on the desktop: trash the items of
	// the selected file and folder icons (not drives, apps or the Trash).
	const trashSelectedDesktopItems = useCallback(() => {
		const desktop = useAppManager.getState().System.Manager.Desktop;
		const selected = new Set(desktop.selectedIcons ?? []);
		const paths = desktop.icons.flatMap((i) =>
			selected.has(i.appId) &&
			i.filePath !== undefined &&
			i.kind !== "drive" &&
			i.kind !== "trash"
				? [i.filePath]
				: [],
		);
		if (paths.length === 0) return false;
		moveClassicyItemsToTrash(getFileSystem(), paths, desktopEventDispatch);
		return true;
	}, [getFileSystem, desktopEventDispatch]);

	// Register the classic extension icons in the boot parade on mount.
	// Adds dedup by id, so a remount never duplicates entries.
	useEffect(() => {
		for (const entry of getClassicyDefaultParadeIcons()) {
			desktopEventDispatch({ type: "ClassicyBootParadeIconAdd", ...entry });
		}
	}, [desktopEventDispatch]);

	// Load the registered packages' built-in themes on mount if not already
	// loaded. Not while no package is registered: getAllThemes() is then the
	// core default theme alone, which as a loaded theme would shadow the
	// default package's own "default"; the first registration loads them.
	useEffect(() => {
		if (
			appearancePackages.length > 0 &&
			availableThemes &&
			availableThemes.length <= 0
		) {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopLoadThemes",
					availableThemes: getAllThemes(),
				});
			});
		}
	}, [desktopEventDispatch, availableThemes, appearancePackages]);

	// Cancel any pending typeahead timer on unmount
	useEffect(() => {
		return () => {
			if (typePrefixTimerRef.current !== null) {
				clearTimeout(typePrefixTimerRef.current);
			}
		};
	}, []);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;
			const isOnIcon = target.closest(".classicyDesktopIcon") !== null;
			const isOnDesktop = target === desktopRef.current;
			if (!isOnIcon && !isOnDesktop) return;

			const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
			// Selects `iconId` and, when that changes the selection, marks it
			// so the icon reports the change as a keyboard `select`.
			const selectIconFromKeyboard = (iconId: string) => {
				if (selectedIcons.length !== 1 || selectedIcons[0] !== iconId)
					markClassicyDesktopIconKeyboardSelection(iconId);
				desktopEventDispatch({
					type: "ClassicyDesktopIconFocus",
					iconId,
				});
			};

			if (
				(e.key === "Backspace" || e.key === "Delete") &&
				!e.altKey &&
				!e.shiftKey
			) {
				// Delete, or ⌃⌫ (handled here so the menu bar doesn't run it twice).
				if (trashSelectedDesktopItems()) e.preventDefault();
			} else if (arrowKeys.includes(e.key)) {
				// Mac OS 8.1's rules, with nothing selected too
				// (`iconForArrowKey`).
				e.preventDefault();
				const nextId = iconForArrowKey(
					desktopIcons,
					selectedIcons,
					e.key as ArrowDirection,
				);
				if (nextId) {
					selectIconFromKeyboard(nextId);
					document.getElementById(`${nextId}.shortcut`)?.focus();
				}
			} else if (
				e.key === "Tab" &&
				!e.altKey &&
				!e.ctrlKey &&
				!e.metaKey &&
				desktopIcons.length > 0
			) {
				// Tab and Shift-Tab select by name, as the 8.1 Finder's did
				// (`iconForTabKey`); past the last (first) name the keyboard
				// leaves the icons for the page's next (previous) stop, where
				// 8.1 wrapped (no keyboard trap, WCAG 2.2 SC 2.1.2).
				const nextId = iconForTabKey(typeaheadIcons, selectedIcons, e.shiftKey);
				if (nextId) {
					e.preventDefault();
					selectIconFromKeyboard(nextId);
					document.getElementById(`${nextId}.shortcut`)?.focus();
				} else if (
					moveClassicyFocusOutOf(
						Array.from(
							desktopRef.current?.querySelectorAll<HTMLElement>(
								":scope > .classicyDesktopIcon",
							) ?? [],
						),
						e.shiftKey,
					)
				)
					e.preventDefault();
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				if (typePrefixTimerRef.current !== null) {
					clearTimeout(typePrefixTimerRef.current);
				}
				typePrefixRef.current += e.key;
				typePrefixTimerRef.current = setTimeout(() => {
					typePrefixRef.current = "";
					typePrefixTimerRef.current = null;
				}, 800);
				const matchId = typeaheadMatch(typeaheadIcons, typePrefixRef.current);
				if (matchId) {
					selectIconFromKeyboard(matchId);
					document.getElementById(`${matchId}.shortcut`)?.focus();
				}
			}
		},
		[
			desktopIcons,
			typeaheadIcons,
			selectedIcons,
			desktopEventDispatch,
			trashSelectedDesktopItems,
		],
	);

	const startSelectBox = (e: MouseEvent<HTMLDivElement>) => {
		if ("id" in e.target && e.target.id === "classicyDesktop") {
			if (e.button > 1) {
				// A right-press is the contextual-menu click, as a
				// Control-press is (HIGOS8 p.93): it deselects too.
				if (e.button === 2) clearActives(e);
				toggleDesktopContextMenu(e);
			} else {
				desktopRef.current?.focus();
				// The rectangle first, so Escape can restore the selection
				// the press clears; Shift keeps it. A Control-press is the
				// contextual-menu click (8.1): no rectangle, the menu.
				const controlPress = isClassicyControlPress(e);
				if (e.button === 0 && !controlPress) desktopMarquee.start(e);
				clearActives(e);
				if (controlPress) openClassicyControlPressContextMenu(e.nativeEvent);
			}
		}
	};

	const clearActives = (e: MouseEvent<HTMLDivElement>) => {
		if (!e.shiftKey) clearSelectedIcons();
		desktopEventDispatch({
			type: "ClassicyDesktopFocus",
			e: e,
			menuBar: defaultMenuItems,
			keepSelection: e.shiftKey,
		});
	};

	const clearSelectedIcons = () => {
		desktopEventDispatch({ type: "ClassicyDesktopIconClearFocus" });
	};

	const toggleDesktopContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		// Always suppress the native browser menu over the desktop, but only
		// show the default menu when the click target IS the desktop itself
		// (e.target, not currentTarget — the handler lives on the desktop div,
		// so currentTarget is always the desktop).
		e.preventDefault();
		if ((e.target as HTMLElement).id === "classicyDesktop") {
			showContextMenu(defaultMenuItems, [e.clientX, e.clientY]);
		}
	};

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "finder_file",
				title: "File",
				menuChildren: [
					{
						id: "finder_file_move_to_trash",
						title: "Move To Trash",
						keyboardShortcut: "⌃⌫",
						onClickFunc: () => {
							trashSelectedDesktopItems();
						},
					},
					{ id: "spacer" },
					classicyFinderFindMenuItem("finder", desktopEventDispatch),
				],
			},
			{
				id: "finder_edit",
				title: "Edit",
				disabled: true,
			},
			{
				id: "finder_view",
				title: "View",
				menuChildren: [
					{
						id: "finder.app_CleanupDesktopIcons",
						title: "Clean up",
						onClickFunc: () => {
							desktopEventDispatch({
								type: "ClassicyDesktopIconCleanup",
							});
						},
					},
					{
						id: "finder.app_ArrangeDesktopIconsName",
						title: "Arrange By Name",
						onClickFunc: () => {
							desktopEventDispatch({
								type: "ClassicyDesktopIconSort",
								sortBy: "name",
							});
						},
					},
					{
						id: "finder.app_ArrangeDesktopIconsKind",
						title: "Arrange By Type",
						onClickFunc: () => {
							desktopEventDispatch({
								type: "ClassicyDesktopIconSort",
								sortBy: "kind",
							});
						},
					},
				],
			},
			{
				id: "finder_special",
				title: "Special",
				menuChildren: classicySpecialMenuItems(desktopEventDispatch, "finder"),
			},
		],
		[desktopEventDispatch, trashSelectedDesktopItems],
	);

	// When focus settles on the desktop — Finder is the focused app (or nothing
	// is) and no Finder window is open — the bar must show the desktop's own menu
	// (File/Edit/View/Special). Desktop.appMenu is otherwise only rewritten when a
	// *window* gains focus, so an app quitting back to the desktop would strand the
	// dead app's menu on screen. Reinstall the desktop default here. Runs only when
	// the focus/menu inputs change, so it never loops on its own store write.
	useEffect(() => {
		const desktopOwnsBar =
			(focusedAppId === "Finder.app" || focusedAppId === undefined) &&
			!finderHasOpenWindow;
		if (desktopOwnsBar) {
			desktopEventDispatch({
				type: "ClassicyDesktopFocus",
				menuBar: defaultMenuItems,
			});
		}
	}, [
		focusedAppId,
		finderHasOpenWindow,
		defaultMenuItems,
		desktopEventDispatch,
	]);

	// The theme names its wallpaper by filename, resolved through the asset
	// registry: re-read when wallpapers register or the active package changes
	// (the tree's identity changes with both).
	const wallpapers = useClassicyAssetTree("wallpapers");
	// biome-ignore lint/correctness/useExhaustiveDependencies: wallpapers is the registry's change signal for getThemeVars' wallpaper lookup
	const currentTheme = useMemo(
		() => getThemeVars(activeTheme),
		[activeTheme, wallpapers],
	);
	const assetVars = useClassicyAssetVars();
	// The resolved id, not the stored one: an id whose package is not (yet)
	// registered renders as the default package, else the first registered
	// one, so the CSS scope and the JS agree.
	const appearancePackageId = useActiveClassicyAppearancePackage().id;
	const storedPackageId = useAppManager(
		(s) => s.System.Manager.Appearance.packageId,
	);
	// Say once per page which package a stored id that is not registered is
	// drawn as. Here, not in the resolver, which reducers and lookups call
	// before a host has registered its packages; the desktop mounts after.
	// Never for the default package's id: the default state seeds it, so a
	// host that registers only its own package stores it without choosing
	// it, and would be warned on every load.
	useEffect(() => {
		if (
			storedPackageId === undefined ||
			storedPackageId === CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID ||
			storedPackageId === appearancePackageId ||
			reportedUnregisteredPackageIds.has(storedPackageId)
		)
			return;
		reportedUnregisteredPackageIds.add(storedPackageId);
		classicyLog(
			"warn",
			"ClassicyAppearance",
			`Appearance Package "${storedPackageId}" is not registered; drawing "${appearancePackageId}" instead.`,
		);
	}, [storedPackageId, appearancePackageId]);
	// The active package's arrangement (resolved from Appearance.packageId,
	// never activeTheme.package), as root attributes and variables beside the
	// theme's; getThemeVars only sees the theme. classicyLayoutThemeVars
	// overrides the theme variables the layout changes (window placement's
	// 0px `--menu-bar-height`), so it is spread after the theme's.
	const layout = useClassicyAppearanceLayout();
	const layoutVars = useMemo(
		() => ({
			...classicyLayoutVars(layout),
			...classicyLayoutThemeVars(layout),
		}),
		[layout],
	);
	const rootStyle = useMemo(
		() =>
			({
				...currentTheme,
				...layoutVars,
				...assetVars,
				...style,
			}) as CSSProperties,
		[currentTheme, layoutVars, assetVars, style],
	);

	// The icon's zoom origin: a folder's window zooms out of it (the icon
	// left the source), an application a file starts zooms to the desktop.
	const openDesktopItem = useCallback(
		(path: string, origin?: ClassicyZoomOrigin) => {
			const entry = getFileSystem().resolve(path);
			if (!entry) return;
			if (
				entry._type === ClassicyFileSystemEntryFileType.Directory ||
				entry._type === ClassicyFileSystemEntryFileType.Drive
			) {
				desktopEventDispatch({ type: "ClassicyAppFinderOpenFolder", path });
			} else {
				withClassicyLaunchZoom(origin, () =>
					desktopEventDispatch({
						type: "ClassicyAppFinderOpenFile",
						file: entry,
						path,
					}),
				);
			}
		},
		[getFileSystem, desktopEventDispatch],
	);
	const moveDesktopItems = useCallback(
		(paths: string[], destination: ClassicyFileDropDestination) => {
			moveClassicyFileSystemItems(
				getFileSystem(),
				paths,
				destination,
				desktopEventDispatch,
			);
		},
		[getFileSystem, desktopEventDispatch],
	);

	return (
		<div
			role="application"
			id={"classicyDesktop"}
			data-classicy-appearance={appearancePackageId}
			data-classicy-menu-bar={layout.menuBar.placement}
			data-classicy-grow-box={layout.window.growBoxCorner}
			ref={desktopRef}
			tabIndex={-1}
			style={rootStyle}
			className={classNames(
				"classicyDesktop",
				{ classicyDesktopSplitArrows: smartScrolling === false },
				className,
			)}
			onContextMenu={toggleDesktopContextMenu}
			onMouseDown={startSelectBox}
			onKeyDown={handleKeyDown}
			{...{ [CLASSICY_DROP_DESKTOP_ATTRIBUTE]: "" }}
		>
			{/* The one floating layer (extension windows float in it). */}
			<ClassicyFloatingLayer />
			{desktopMarquee.marquee}
			<ClassicyDesktopMenuBar />
			<Finder />
			<FindFile />
			<AppleGuide />
			<ClassicyScreenSaver />
			<ClassicyApplicationSwitcher />
			{!disableSimpleText && <SimpleText />}
			{!disablePDFViewer && <PDFViewer />}
			{!disableHyperCard && <HyperCard />}
			{!disableMoviePlayer && <MoviePlayer />}
			{!disablePictureViewer && <QuickTimePictureViewer />}
			{!disableWebViewer && <WebViewer />}
			{!disableCalculator && <Calculator />}
			<ClassicyOpenUrlController />
			<ClassicyNotificationController />
			<ClassicyControlPanels />
			{controlStrip !== false && (
				<ClassicyControlStrip
					{...(controlStrip === true ? {} : controlStrip)}
				/>
			)}
			{showAbout
				? getClassicyAboutWindow({
						appId: "Finder.app",
						appName: "Finder",
						appIcon: macosIcon,
						hideFunc: () => setShowAbout(false),
					})
				: null}
			{desktopIcons.map((i) => (
				<ClassicyDesktopIcon
					appId={i.appId}
					appName={i.appName}
					icon={i.icon}
					label={i.label}
					kind={i.kind}
					key={i.appId}
					event={i.event}
					eventData={i.eventData}
					contextMenu={i.contextMenu}
					balloonHelp={i.balloonHelp}
					noLaunch={i.noLaunch ?? i.appId === "Trash"}
					filePath={i.filePath}
					onMoveFilePaths={moveDesktopItems}
					onOpenFilePath={openDesktopItem}
				/>
			))}
			{systemDialog === "emptyTrash" ? (
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyEmptyTrashAlert
						itemCount={listClassicyTrashItems(getFileSystem()).length}
						onEmpty={emptyTrash}
						onClose={closeSystemDialog}
					/>
				</div>
			) : null}
			{systemDialog === "resetPram" ? (
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyAlert
						id={SYSTEM_DIALOG_WINDOW_IDS.resetPram}
						appId={"Finder.app"}
						alertType={"caution"}
						label={"Are you sure you want to reset PRAM?"}
						message={
							stateMirrored
								? "This clears all saved settings — windows, icons, appearance — on this computer and on every other computer that shares them, and restarts Classicy. Files on your disks are kept. This action cannot be undone."
								: "This clears all saved settings — windows, icons, appearance — and restarts Classicy. Files on your disks are kept. This action cannot be undone."
						}
						defaultButtonId={"cancel"}
						buttons={[
							{ id: "cancel", label: "Cancel", role: "cancel" },
							{
								id: "reset",
								label: "Reset",
								role: "normal",
								onClick: resetPram,
							},
						]}
						onClose={closeSystemDialog}
					/>
				</div>
			) : null}
			{systemDialog === "syncChoice" ? (
				// A desktop state adapter answered with the account's saved
				// desktop while this computer holds work it never took (at boot,
				// on a retry, after a late registration): the user chooses
				// (ClassicyStateSync.internal.ts). Either answer loses something,
				// so neither is the default and no button takes the focus
				// (HIG7 p.206); copy per HIGOS8 p.61, HIG7 pp.206, 310-311.
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyAlert
						id={SYSTEM_DIALOG_WINDOW_IDS.syncChoice}
						appId={"Finder.app"}
						alertType={"caution"}
						label={"Use your saved settings on this computer?"}
						message={
							"This computer has changes that were never added to your saved settings. Using the saved settings replaces this computer's, and those changes are lost. Keeping the current settings replaces the saved ones on every computer that shares them."
						}
						defaultButtonId={null}
						buttons={[
							{
								id: "keepCurrent",
								label: "Keep Current",
								role: "normal",
								onClick: () => resolveClassicyStateChoice("keep"),
							},
							{
								id: "useSaved",
								label: "Use Saved",
								role: "normal",
								onClick: () => resolveClassicyStateChoice("adopt"),
							},
						]}
						onClose={closeSystemDialog}
					/>
				</div>
			) : null}
			{errorDialog ? (
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyAlert
						id={"error_dialog"}
						appId={"Finder.app"}
						alertType={"stop"}
						title={errorDialog.title}
						label={errorDialog.title ?? "Error"}
						message={errorDialog.message}
						buttons={[{ id: "ok", label: "OK", role: "default" }]}
						onClose={() =>
							desktopEventDispatch({
								type: "ClassicyDesktopCloseErrorDialog",
							})
						}
					/>
				</div>
			) : null}
			{themeLinkAlert}
			{children}
			<ClassicyBootSequence
				startupScreen={startupScreen}
				startupDuration={startupDuration}
				preBootScreen={preBootScreen}
				startupLogo={startupLogo}
				startupWordmark={startupWordmark}
				bootScreen={bootScreen}
			/>
		</div>
	);
};

/**
 * The Mac OS 8 desktop: the root surface every Classicy app renders on, with
 * no HTML counterpart. Mount it once inside `ClassicyAppManagerProvider`, with
 * your `ClassicyApp`s as children, or mount `Classicy`, which is the two
 * in one tag.
 *
 * It mounts the whole shell for you: the menu bar (`ClassicyDesktopMenuBar`),
 * the Control Strip, Finder, the built-in apps and control panels, the Trash
 * and the other desktop icons, the contextual-menu provider, a crash boundary
 * (`ClassicyCrashScreen`) and the startup sequence. The empty desktop supports
 * rubber-band icon selection, arrow-key and type-to-select icon navigation,
 * and a right-click menu (Clean Up, Arrange, Empty Trash…). It applies the
 * active theme as CSS variables on its root `#classicyDesktop` element, where
 * windows, menus and balloons portal.
 *
 * With no Appearance Package registered it draws none of that: it shows
 * `ClassicyNoAppearancePackage` (a plain message naming the missing package,
 * which takes `className` and `style`) until a package registers, and mounts
 * none of its children.
 *
 * A server render draws only an empty `classicyDesktop` shell with the
 * `className` and `style`, and so does the client's hydration of it; the
 * desktop draws right after (`docs/AGENT-REFERENCE.md` §1, "Server
 * rendering").
 *
 * ```tsx
 * <ClassicyAppManagerProvider>
 *   <ClassicyDesktop controlStrip={{ defaultCollapsed: true }}>
 *     <MyApp />
 *   </ClassicyDesktop>
 * </ClassicyAppManagerProvider>
 * ```
 */
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen,
	startupDuration,
	preBootScreen,
	startupLogo,
	startupWordmark,
	bootScreen,
	controlStrip,
	themeLinks,
	className,
	style,
}) => {
	// No package, no desktop: nothing below can draw without one.
	const packages = useClassicyAppearancePackages();
	// A server render (and the client's hydration of it) draws an empty shell,
	// the desktop right after (useClassicyClientRender.internal.ts).
	const clientRender = useClassicyClientRender();
	// A desktop state adapter's boot reconcile draws the shell too, for at
	// most its timeout; an adopted state remounts the desktop, as a restart
	// (ClassicyStateSync.internal.ts).
	const stateSync = useClassicyStateSyncGate();
	if (!clientRender || !stateSync.ready)
		return (
			<div className={classNames("classicyDesktop", className)} style={style} />
		);
	if (packages.length === 0)
		return <ClassicyNoAppearancePackage className={className} style={style} />;
	return (
		<ClassicyCrashScreen key={stateSync.epoch}>
			<ClassicyContextualMenuProvider>
				<ClassicyFloatingLayerProvider>
					<ClassicyDesktopInner
						startupScreen={startupScreen}
						startupDuration={startupDuration}
						preBootScreen={preBootScreen}
						startupLogo={startupLogo}
						startupWordmark={startupWordmark}
						bootScreen={bootScreen}
						controlStrip={controlStrip}
						themeLinks={themeLinks}
						className={className}
						style={style}
					>
						{children}
					</ClassicyDesktopInner>
				</ClassicyFloatingLayerProvider>
			</ClassicyContextualMenuProvider>
		</ClassicyCrashScreen>
	);
};
