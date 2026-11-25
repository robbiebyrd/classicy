import "./ClassicyStartMenu.scss";
import {
	type FC as FunctionalComponent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyBevelButtonPopup } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup";
import { classicyBevelPopupShownItems } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupItems.internal";
import type { ClassicyBevelPopupRect } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import {
	getClassicyFileSystemVersion,
	subscribeClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { useClassicyTrashIcon } from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import { classicyStartMenuItems } from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenuItems.internal";

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

/** The Start menu's items, from the store and the registries, read at render. */
const useClassicyStartMenuItems = () => {
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const icons = useAppManager((s) => s.System.Manager.Desktop.icons);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const dispatch = useAppManagerDispatch();
	const mountedApps = useClassicyMountedApps();
	const overrides = useClassicyAppIdentityOverrides();
	const about = useClassicyAsset("icons", "system.macos") ?? "";
	const programs =
		useClassicyAsset("icons", "system.folders.applications") ?? "";
	const controlPanel =
		useClassicyAsset("icons", "system.folders.controlPanels") ?? "";
	const help = useClassicyAsset("icons", "system.help") ?? "";
	const resetPram = useClassicyAsset("icons", "system.bigSwitchOff") ?? "";
	const emptyTrash = useClassicyTrashIcon(useClassicyTrashFull());
	return useMemo(
		() =>
			classicyStartMenuItems({
				systemMenu,
				icons,
				mountedApps,
				overrides,
				disableBalloonHelp,
				images: { about, programs, controlPanel, help, emptyTrash, resetPram },
				dispatch,
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
			dispatch,
		],
	);
};

/**
 * The Start menu: a pop-up surface (`ClassicyBevelButtonPopup`,
 * `classicyStartMenu`) placed against the Start button: below it where there
 * is room, else, as at the foot of the desktop, flipped above it onto the
 * taskbar band's top edge (the menu bounds end there), on whole pixels inside
 * the desktop. The layout's `startBanner`, when it has one, is the surface's
 * first child (`classicyStartMenuBanner`, `data-classicy-part=
 * "start-menu-banner"`, `aria-hidden`: the title, then the edition), beside
 * the menu (`classicyStartMenuItems`).
 *
 * It opens with no item selected, however it was opened, as Windows' Start
 * menu does: Down Arrow selects the first item and Up Arrow the last, from
 * the Start button or wherever the focus is, and then the arrows walk the
 * items shown. A choice, Escape, a press outside, a scroll or a resize
 * closes it (`onClose`).
 */
export const ClassicyStartMenu: FunctionalComponent<ClassicyStartMenuProps> = ({
	anchor,
	buttonRef,
	label,
	banner,
	onClose,
}) => {
	const menuItems = useClassicyStartMenuItems();

	// The arrows reach the menu from outside it (the Start button, or the
	// page after CTRL+ESC); inside it, the surface walks them itself.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented) return;
			if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
			if (e.altKey || e.ctrlKey || e.metaKey) return;
			const surface = document.getElementById(CLASSICY_START_MENU_ID);
			if (!surface || surface.contains(document.activeElement)) return;
			const items = classicyBevelPopupShownItems(surface);
			if (items.length === 0) return;
			e.preventDefault();
			items[e.key === "ArrowDown" ? 0 : items.length - 1].focus();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const aside = banner ? (
		<div
			className="classicyStartMenuBanner"
			{...{ [CLASSICY_PART_ATTRIBUTE.part]: "start-menu-banner" }}
			aria-hidden="true"
		>
			<span className="classicyStartMenuBannerTitle">{banner.title}</span>
			{banner.edition !== undefined && (
				<span className="classicyStartMenuBannerEdition">{banner.edition}</span>
			)}
		</div>
	) : undefined;

	return (
		<ClassicyBevelButtonPopup
			id={CLASSICY_START_MENU_ID}
			className="classicyStartMenu"
			anchor={anchor}
			side="below"
			align="start"
			menuItems={menuItems}
			label={label}
			buttonRef={buttonRef}
			onClose={onClose}
			aside={aside}
		/>
	);
};
