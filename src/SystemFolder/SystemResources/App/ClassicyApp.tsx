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
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

export interface ClassicyAppProps {
	id: string;
	name: string;
	icon: string;
	defaultWindow?: string;
	noDesktopIcon?: boolean;
	addSystemMenu?: boolean;
	debug?: boolean;
	handlesFileTypes?: ClassicyFileSystemEntryFileType[];
	handlesOwnFiles?: boolean;
	children?: ReactNode;
}

export const ClassicyApp: FunctionalComponent<ClassicyAppProps> = ({
	id,
	icon,
	name,
	addSystemMenu,
	noDesktopIcon,
	defaultWindow,
	debug = false,
	handlesFileTypes,
	handlesOwnFiles = false,
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

	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyAppLoad",
			app: { id, name, icon },
		});

		if (addSystemMenu) {
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

		if (!noDesktopIcon) {
			desktopEventDispatch({
				type: "ClassicyDesktopIconAdd",
				app: {
					id: id,
					name: name,
					icon: icon,
				},
				kind: "app_shortcut",
			});
		}
	}, [addSystemMenu, noDesktopIcon, desktopEventDispatch, id, name, icon]);

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

	useEffect(() => {
		if (appContext?.focused && defaultWindow) {
			const anyWindowFocused = appContext?.windows?.some((w) => w.focused);
			const defaultWindowExists = appContext?.windows?.some(
				(w) => w.id === defaultWindow,
			);
			if (!anyWindowFocused && defaultWindowExists) {
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

	const openFiles: string[] = appContext?.data?.openFiles ?? [];

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
					{!handlesOwnFiles && openFiles.map((filePath: string, idx: number) => (
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
