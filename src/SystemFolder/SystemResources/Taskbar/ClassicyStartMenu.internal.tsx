import "./ClassicyStartMenu.scss";
import {
	type FC as FunctionalComponent,
	type RefObject,
	useCallback,
	useMemo,
	useSyncExternalStore,
} from "react";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import {
	useClassicyAsset,
	useClassicyOwnAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyBevelButtonPopup } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup";
import type {
	ClassicyBevelPopupRect,
	ClassicyBevelPopupSide,
} from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import {
	getClassicyFileSystemVersion,
	subscribeClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { useClassicyRecentDocuments } from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { useClassicyTrashIcon } from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import {
	type ClassicyStartMenuDocument,
	classicyStartMenuItems,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenuItems.internal";

/**
 * The Windows shell's Start menu (plan 0020-w98 §3; WIG Ch.3 "The Start
 * Button", p.15, Figure 3.1), opened by the taskbar's Start button and
 * CTRL+ESC. Internal: not exported from the package.
 */

/** The Start menu's DOM id; the Start button's `aria-controls` names it. */
export const CLASSICY_START_MENU_ID = "classicy-start-menu";

type ClassicyStartMenuProps = {
	/** The Start button's rect when the menu opened. */
	anchor: ClassicyBevelPopupRect;
	/** The Start button: a press on it toggles the menu, so it is not "outside". */
	buttonRef: RefObject<HTMLButtonElement | null>;
	/** The menu's accessible name (the Start button's label). */
	label: string;
	/** The layout's `taskbar.startBanner`; absent, no banner. */
	banner?: NonNullable<ClassicyAppearanceLayout["taskbar"]>["startBanner"];
	/** Called when the menu should close (a choice, Escape, an outside press, scroll, resize). */
	onClose: () => void;
	/** The signed-in user's name, for Log Off <name>… (E2); absent, no Log Off. */
	userName?: string;
	/**
	 * The side of the Start button it opens on, toward the desktop (plan
	 * 0020-w98 E4): `"below"` (the default, flipping above from a bottom
	 * taskbar), or `"right"` beside a side taskbar (flipping left from a
	 * right one).
	 */
	side?: ClassicyBevelPopupSide;
	/**
	 * Taskbar Properties' "Show small icons in Start menu": the first level
	 * takes small icons (`classicyStartMenuSmallIcons`) and no banner, as
	 * Windows 98's does.
	 */
	smallIcons?: boolean;
};

/**
 * Whether anything is in the Trash, read when the menu opens and again on
 * each change to the tree (the Empty Trash… item draws the Trash full or
 * empty, as the desktop's Trash icon does).
 */
const useClassicyTrashFull = (): boolean => {
	const getFs = useClassicyFileSystemAccessor();
	const storageKey = useMemo(() => getFs().storageKey, [getFs]);
	const subscribe = useCallback(
		(listener: () => void) => subscribeClassicyFileSystem(storageKey, listener),
		[storageKey],
	);
	const getVersion = useCallback(
		() => getClassicyFileSystemVersion(storageKey),
		[storageKey],
	);
	const version = useSyncExternalStore(subscribe, getVersion, getVersion);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the trigger: the tree changed, so read the Trash again
	return useMemo(
		() => listClassicyTrashItems(getFs()).length > 0,
		[getFs, version],
	);
};

/**
 * Start ▸ Documents' documents (E2): the session's recent documents
 * (`useClassicyRecentDocuments`) that still exist, each with its file name
 * and icon (its own, else its type's core icon, which the menu draws as the
 * active package's), read again on each change to the tree.
 */
const useClassicyStartMenuDocuments = (): ClassicyStartMenuDocument[] => {
	const getFs = useClassicyFileSystemAccessor();
	const storageKey = useMemo(() => getFs().storageKey, [getFs]);
	const subscribe = useCallback(
		(listener: () => void) => subscribeClassicyFileSystem(storageKey, listener),
		[storageKey],
	);
	const getVersion = useCallback(
		() => getClassicyFileSystemVersion(storageKey),
		[storageKey],
	);
	const version = useSyncExternalStore(subscribe, getVersion, getVersion);
	const recent = useClassicyRecentDocuments();
	// biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the trigger: the tree changed, so resolve the documents again
	return useMemo(() => {
		const fs = getFs();
		return recent.flatMap((path) => {
			const entry = fs.resolve(path);
			if (!entry || typeof entry !== "object") return [];
			const name = path.split(fs.separator).pop() ?? path;
			const icon =
				typeof entry._icon === "string" && entry._icon !== ""
					? entry._icon
					: iconImageByType(
							String(entry._type),
							CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
						);
			return [{ path, name, icon }];
		});
	}, [getFs, recent, version]);
};

/** The Start menu's items, from the store and the registries, read at render. */
const useClassicyStartMenuItems = (userName: string | undefined) => {
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const icons = useAppManager((s) => s.System.Manager.Desktop.icons);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const dispatch = useAppManagerDispatch();
	const mountedApps = useClassicyMountedApps();
	const overrides = useClassicyAppIdentityOverrides();
	// Start ▸ Help opens the Help Topics browser under WinHelp's topic
	// window (`help.topicWindow` "winhelp"), else the About Help topic.
	const helpTopics =
		useClassicyAppearanceLayout().help?.topicWindow === "winhelp";
	const about = useClassicyAsset("icons", "system.macos") ?? "";
	const programs =
		useClassicyAsset("icons", "system.folders.applications") ?? "";
	const controlPanel =
		useClassicyAsset("icons", "system.folders.controlPanels") ?? "";
	const help = useClassicyAsset("icons", "system.help") ?? "";
	const resetPram = useClassicyAsset("icons", "system.bigSwitchOn") ?? "";
	const documentsIcon =
		useClassicyAsset("icons", "system.folders.recentDocuments") ?? "";
	const run = useClassicyAsset("icons", "system.files.application") ?? "";
	const logOff = useClassicyAsset("icons", "system.security.key") ?? "";
	const shutDown = useClassicyAsset("icons", "system.bigSwitchOff") ?? "";
	const emptyTrash = useClassicyTrashIcon(useClassicyTrashFull());
	const documents = useClassicyStartMenuDocuments();
	const getFs = useClassicyFileSystemAccessor();
	const openDocument = useCallback(
		(path: string) => {
			const file = getFs().resolve(path);
			if (file) dispatch({ type: "ClassicyAppFinderOpenFile", file, path });
		},
		[getFs, dispatch],
	);
	return useMemo(
		() =>
			classicyStartMenuItems({
				systemMenu,
				icons,
				mountedApps,
				overrides,
				disableBalloonHelp,
				images: {
					about,
					programs,
					controlPanel,
					help,
					emptyTrash,
					resetPram,
					documents: documentsIcon,
					run,
					logOff,
					shutDown,
				},
				dispatch,
				documents,
				openDocument,
				userName,
				helpTopics,
			}),
		[
			systemMenu,
			icons,
			mountedApps,
			overrides,
			disableBalloonHelp,
			about,
			programs,
			controlPanel,
			help,
			emptyTrash,
			resetPram,
			documentsIcon,
			run,
			logOff,
			shutDown,
			dispatch,
			documents,
			openDocument,
			userName,
			helpTopics,
		],
	);
};

/**
 * The Start menu: a pop-up surface (`ClassicyBevelButtonPopup`,
 * `classicyStartMenu`) placed against the Start button, toward the desktop:
 * beside it to the right from a side taskbar (`side`, flipping left from a
 * right one), else below it where there is room (from a top taskbar, on the
 * band's bottom edge), else, as at the foot of the desktop, flipped above it
 * onto the taskbar band's top edge (the menu bounds end there), on whole pixels inside
 * the desktop, its menu's scroll cap keeping no margin from that edge
 * (`menuScrollMargin`), so it is drawn whole wherever it fits. The layout's
 * `startBanner`, when it has one, is the surface's first child
 * (`classicyStartMenuBanner`, `data-classicy-part="start-menu-banner"`,
 * `aria-hidden`: the title, then the edition), beside the menu
 * (`classicyStartMenuItems`).
 *
 * It opens with no item selected, however it was opened, as Windows' Start
 * menu does: Down Arrow selects the first item and Up Arrow the last, from
 * the Start button or wherever the focus is, and then the arrows walk the
 * items shown, dimmed ones included (the surface's `keyboard`, Windows'
 * menu loop). A choice, Escape, a press outside, a scroll or a resize
 * closes it (`onClose`); it never closes for idleness.
 */
export const ClassicyStartMenu: FunctionalComponent<ClassicyStartMenuProps> = ({
	anchor,
	buttonRef,
	label,
	banner,
	onClose,
	userName,
	side = "below",
	smallIcons = false,
}) => {
	const menuItems = useClassicyStartMenuItems(userName);

	// The package's own banner bitmap (`startMenuBanner`, Windows 98's
	// Explorer bitmap 157), drawn by its stylesheet from
	// `--classicy-art-start-menu-banner` while the banner carries
	// `classicyStartMenuBannerArt`; the layout's text is then its accessible
	// name only, drawn only without the bitmap.
	const bannerArt = Boolean(
		useClassicyOwnAsset("systemArt", "startMenuBanner"),
	);
	const bannerName = banner
		? [banner.title, banner.edition].filter(Boolean).join(" ")
		: "";
	const aside =
		banner && !smallIcons ? (
			bannerArt ? (
				<div
					className="classicyStartMenuBanner classicyStartMenuBannerArt"
					{...{ [CLASSICY_PART_ATTRIBUTE.part]: "start-menu-banner" }}
					role="img"
					aria-label={bannerName}
				/>
			) : (
				<div
					className="classicyStartMenuBanner"
					{...{ [CLASSICY_PART_ATTRIBUTE.part]: "start-menu-banner" }}
					aria-hidden="true"
				>
					<span className="classicyStartMenuBannerTitle">{banner.title}</span>
					{banner.edition !== undefined && (
						<span className="classicyStartMenuBannerEdition">
							{banner.edition}
						</span>
					)}
				</div>
			)
		) : undefined;

	return (
		<ClassicyBevelButtonPopup
			id={CLASSICY_START_MENU_ID}
			className={
				smallIcons
					? "classicyStartMenu classicyStartMenuSmallIcons"
					: "classicyStartMenu"
			}
			anchor={anchor}
			side={side}
			align="start"
			menuItems={menuItems}
			label={label}
			buttonRef={buttonRef}
			onClose={onClose}
			aside={aside}
			// It sits on the band's top edge: a menu that fits there is whole.
			menuScrollMargin={0}
			// Windows' menu loop: the arrows from anywhere, dimmed items
			// walked, and no idle close.
			keyboard
		/>
	);
};
