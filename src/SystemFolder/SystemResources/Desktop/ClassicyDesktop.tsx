import {
	getAllThemes,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import { AppleGuide } from "@/SystemFolder/Extensions/AppleGuide/AppleGuide";
import { ClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";
import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
import { SimpleText } from "@/SystemFolder/SimpleText/SimpleText";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
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
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	useClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyLayoutThemeVars,
	classicyLayoutVars,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
// Registers the Platinum Appearance Package (and its assets and sound pack).
import "@/Appearance/Platinum";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { getClassicyDefaultParadeIcons } from "@/SystemFolder/SystemResources/Boot/ClassicyDefaultParadeIcons";
import {
	ClassicyControlStrip,
	type ClassicyControlStripProps,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import { markClassicyDesktopIconKeyboardSelection } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKeyboardSelection.internal";
import {
	type ArrowDirection,
	nearestIconInDirection,
	typeaheadMatch,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import { ClassicyOpenUrlController } from "@/SystemFolder/SystemResources/Desktop/ClassicyOpenUrlController";
import {
	ClassicyEmptyTrashAlert,
	classicySpecialMenuItems,
	SYSTEM_DIALOG_WINDOW_IDS,
} from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import {
	CLASSICY_DROP_DESKTOP_ATTRIBUTE,
	type ClassicyFileDropDestination,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	emptyClassicyTrash,
	listClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

import "../../../index.css";

interface ClassicyDesktopProps {
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
	 * helpers. Still subject to the `startupScreen` gate.
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
	className,
	style,
}) => {
	const macosIcon = useClassicyAsset("icons", "system.macos") ?? "";
	const [showAbout, setShowAbout] = useState(false);

	const [selectBoxStart, setSelectBoxStart] = useState([0, 0]);
	const [selectBoxSize, setSelectBoxSize] = useState([0, 0]);
	const [selectBox, setSelectBox] = useState(false);

	const { showContextMenu } = useClassicyContextualMenu();
	const rafIdRef = useRef<number | null>(null);
	const desktopRef = useRef<HTMLDivElement>(null);
	const typePrefixRef = useRef<string>("");
	const typePrefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const availableThemes = useAppManager(
		(s) => s.System.Manager.Appearance.availableThemes,
	);
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
	const selectedIcons = useAppManager(
		(s) => s.System.Manager.Desktop.selectedIcons ?? [],
	);
	const errorDialog = useAppManager(
		(s) => s.System.Manager.Desktop.errorDialog,
	);
	const systemDialog = useAppManager(
		(s) => s.System.Manager.Desktop.systemDialog ?? null,
	);
	const focusedAppId = useAppManager(
		(s) => s.System.Manager.Applications.focusedAppId,
	);
	const finderHasOpenWindow = useAppManager((s) =>
		listAppWindows(s.System.Manager.Applications.apps["Finder.app"]).some(
			(w) => !w.closed,
		),
	);
	const desktopEventDispatch = useAppManagerDispatch();

	const {
		disableSimpleText,
		disablePDFViewer,
		disableMoviePlayer,
		disablePictureViewer,
		disableHyperCard,
		disableWebViewer,
	} = useContext(ClassicyDefaultAppsContext);

	// Special ▸ Reset PRAM: forget every saved setting and start over.
	const resetPram = useCallback(() => {
		localStorage.removeItem("classicyDesktopState");
		resetStartupScreenSession();
		window.location.reload();
	}, []);

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

	// Load themes on mount if not already loaded
	useEffect(() => {
		if (availableThemes && availableThemes.length <= 0) {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopLoadThemes",
					availableThemes: getAllThemes(),
				});
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [desktopEventDispatch, availableThemes]);

	// Cancel any pending RAF on unmount to prevent state updates after teardown
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

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
				e.preventDefault();
				const currentId = selectedIcons[0];
				if (!currentId) return;
				const nextId = nearestIconInDirection(
					desktopIcons,
					currentId,
					e.key as ArrowDirection,
				);
				if (nextId) {
					selectIconFromKeyboard(nextId);
					document.getElementById(`${nextId}.shortcut`)?.focus();
				}
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
				const matchId = typeaheadMatch(desktopIcons, typePrefixRef.current);
				if (matchId) {
					selectIconFromKeyboard(matchId);
					document.getElementById(`${matchId}.shortcut`)?.focus();
				}
			}
		},
		[
			desktopIcons,
			selectedIcons,
			desktopEventDispatch,
			trashSelectedDesktopItems,
		],
	);

	const startSelectBox = (e: MouseEvent<HTMLDivElement>) => {
		if ("id" in e.target && e.target.id === "classicyDesktop") {
			if (e.button > 1) {
				toggleDesktopContextMenu(e);
			} else {
				desktopRef.current?.focus();
				clearActives(e);
				selectionIconElementsRef.current =
					document.querySelectorAll<HTMLDivElement>(".classicyDesktopIcon");
				setSelectBox(true);
				setSelectBoxStart([e.clientX, e.clientY]);
				setSelectBoxSize([0, 0]);
			}
		}
	};

	const getNormalizedSelectRect = (
		start: number[],
		size: number[],
	): DOMRect => {
		const x = size[0] < 0 ? start[0] + size[0] : start[0];
		const y = size[1] < 0 ? start[1] + size[1] : start[1];
		const w = Math.abs(size[0]);
		const h = Math.abs(size[1]);
		return new DOMRect(x, y, w, h);
	};

	const rectsIntersect = (a: DOMRect, b: DOMRect): boolean => {
		return (
			a.left < b.right &&
			a.right > b.left &&
			a.top < b.bottom &&
			a.bottom > b.top
		);
	};

	// Cache icon NodeList for the duration of a selection drag
	const selectionIconElementsRef = useRef<NodeListOf<HTMLDivElement> | null>(
		null,
	);

	const getIconsInSelectBox = (
		boxStart: number[],
		boxSize: number[],
	): string[] => {
		const selectRect = getNormalizedSelectRect(boxStart, boxSize);
		const selectedIds: string[] = [];
		const iconElements =
			selectionIconElementsRef.current ??
			document.querySelectorAll<HTMLDivElement>(".classicyDesktopIcon");
		iconElements.forEach((el) => {
			const iconRect = el.getBoundingClientRect();
			if (rectsIntersect(selectRect, iconRect)) {
				const iconId = el.id.replace(/\.shortcut$/, "");
				selectedIds.push(iconId);
			}
		});
		return selectedIds;
	};

	const resizeSelectBox = (e: MouseEvent<HTMLDivElement>) => {
		if (!selectBox) return;
		const x = e.clientX;
		const y = e.clientY;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
		}
		rafIdRef.current = requestAnimationFrame(() => {
			const newSize = [x - selectBoxStart[0], y - selectBoxStart[1]];
			setSelectBoxSize(newSize);

			const selectedIds = getIconsInSelectBox(selectBoxStart, newSize);
			desktopEventDispatch({
				type: "ClassicyDesktopIconSelectBox",
				iconIds: selectedIds,
			});

			rafIdRef.current = null;
		});
	};

	const clearSelectBox = () => {
		selectionIconElementsRef.current = null;
		setSelectBoxSize([0, 0]);
		setSelectBoxStart([0, 0]);
		setSelectBox(false);
	};

	const clearActives = (e: MouseEvent<HTMLDivElement>) => {
		clearSelectedIcons();
		desktopEventDispatch({
			type: "ClassicyDesktopFocus",
			e: e,
			menuBar: defaultMenuItems,
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

	const currentTheme = useMemo(() => getThemeVars(activeTheme), [activeTheme]);
	const assetVars = useClassicyAssetVars();
	// The resolved id, not the stored one: an id whose package is not (yet)
	// registered renders as Platinum, so the CSS scope and the JS agree.
	const appearancePackageId = useActiveClassicyAppearancePackage().id;
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

	const openDesktopItem = useCallback(
		(path: string) => {
			const entry = getFileSystem().resolve(path);
			if (!entry) return;
			if (
				entry._type === ClassicyFileSystemEntryFileType.Directory ||
				entry._type === ClassicyFileSystemEntryFileType.Drive
			) {
				desktopEventDispatch({ type: "ClassicyAppFinderOpenFolder", path });
			} else {
				desktopEventDispatch({
					type: "ClassicyAppFinderOpenFile",
					file: entry,
					path,
				});
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
			onMouseMove={resizeSelectBox}
			onContextMenu={toggleDesktopContextMenu}
			onMouseUp={clearSelectBox}
			onMouseDown={startSelectBox}
			onKeyDown={handleKeyDown}
			{...{ [CLASSICY_DROP_DESKTOP_ATTRIBUTE]: "" }}
		>
			{selectBox && (
				<div
					className={"classicyDesktopSelect"}
					style={{
						left: Math.min(
							selectBoxStart[0],
							selectBoxStart[0] + selectBoxSize[0],
						),
						top: Math.min(
							selectBoxStart[1],
							selectBoxStart[1] + selectBoxSize[1],
						),
						width: Math.abs(selectBoxSize[0]),
						height: Math.abs(selectBoxSize[1]),
					}}
				/>
			)}
			<ClassicyDesktopMenuBar />
			<Finder />
			<AppleGuide />
			<ClassicyScreenSaver />
			{!disableSimpleText && <SimpleText />}
			{!disablePDFViewer && <PDFViewer />}
			{!disableHyperCard && <HyperCard />}
			{!disableMoviePlayer && <MoviePlayer />}
			{!disablePictureViewer && <QuickTimePictureViewer />}
			{!disableWebViewer && <WebViewer />}
			<ClassicyOpenUrlController />
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
							"This clears all saved settings — windows, icons, appearance — and restarts Classicy. Files on your disks are kept. This action cannot be undone."
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
 * your `ClassicyApp`s as children.
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
	className,
	style,
}) => (
	<ClassicyCrashScreen>
		<ClassicyContextualMenuProvider>
			<ClassicyDesktopInner
				startupScreen={startupScreen}
				startupDuration={startupDuration}
				preBootScreen={preBootScreen}
				startupLogo={startupLogo}
				startupWordmark={startupWordmark}
				bootScreen={bootScreen}
				controlStrip={controlStrip}
				className={className}
				style={style}
			>
				{children}
			</ClassicyDesktopInner>
		</ClassicyContextualMenuProvider>
	</ClassicyCrashScreen>
);
