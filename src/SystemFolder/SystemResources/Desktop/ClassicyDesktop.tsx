import {
	getAllThemes,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
import { SimpleText } from "@/SystemFolder/SimpleText/SimpleText";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import { ClassicyCrashScreen } from "@/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen";
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
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";
import {
	type ArrowDirection,
	nearestIconInDirection,
	typeaheadMatch,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const macosIcon = ClassicyIcons.system.macos;
const trashIcon = ClassicyIcons.system.desktop.trashEmpty;
const errorIcon = ClassicyIcons.system.error;

import "../../ControlPanels/AppearanceManager/styles/fonts.scss";
import "../../../index.css";
import { ClassicyControlLabel } from "../ControlLabel/ClassicyControlLabel";

interface ClassicyDesktopProps {
	children?: ReactNode;
	startupScreen?: boolean;
	startupDuration?: number;
}

const ClassicyDesktopInner: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen = true,
	startupDuration = 4000,
}) => {
	const [contextMenu, setContextMenu] = useState(false);
	const [contextMenuLocation, setContextMenuLocation] = useState([0, 0]);
	const [showAbout, setShowAbout] = useState(false);
	const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);

	const [selectBoxStart, setSelectBoxStart] = useState([0, 0]);
	const [selectBoxSize, setSelectBoxSize] = useState([0, 0]);
	const [selectBox, setSelectBox] = useState(false);

	const clickOffset = [10, 10];
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
	const desktopIcons = useAppManager((s) => s.System.Manager.Desktop.icons);
	const selectedIcons = useAppManager(
		(s) => s.System.Manager.Desktop.selectedIcons ?? [],
	);
	const errorDialog = useAppManager(
		(s) => s.System.Manager.Desktop.errorDialog,
	);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const desktopEventDispatch = useAppManagerDispatch();

	const {
		disableSimpleText,
		disablePDFViewer,
		disableMoviePlayer,
		disablePictureViewer,
	} = useContext(ClassicyDefaultAppsContext);

	const emptyTrash = useCallback(() => {
		localStorage.removeItem("classicyDesktopState");
		resetStartupScreenSession();
		window.location.reload();
	}, []);

	// Focus the Empty Trash dialog when it opens
	useEffect(() => {
		if (showEmptyTrashDialog) {
			desktopEventDispatch({
				type: "ClassicyWindowFocus",
				app: { id: "Finder.app" },
				window: { id: "empty_trash" },
			});
		}
	}, [showEmptyTrashDialog, desktopEventDispatch]);

	// Add Trash icon to desktop on mount
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopIconAdd",
			app: {
				id: "Trash",
				name: "Trash",
				icon: trashIcon,
			},
			kind: "trash",
		});
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

			if (arrowKeys.includes(e.key)) {
				e.preventDefault();
				const currentId = selectedIcons[0];
				if (!currentId) return;
				const nextId = nearestIconInDirection(
					desktopIcons,
					currentId,
					e.key as ArrowDirection,
				);
				if (nextId) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconFocus",
						iconId: nextId,
					});
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
					desktopEventDispatch({
						type: "ClassicyDesktopIconFocus",
						iconId: matchId,
					});
					document.getElementById(`${matchId}.shortcut`)?.focus();
				}
			}
		},
		[desktopIcons, selectedIcons, desktopEventDispatch],
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
		setContextMenu(false);
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
		e.preventDefault();
		if (e.currentTarget.id === "classicyDesktop") {
			setContextMenuLocation([
				e.clientX - clickOffset[0],
				e.clientY - clickOffset[1],
			]);
			setContextMenu(!contextMenu);
		}
	};

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "finder_file",
				title: "File",
				disabled: true,
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
				menuChildren: [
					{
						id: "finder_special_empty_trash",
						title: "Empty Trash\u2026",
						onClickFunc: () => {
							setShowEmptyTrashDialog(true);
						},
					},
				],
			},

			{
				id: "finder_help",
				title: "Help",
				menuChildren: [
					{
						id: "finder_help_balloon",
						title: disableBalloonHelp
							? "Show Balloon Help"
							: "Hide Balloon Help",
						onClickFunc: () => {
							desktopEventDispatch({
								type: "ClassicyDesktopSetBalloonHelp",
								disableBalloonHelp: !disableBalloonHelp,
							});
						},
					},
				],
			},
		],
		[desktopEventDispatch, disableBalloonHelp],
	);

	const closeContextMenu = useCallback(() => setContextMenu(false), []);

	const currentTheme = useMemo(() => getThemeVars(activeTheme), [activeTheme]);

	return (
		<div
			role="application"
			id={"classicyDesktop"}
			ref={desktopRef}
			tabIndex={-1}
			style={currentTheme as CSSProperties}
			className={classNames("classicyDesktop")}
			onMouseMove={resizeSelectBox}
			onContextMenu={toggleDesktopContextMenu}
			onMouseUp={clearSelectBox}
			onMouseDown={startSelectBox}
			onKeyDown={handleKeyDown}
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
			{contextMenu ? (
				<ClassicyContextualMenu
					name={"desktopContextMenu"}
					menuItems={defaultMenuItems}
					position={contextMenuLocation}
					onClose={closeContextMenu}
				/>
			) : null}
			<Finder />
			{!disableSimpleText && <SimpleText />}
			{!disablePDFViewer && <PDFViewer />}
			{!disableMoviePlayer && <MoviePlayer />}
			{!disablePictureViewer && <QuickTimePictureViewer />}
			<ClassicyControlPanels />
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
					onClickFunc={
						i.appId === "Trash"
							? () => setShowEmptyTrashDialog(true)
							: undefined
					}
					noLaunch={i.appId === "Trash"}
				/>
			))}
			{showEmptyTrashDialog ? (
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyWindow
						id={"empty_trash"}
						appId={"Finder.app"}
						closable={false}
						resizable={false}
						zoomable={false}
						scrollable={true}
						collapsable={false}
						initialSize={[400, 0]}
						initialPosition={["center", "center"]}
						modal={true}
						type={"error"}
					>
						<div className={"classicyDesktopDialogContent"}>
							<img
								src={trashIcon}
								alt={"Trash"}
								className={"classicyDesktopDialogIcon"}
							/>
							<div className={"classicyDesktopDialogBody"}>
								<ClassicyControlLabel
									label="Are you sure you want to reset your desktop?
									This will clear all saved state and reload the
									application. This action cannot be undone."
								/>
								<div className={"classicyDesktopDialogButtons"}>
									<ClassicyButton
										isDefault={true}
										onClickFunc={() => setShowEmptyTrashDialog(false)}
									>
										Cancel
									</ClassicyButton>
									<ClassicyButton onClickFunc={emptyTrash}>OK</ClassicyButton>
								</div>
							</div>
						</div>
					</ClassicyWindow>
				</div>
			) : null}
			{errorDialog ? (
				<div className={"classicyDesktopDialogOverlay"}>
					<ClassicyWindow
						id={"error_dialog"}
						appId={"Finder.app"}
						title={errorDialog.title}
						closable={false}
						resizable={false}
						zoomable={false}
						scrollable={false}
						collapsable={false}
						initialSize={[400, 0]}
						initialPosition={["center", "center"]}
						modal={true}
						type={"error"}
					>
						<div className={"classicyDesktopDialogContent"}>
							<img
								src={errorIcon}
								alt={"Error"}
								className={"classicyDesktopDialogIcon"}
							/>
							<div className={"classicyDesktopDialogBody"}>
								<ClassicyControlLabel label={errorDialog.message} />
								<div className={"classicyDesktopDialogButtons"}>
									<ClassicyButton
										isDefault={true}
										onClickFunc={() =>
											desktopEventDispatch({
												type: "ClassicyDesktopCloseErrorDialog",
											})
										}
									>
										OK
									</ClassicyButton>
								</div>
							</div>
						</div>
					</ClassicyWindow>
				</div>
			) : null}
			{children}
			{startupScreen && <ClassicyStartupScreen duration={startupDuration} />}
		</div>
	);
};

export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen,
	startupDuration,
}) => (
	<ClassicyCrashScreen>
		<ClassicyDesktopInner
			startupScreen={startupScreen}
			startupDuration={startupDuration}
		>
			{children}
		</ClassicyDesktopInner>
	</ClassicyCrashScreen>
);
