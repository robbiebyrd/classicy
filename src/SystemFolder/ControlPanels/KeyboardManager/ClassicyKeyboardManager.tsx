import "./ClassicyKeyboardManager.scss";
import { type FC as FunctionalComponent, useMemo } from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentity,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	KEYBOARD_MANAGER_APP_ID,
	KEYBOARD_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardManagerManifest";
import {
	CLASSICY_BUNDLED_MENU_SHORTCUTS,
	type ClassicyBundledMenuShortcut,
} from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardShortcutCatalog";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import { ClassicyKeyboardEquivalentField } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField";
import type { ClassicyKeyboardEquivalentInUse } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";
import type { ClassicyShortcutOverrides } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuShortcutOverrides";
import { resolveClassicyMenuItemShortcut } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuShortcutOverrides";
import { useClassicyMenuItemShortcuts } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuItemShortcut";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = KEYBOARD_MANAGER_APP_ID;
const APP_NAME = KEYBOARD_MANAGER_APP_NAME;
const WINDOW_ID = "KeyboardManager_1";

/**
 * The browser's own edits, which every text field answers to: no bundled
 * command may take one (a menu chord for it would be claimed before the
 * browser's edit), so each is refused naming the command it belongs to.
 */
export const CLASSICY_NATIVE_EDIT_SHORTCUTS: readonly ClassicyKeyboardEquivalentInUse[] =
	Object.freeze([
		{ shortcut: "⌘Z", name: "Undo" },
		{ shortcut: "⌘X", name: "Cut" },
		{ shortcut: "⌘C", name: "Copy" },
		{ shortcut: "⌘V", name: "Paste" },
	]);

/**
 * The shortcuts `entry` may not take: the other listed commands of its app,
 * at the chords they carry now, and the browser's edits.
 */
export const classicyKeyboardShortcutsInUse = (
	entry: ClassicyBundledMenuShortcut,
	overrides: ClassicyShortcutOverrides | undefined,
): ClassicyKeyboardEquivalentInUse[] => [
	...CLASSICY_BUNDLED_MENU_SHORTCUTS.filter(
		(other) => other.appId === entry.appId && other.id !== entry.id,
	).map((other) => ({
		shortcut: resolveClassicyMenuItemShortcut(
			overrides,
			other.id,
			other.shortcut,
		),
		name: other.title,
	})),
	...CLASSICY_NATIVE_EDIT_SHORTCUTS,
];

/**
 * The Keyboard control panel (WIG Ch.4 "Shortcut Keys" (p.27): "let the
 * user change shortcut assignments where possible"), mounted by
 * `ClassicyControlPanels` only while the active package declares
 * `layout.keyboard.editableShortcuts` (Windows 98), so Platinum's and System
 * 7's Control Panels list no such panel. Its Shortcuts page lists, under each
 * mounted app's display name, the bundled menu commands that carry a
 * shortcut (`CLASSICY_BUNDLED_MENU_SHORTCUTS`), each edited with
 * `ClassicyKeyboardEquivalentField`: a combination another of the app's
 * commands or the browser's edits already use is refused naming it, and one
 * with neither Control nor a function key is refused (WIG Ch.4 p.27: "CTRL
 * key combinations" and function keys). A change writes
 * `ClassicyDesktopSetShortcutOverride` at once, as a Windows 98 control
 * panel's change applies; Reset (`ClassicyDesktopResetShortcutOverrides`)
 * restores every app's own. Windows 98 had no such page: its programs'
 * shortcuts were fixed, so the panel's layout is Classicy's (recorded in
 * `docs/AGENT-REFERENCE.md` §8).
 */
export const ClassicyKeyboardManager: FunctionalComponent = () => {
	const appIcon = useClassicyAsset("icons", "controlPanels.keyboard.app") ?? "";
	const dispatch = useAppManagerDispatch();
	const identity = useClassicyAppIdentity(APP_ID, {
		name: APP_NAME,
		icon: appIcon,
	});
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const ak = useClassicyBundledAccessKeys();
	const shortcut = useClassicyMenuItemShortcuts();
	const windowClose = useClassicyWindowClose(APP_ID);
	const overrides = useAppManager(
		(s) => s.System?.Manager?.Desktop?.shortcutOverrides,
	) as ClassicyShortcutOverrides | undefined;
	const mountedApps = useClassicyMountedApps();
	const appIdentityOverrides = useClassicyAppIdentityOverrides();

	// The listed commands of each mounted app, in the catalog's order.
	const groups = useMemo(() => {
		const byApp = new Map<string, ClassicyBundledMenuShortcut[]>();
		for (const entry of CLASSICY_BUNDLED_MENU_SHORTCUTS) {
			if (!mountedApps.has(entry.appId)) continue;
			const list = byApp.get(entry.appId) ?? [];
			list.push(entry);
			byApp.set(entry.appId, list);
		}
		return [...byApp.entries()].map(([appId, entries]) => ({
			appId,
			name: classicyAppIdentityFrom(appIdentityOverrides, appId, {
				name: entries[0].appName,
				icon: "",
			}).name,
			entries,
		}));
	}, [mountedApps, appIdentityOverrides]);

	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			accessKey: ak("f"),
			menuChildren: [
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				{
					...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
						windowClose(WINDOW_ID, quitAppHelper(APP_ID, APP_NAME, appIcon)),
					),
					accessKey: ak("c"),
					keyboardShortcut: shortcut(`${APP_ID}_close_window`, "⌥W"),
				},
				{ id: "spacer" },
				{
					...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
					accessKey: ak(""),
					keyboardShortcut: shortcut(`${APP_ID}_quit`, "⌥Q"),
				},
			],
		},
	];

	const shortcutsPage = (
		<div className="classicyKeyboardManagerShortcuts">
			{groups.length === 0 ? (
				<p>No application with keyboard shortcuts is installed.</p>
			) : (
				groups.map((group) => (
					<ClassicyControlGroup key={group.appId} label={group.name}>
						{group.entries.map((entry) => {
							const value = resolveClassicyMenuItemShortcut(
								overrides,
								entry.id,
								entry.shortcut,
							);
							return (
								<ClassicyKeyboardEquivalentField
									key={entry.id}
									id={`KeyboardManager_${entry.id}`}
									appId={APP_ID}
									label={entry.title}
									buttonLabel="Change…"
									value={value}
									inUse={classicyKeyboardShortcutsInUse(entry, overrides)}
									onChange={(chosen) =>
										dispatch({
											type: "ClassicyDesktopSetShortcutOverride",
											itemId: entry.id,
											shortcut: chosen,
											defaultShortcut: entry.shortcut,
										})
									}
								/>
							);
						})}
					</ClassicyControlGroup>
				))
			)}
		</div>
	);

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={WINDOW_ID}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={identity.name}
				appId={APP_ID}
				icon={identity.icon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={true}
				collapsable={false}
				initialSize={[400, 360]}
				initialPosition={[320, 60]}
				modal={false}
				appMenu={appMenu}
			>
				<div className="classicyKeyboardManagerContent">
					<ClassicyTabs
						tabs={[{ title: "Shortcuts", children: shortcutsPage }]}
					/>
					<div className="classicyKeyboardManagerButtons">
						<ClassicyButton
							accessKey={ak("R")}
							disabled={!overrides}
							onClickFunc={() =>
								dispatch({ type: "ClassicyDesktopResetShortcutOverrides" })
							}
						>
							Reset
						</ClassicyButton>
					</div>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
};
