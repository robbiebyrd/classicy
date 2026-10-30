import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
} from "react";
import { pickWindowToRestore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyAppIdContext } from "@/SystemFolder/SystemResources/App/ClassicyAppIdContext";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { normalizeIconBalloonHelp } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { canonicalChord } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/** A keyboard chord an `extension` app registers app-wide (`globalShortcuts`). */
export type ClassicyGlobalShortcut = {
	/** The chord, in any `parseKeyboardShortcut` spelling (e.g. `"⌃⌘S"`). */
	shortcut: string;
	/** Action type dispatched when the chord fires. */
	event: string;
	/** Extra fields spread into the dispatched action. */
	eventData?: Record<string, unknown>;
};

export interface ClassicyAppProps {
	/** Unique app id; the `.app` suffix is convention (`"TV.app"`). Keys
	 *  `System.Manager.Applications.apps[id]`. */
	id: string;
	/** Internal name and default display name. Keys
	 *  `ClassicyApp${name}OpenFile`/`CloseFile`; an Appearance Package may show
	 *  another name (`apps`), never changing this one. */
	name: string;
	/** App icon (URL or data URI), used for the desktop icon and menus. */
	icon: string;
	/** Id of the window to focus when the app is focused and none of its
	 *  windows is, provided that window is open. */
	defaultWindow?: string;
	/** When the app is focused with none of its windows focused, raise the
	 *  most recent one (else `defaultWindow`). Defaults to true. Finder turns it
	 *  off: with no Finder window focused, its desktop is the active surface,
	 *  and clicking a desktop icon must not bring a window forward. */
	restoreWindowFocus?: boolean;
	/** Draw an icon for this app on the desktop. Defaults to true. Ignored for
	 *  `extension` apps, which are background-only. */
	showDesktopIcon?: boolean;
	/** List this app in the derived Applications folder. Defaults to true, and
	 *  is independent of `showDesktopIcon` — an app can appear on the desktop
	 *  but not in Applications, or the reverse. Ignored for `extension` apps. */
	showInApplicationsFolder?: boolean;
	/** Balloon help for this app's desktop icon: a string or
	 *  `{ title?, content, position?, delay? }`. A bare string (or an object
	 *  without a title) is titled with the app's name. When omitted, the app's
	 *  registered manifest description (`registerApp`) is used, so a registered
	 *  app's icon carries purpose copy with no extra wiring. */
	desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp;
	/** @deprecated Use `showDesktopIcon={false}`. Unlike before, this alone no
	 *  longer keeps the app out of Applications — pass
	 *  `showInApplicationsFolder={false}` for that. */
	noDesktopIcon?: boolean;
	/** @deprecated Use `showInApplicationsFolder`. Note that this no longer
	 *  needs to accompany `noDesktopIcon` — Applications membership now
	 *  defaults to true on its own. */
	inApplicationsFolder?: boolean;
	/** Add the app to the Apple (system) menu. Ignored for `extension` apps. */
	addSystemMenu?: boolean;
	/** Background-only app (e.g. Apple Guide, Screen Saver): no desktop icon,
	 *  no Applications listing, no Apple-menu entry, never treated as the
	 *  focused app by the menu bar; it parades at startup and may register
	 *  `globalShortcuts`. */
	extension?: boolean;
	/** Global keyboard shortcuts, honored only for `extension` apps. Each is
	 *  registered into the shortcut registry on mount (first-registrant wins)
	 *  and unregistered on unmount; firing dispatches `event` (+ `eventData`). */
	globalShortcuts?: ClassicyGlobalShortcut[];
	/** Show an icon in the startup parade without being an extension.
	 *  `true` uses the app's own icon; a string (any icon URL, including
	 *  ClassicyIcons.* values) shows that icon instead. Ignored when
	 *  `extension` is set — extensions already parade. */
	bootIcon?: boolean | string;
	/** File types Finder may open with this app. Opening one dispatches
	 *  `` `ClassicyApp${name}OpenFile` ``; unless the app handles that action
	 *  itself, the path is queued in `apps[id].data.openFiles`. */
	handlesFileTypes?: ClassicyFileSystemEntryFileType[];
	/** Render your own windows for queued `openFiles`. When `false`, the app
	 *  renders one plain window per queued path whose close dispatches
	 *  `` `ClassicyApp${name}CloseFile` ``. Defaults to `false`. */
	handlesOwnFiles?: boolean;
	/** App-level right-click menu: the fallback for any of this app's windows
	 *  without its own `contextMenu` (a `ClassicyContextualMenuTarget` inside a
	 *  window wins over both). Sent with `ClassicyAppLoad`, which does not
	 *  re-run when only this array changes. */
	contextMenu?: ClassicyMenuItem[];
	/** The app's windows (`ClassicyWindow`) and other UI. Rendered only while
	 *  the app is open. */
	children?: ReactNode;
}

/**
 * The container for one Classicy application — the desktop metaphor's
 * equivalent of a running program, with no HTML counterpart. On mount it loads
 * the app into the window manager (`ClassicyAppLoad`), registers its desktop
 * icon (an `app_shortcut`, drawn with the alias badge) and Applications-folder
 * entry, and optionally an Apple-menu item and a startup-parade icon. Its
 * children render only while the app is open, which a double-click on its icon
 * or a `ClassicyAppOpen` dispatch does.
 *
 * Every `ClassicyWindow` must render inside its app, with `appId` set to the
 * app's `id`. Clicking anywhere in the app activates it (`ClassicyAppActivate`).
 * Register a manifest with `registerApp` for custom state and actions; its
 * description also becomes the desktop icon's balloon help.
 *
 * ```tsx
 * <ClassicyApp id="TV.app" name="TV" icon={icon} defaultWindow="main"
 *   showDesktopIcon={false} desktopIconBalloonHelp="Double-click to watch TV.">
 *   <ClassicyWindow id="main" appId="TV.app" title="TV">…</ClassicyWindow>
 * </ClassicyApp>
 * ```
 */
export const ClassicyApp: FunctionalComponent<ClassicyAppProps> = ({
	id,
	icon,
	// The app's internal name: action types (`ClassicyApp${name}CloseFile`),
	// Finder's OpenFile routing and every store record use it; a package's
	// display name never replaces it.
	name,
	addSystemMenu,
	showDesktopIcon,
	showInApplicationsFolder,
	desktopIconBalloonHelp,
	noDesktopIcon,
	inApplicationsFolder,
	extension,
	globalShortcuts,
	bootIcon,
	defaultWindow,
	restoreWindowFocus = true,
	handlesFileTypes,
	handlesOwnFiles = false,
	contextMenu,
	children,
}) => {
	const appContext = useAppManager(
		(state) => state.System.Manager.Applications.apps[id],
	);

	const desktopEventDispatch = useAppManagerDispatch();

	const isAppOpen = () => {
		return appContext?.open;
	};

	const onFocus = () => {
		desktopEventDispatch({
			type: "ClassicyAppActivate",
			app: { id: id },
		});
	};

	// New props win over their deprecated counterparts. Both surfaces default
	// to on; `extension` overrides both below.
	const drawDesktopIcon = showDesktopIcon ?? !noDesktopIcon;
	const listInApplications =
		showInApplicationsFolder ?? inApplicationsFolder ?? true;
	// An explicit prop wins; otherwise the app's registered manifest
	// description supplies the balloon. Resolved at render, not stored copy:
	// manifests register at module import, before anything mounts, and revised
	// description text ships with the app rather than staying frozen in a
	// persisted icon record.
	// Serialized so the effect's dependency list is stable across renders that
	// pass an inline object literal.
	const balloonHelpKey = JSON.stringify(
		normalizeIconBalloonHelp(
			desktopIconBalloonHelp ?? getAppManifest(id)?.description,
			name,
		) ?? null,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: contextMenu is intentionally omitted to prevent re-firing with inline menu literals
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyAppLoad",
			app: { id, name, icon },
			contextMenu,
			extension,
		});

		// Extensions are background-only: no Apple-menu entry and no desktop
		// icon (which also keeps them out of the derived Applications folder).
		if (addSystemMenu && !extension) {
			desktopEventDispatch({
				type: "ClassicyDesktopAppMenuAdd",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
			});
		} else {
			desktopEventDispatch({
				type: "ClassicyDesktopAppMenuRemove",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
			});
		}

		if (!extension) {
			const balloonHelp: ClassicyIconBalloonHelp | null =
				JSON.parse(balloonHelpKey);
			if (drawDesktopIcon || listInApplications) {
				desktopEventDispatch({
					type: "ClassicyDesktopIconAdd",
					app: {
						id: id,
						name: name,
						icon: icon,
					},
					kind: "app_shortcut",
					// A hidden icon still populates the derived Applications folder,
					// which is built from app-shortcut icon records.
					...(drawDesktopIcon ? {} : { hidden: true }),
					...(listInApplications ? {} : { inApplications: false }),
					...(balloonHelp ? { balloonHelp } : {}),
				});
			} else {
				// Icons persist to localStorage, so opting out of both surfaces has
				// to clear any record left by an earlier registration.
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: {
						id: id,
						name: name,
					},
				});
			}
		}

		if (bootIcon && !extension) {
			desktopEventDispatch({
				type: "ClassicyBootParadeIconAdd",
				id,
				icon: typeof bootIcon === "string" ? bootIcon : icon,
				name,
			});
		}
	}, [
		addSystemMenu,
		drawDesktopIcon,
		listInApplications,
		balloonHelpKey,
		extension,
		bootIcon,
		desktopEventDispatch,
		id,
		name,
		icon,
	]);

	// Runtime presence, separate from the persisted app record: Control Strip
	// modules registered with this app's id show only while it is mounted.
	useEffect(() => markClassicyAppMounted(id), [id]);

	const handlesFileTypesKey = handlesFileTypes?.slice().sort().join(",") ?? "";
	useEffect(() => {
		if (handlesFileTypesKey) {
			desktopEventDispatch({
				type: "ClassicyAppRegisterFileTypes",
				app: { id },
				fileTypes: handlesFileTypesKey.split(","),
			});
		}
	}, [desktopEventDispatch, id, handlesFileTypesKey]);

	const globalShortcutsKey = JSON.stringify(
		extension ? (globalShortcuts ?? []) : [],
	);
	useEffect(() => {
		if (!extension) return;
		const list: ClassicyGlobalShortcut[] = JSON.parse(globalShortcutsKey);
		const registered: string[] = [];
		for (const gs of list) {
			const chord = canonicalChord(gs.shortcut);
			if (!chord) continue;
			registered.push(chord);
			desktopEventDispatch({
				type: "ClassicyShortcutRegister",
				scope: "global",
				appId: id,
				chord,
				event: gs.event,
				eventData: gs.eventData,
			});
		}
		return () => {
			for (const chord of registered) {
				desktopEventDispatch({
					type: "ClassicyShortcutUnregister",
					scope: "global",
					appId: id,
					chord,
				});
			}
		};
	}, [extension, globalShortcutsKey, id, desktopEventDispatch]);

	// When the app holds focus but none of its open windows does, hand focus
	// to the window that had it most recently (falling back to defaultWindow).
	// Reads the live store rather than this render's snapshot: windows that
	// register or take focus in the same commit (a dialog opened by a click)
	// have already updated the store by the time this effect runs, and acting
	// on the stale snapshot would raise the old window over the new one.
	useEffect(() => {
		if (!defaultWindow || !restoreWindowFocus) return;
		const app =
			typeof useAppManager.getState === "function"
				? useAppManager.getState().System.Manager.Applications.apps[id]
				: appContext;
		if (!app?.focused) return;
		if (listAppWindows(app).some((w) => w.focused && !w.closed)) return;
		const defaultWin = getAppWindow(app, defaultWindow);
		const target =
			pickWindowToRestore(app) ??
			(defaultWin && !defaultWin.closed ? defaultWin : undefined);
		if (!target) return;
		desktopEventDispatch({
			type: "ClassicyWindowFocus",
			app: {
				id: id,
			},
			window: {
				id: target.id,
			},
		});
		// appContext is the re-run trigger (any change to this app's record);
		// the body reads the live store.
	}, [appContext, defaultWindow, restoreWindowFocus, desktopEventDispatch, id]);

	const rawOpenFiles = appContext?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${name}CloseFile`,
				app: { id },
				path,
			});
		},
		[desktopEventDispatch, id, name],
	);

	return (
		<ClassicyAppIdContext.Provider value={id}>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: application container captures focus for the app; keyboard users interact with child windows directly */}
			<div role="application" onClick={onFocus}>
				{isAppOpen() && (
					<>
						{children}
						{!handlesOwnFiles &&
							openFiles.map((filePath: string, idx: number) => (
								<ClassicyWindow
									key={`${id}_file_${filePath}`}
									id={`${id}_file_${filePath}`}
									title={filePath.split(":").pop() || filePath}
									appId={id}
									initialSize={[400, 200]}
									initialPosition={[100 + idx * 30, 100 + idx * 30]}
									onCloseFunc={() => closeFile(filePath)}
								>
									<span>{filePath}</span>
								</ClassicyWindow>
							))}
					</>
				)}
			</div>
		</ClassicyAppIdContext.Provider>
	);
};
