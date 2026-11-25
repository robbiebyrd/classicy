import "./ClassicyOpenWithDialog.scss";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { resolveClassicyAppOpenFileType } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppOpenFileRouting";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyDisplayFileName } from "@/SystemFolder/SystemResources/File/useClassicyDisplayFileName";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import {
	ClassicyListBox,
	type ClassicyListBoxOption,
} from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyWindowSelfPadding } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding";

/** The Open With dialog's window id. */
export const CLASSICY_OPEN_WITH_WINDOW_ID = "finder_open_with";

/** Windows 98 SE's prompt (shell32.dll's "Click the program you want to use to open the file '%s'."). */
export const classicyOpenWithPrompt = (name: string): string =>
	`Click the program you want to use to open the file '${name}'.`;

/** An application the Open With dialog offers. */
export type ClassicyOpenWithApp = { id: string; name: string; icon: string };

/**
 * The applications that open files, as the Open With dialog lists them:
 * every mounted app but the Finder whose manifest declares its own
 * `<prefix>OpenFile` (`resolveClassicyAppOpenFileType`) or that handles
 * any file type (`handlesFileTypes`), shown as the active package shows it
 * (`apps` overrides) and sorted by that name. Live.
 */
export const useClassicyOpenWithApps = (): ClassicyOpenWithApp[] => {
	const apps = useAppManager((state) => state.System.Manager.Applications.apps);
	const mounted = useClassicyMountedApps();
	const overrides = useClassicyAppIdentityOverrides();
	return useMemo(
		() =>
			Object.values(apps)
				.filter(
					(app) =>
						app.id !== "Finder.app" &&
						mounted.has(app.id) &&
						(resolveClassicyAppOpenFileType(app.id) !== undefined ||
							(app.handlesFileTypes?.length ?? 0) > 0),
				)
				.map((app) => {
					const override = Object.hasOwn(overrides, app.id)
						? overrides[app.id]
						: undefined;
					return {
						id: app.id,
						name: override?.name ?? app.name,
						icon: override?.icon ?? app.icon,
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name)),
		[apps, mounted, overrides],
	);
};

/** Props for `ClassicyOpenWithDialog`. */
export type ClassicyOpenWithDialogProps = {
	/** The owning app's id (Finder's, which shows the dialog). */
	appId: string;
	/** The file system the file lives in. */
	fs: ClassicyFileSystem;
	/** The path of the file to open. */
	path: string;
	/** Extra class names, merged onto the dialog window after its own. */
	className?: string;
	/** Inline style, merged onto the dialog window after its own. */
	style?: CSSProperties;
};

/**
 * Windows' Open With dialog (WIG Ch.10 "Registering File Extensions",
 * p.192: an unregistered type's default command; Windows 98 SE's dialog,
 * shell32.dll), which Finder shows while an open waits in it
 * (`layout.files.unregisteredOpen` "openWith"): "Click the program you
 * want to use to open the file '<name>'.", "Choose the program you want to
 * use:" over the applications that open files (`useClassicyOpenWithApps`;
 * a double-click chooses one), "Always use this program to open this type
 * of file" (checked, as Windows 98 opens it; it makes the app the type's
 * handler, `ClassicyAppSetDefaultFileTypeHandler`), then OK, which opens
 * the file in the chosen app under the trust its open arrived with
 * (`ClassicyAppFinderOpenWithChoose`), and Cancel. Windows 98's Other…
 * (and its line "If the program you want is not in the list, click
 * Other.") has no program browser here, nor its "Description of '<ext>'
 * files:" a store of type names: neither is shown.
 */
export const ClassicyOpenWithDialog: FunctionalComponent<
	ClassicyOpenWithDialogProps
> = ({ appId, fs, path, className, style }) => {
	const dispatch = useAppManagerDispatch();
	const ak = useClassicyBundledAccessKeys();
	const shownNames = useClassicyDisplayFileName();
	const apps = useClassicyOpenWithApps();
	const contentRef = useRef<HTMLDivElement | null>(null);
	const [chosen, setChosen] = useState<string | undefined>(undefined);
	const [always, setAlways] = useState(true);

	const entry = fs.resolve(path);
	const name = path.split(fs.separator).pop() ?? path;

	const options = useMemo<ClassicyListBoxOption[]>(
		() =>
			apps.map((app) => ({ value: app.id, label: app.name, icon: app.icon })),
		[apps],
	);

	const choose = useCallback(
		(id: string | undefined) => {
			if (id === undefined) return;
			if (always && entry?._type) {
				dispatch({
					type: "ClassicyAppSetDefaultFileTypeHandler",
					app: { id },
					fileType: entry._type,
				});
			}
			dispatch({ type: "ClassicyAppFinderOpenWithChoose", appId: id });
		},
		[always, entry, dispatch],
	);
	const cancel = useCallback(
		() => dispatch({ type: "ClassicyAppFinderOpenWithClose" }),
		[dispatch],
	);

	useKeyboardEquivalents({
		onDefault: () => choose(chosen),
		onCancel: cancel,
		targetRef: contentRef,
	});
	useFocusTrap({ ref: contentRef, autoFocus: true });

	return (
		<ClassicyWindow
			id={CLASSICY_OPEN_WITH_WINDOW_ID}
			appId={appId}
			title={"Open With"}
			hideIcon={true}
			closable={false}
			resizable={false}
			zoomable={false}
			collapsable={false}
			scrollable={false}
			modal={true}
			initialSize={[0, 0]}
			initialPosition={["center", "center"]}
			analyticsExclude
			className={className}
			style={style}
		>
			<ClassicyWindowSelfPadding rootRef={contentRef}>
				<div
					ref={contentRef}
					className={"classicyOpenWithDialog"}
					role="dialog"
					aria-modal="true"
					aria-label={"Open With"}
				>
					<div className={"classicyOpenWithDialogTop"}>
						<ClassicyIconImage
							className={"classicyOpenWithDialogIcon"}
							src={entry?._icon || iconImageByType(entry?._type ?? "file")}
							drawnAt={Number.POSITIVE_INFINITY}
							alt={""}
						/>
						<p className={"classicyOpenWithDialogPrompt"}>
							{classicyOpenWithPrompt(shownNames.display(name, entry))}
						</p>
					</div>
					<ClassicyListBox
						id={`${CLASSICY_OPEN_WITH_WINDOW_ID}-programs`}
						label={"Choose the program you want to use:"}
						accessKey={ak("C")}
						options={options}
						selected={chosen !== undefined ? [chosen] : []}
						onChangeFunc={(values) => setChosen(values[0])}
						onActivateFunc={(value) => choose(value)}
					/>
					<ClassicyCheckbox
						id={`${CLASSICY_OPEN_WITH_WINDOW_ID}-always`}
						label={"Always use this program to open this type of file"}
						accessKey={ak("u")}
						checked={always}
						onClickFunc={setAlways}
					/>
					<div className={"classicyOpenWithDialogButtons"}>
						<ClassicyButton
							isDefault={true}
							disabled={chosen === undefined}
							onClickFunc={() => choose(chosen)}
						>
							OK
						</ClassicyButton>
						<ClassicyButton onClickFunc={cancel}>Cancel</ClassicyButton>
					</div>
				</div>
			</ClassicyWindowSelfPadding>
		</ClassicyWindow>
	);
};
