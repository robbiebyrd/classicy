import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
} from "react";
import { JSONTree } from "react-json-tree";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { normalizeIconBalloonHelp } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { canonicalChord } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

export type ClassicyGlobalShortcut = {
	shortcut: string;
	event: string;
	eventData?: Record<string, unknown>;
};

export interface ClassicyAppProps {
	id: string;
	name: string;
	icon: string;
	defaultWindow?: string;
	/** Draw an icon for this app on the desktop. Defaults to true. Ignored for
	 *  `extension` apps, which are background-only. */
	showDesktopIcon?: boolean;
	/** List this app in the derived Applications folder. Defaults to true, and
	 *  is independent of `showDesktopIcon` — an app can appear on the desktop
	 *  but not in Applications, or the reverse. Ignored for `extension` apps. */
	showInApplicationsFolder?: boolean;
	/** Balloon help for this app's desktop icon. A bare string supplies the
	 *  content and titles the balloon with the app's name. */
	desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp;
	/** @deprecated Use `showDesktopIcon={false}`. */
	noDesktopIcon?: boolean;
	/** @deprecated Use `showInApplicationsFolder`. Note that this no longer
	 *  needs to accompany `noDesktopIcon` — Applications membership now
	 *  defaults to true on its own. */
	inApplicationsFolder?: boolean;
	addSystemMenu?: boolean;
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
	debug?: boolean;
	handlesFileTypes?: ClassicyFileSystemEntryFileType[];
	handlesOwnFiles?: boolean;
	contextMenu?: ClassicyMenuItem[];
	children?: ReactNode;
}

export const ClassicyApp: FunctionalComponent<ClassicyAppProps> = ({
	id,
	icon,
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
	debug = false,
	handlesFileTypes,
	handlesOwnFiles = false,
	contextMenu,
	children,
}) => {
	const appContext = useAppManager(
		(state) => state.System.Manager.Applications.apps[id],
	);

	const desktopEventDispatch = useAppManagerDispatch();

	const activeThemeData = useAppManager(
		(state) => state.System.Manager.Appearance.activeTheme,
	);

	const debuggerJSONTheme = {
		base00: intToHex(activeThemeData.color.white),
		base01: intToHex(activeThemeData.color.black),
		base02: intToHex(activeThemeData.color.system[3]),
		base03: intToHex(activeThemeData.color.system[3]),
		base04: intToHex(activeThemeData.color.system[3]),
		base05: intToHex(activeThemeData.color.system[4]),
		base06: intToHex(activeThemeData.color.system[5]),
		base07: intToHex(activeThemeData.color.system[6]),
		base08: intToHex(activeThemeData.color.error),
		base09: intToHex(activeThemeData.color.theme[2]),
		base0A: intToHex(activeThemeData.color.theme[1]),
		base0B: intToHex(activeThemeData.color.theme[2]),
		base0C: intToHex(activeThemeData.color.theme[3]),
		base0D: intToHex(activeThemeData.color.theme[4]),
		base0E: intToHex(activeThemeData.color.theme[5]),
		base0F: intToHex(activeThemeData.color.theme[6]),
	};

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
	// Serialized so the effect's dependency list is stable across renders that
	// pass an inline object literal.
	const balloonHelpKey = JSON.stringify(
		normalizeIconBalloonHelp(desktopIconBalloonHelp, name) ?? null,
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

	useEffect(() => {
		if (appContext?.focused && defaultWindow) {
			const anyWindowFocused = appContext?.windows?.some((w) => w.focused);
			const defaultWin = appContext?.windows?.find(
				(w) => w.id === defaultWindow,
			);
			if (!anyWindowFocused && defaultWin && !defaultWin.closed) {
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: id,
					},
					window: {
						id: defaultWindow,
					},
				});
			}
		}
	}, [
		appContext?.focused,
		defaultWindow,
		desktopEventDispatch,
		id,
		appContext?.windows,
	]);

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
		// biome-ignore lint/a11y/useKeyWithClickEvents: application container captures focus for the app; keyboard users interact with child windows directly
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
					{debug && (
						<ClassicyWindow
							initialSize={[400, 300]}
							initialPosition={[100, 200]}
							title={`DEBUG ${name}`}
							id={`${id}_debugger`}
							appId={id}
							appMenu={[{ id: "Debug", title: "Debug" }]}
						>
							<h1>Providers</h1>
							<hr />
							<h2>desktopContext</h2>
							<JSONTree data={appContext} theme={debuggerJSONTheme} />
						</ClassicyWindow>
					)}
				</>
			)}
		</div>
	);
};
