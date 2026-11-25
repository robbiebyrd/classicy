import "./ClassicyShellDialogs.scss";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { isClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";
import {
	type ClassicyShutDownChoice,
	isClassicyShutDownChoice,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { SYSTEM_DIALOG_WINDOW_IDS } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { desktopVolume } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";
import { ClassicyFileOpenDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import {
	classicyResolveRunCommand,
	classicyRunCommandText,
	classicyRunMissingMessage,
	runClassicyRunTarget,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyRunCommand.internal";
import {
	closeClassicySessionPrograms,
	startClassicyFreshSession,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyShellSession.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyWindowSelfPadding } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding";

/**
 * The Windows shell's own dialogs and power screens (plan 0020-w98 E2),
 * opened from its Start menu: Shut Down Windows (with Stand by, Shut down and
 * Restart), Run and Log Off Windows, each as Windows 98 SE's shell32 lays it
 * out (dialogs 1003, 1065 and 1071 of its resources), and the screens Stand
 * by and Shut down leave. `ClassicyDesktop` mounts `ClassicyShellDialogs`
 * only while the layout declares a `taskbar`. Internal: not exported from the
 * package.
 */

/** The app that owns the shell's dialogs: the desktop's (Explorer's). */
const SHELL_APP_ID = "Finder.app";

/** The shell's name in its dialogs' text ("Shut Down Windows"). */
export const classicyShellName = (layout: ClassicyAppearanceLayout): string =>
	layout.taskbar?.startBanner?.title ?? "Windows";

/** What the screen shows after Stand by or Shut down, else nothing. */
export type ClassicyPowerState = "standBy" | "off";

/**
 * The text of each Shut Down choice, as Windows 98 SE's shell32 dialog 1065
 * spells it (its access keys, S&tand by, &Shut down and &Restart, arrive with
 * the controls' access keys).
 */
export const CLASSICY_SHUT_DOWN_CHOICE_LABELS: Record<
	ClassicyShutDownChoice,
	string
> = {
	standBy: "Stand by",
	shutDown: "Shut down",
	restart: "Restart",
};

/** The Run dialog's prompt, shell32 dialog 1003's, naming the shell. */
export const classicyRunPrompt = (shell: string): string =>
	`Type the name of a program, folder, document, or Internet resource, and ${shell} will open it for you.`;

/** The text a power screen shows: Shut down's, and none for Stand by. */
export const CLASSICY_SAFE_TO_TURN_OFF_LINES = [
	"It's now safe to turn off",
	"your computer.",
] as const;

/** Props every shell dialog takes. */
type ClassicyShellDialogFrameProps = {
	/** The dialog's window id (`SYSTEM_DIALOG_WINDOW_IDS`). */
	id: string;
	/** The dialog's variant class (`classicyShellDialogRun`, …). */
	variant: string;
	title: string;
	/** Where it opens: centered (`DS_CENTER`), or above the Start button. */
	position: "center" | "lowerLeft";
	/** Cancel: the caption's Close box, Escape. */
	onCancel: () => void;
	/** The default button's action: Return. */
	onDefault: () => void;
	/** The element focused when it opens (else its first control). */
	initialFocusRef?: { current: HTMLElement | null };
	children: ReactNode;
};

/**
 * A shell dialog's window: a modal `ClassicyWindow` of the desktop's, titled,
 * its caption's Close box Cancel, Return its default button and Escape
 * Cancel, Tab kept inside it, its content padding itself
 * (`classicyShellDialog`).
 */
const ClassicyShellDialogFrame: FunctionalComponent<
	ClassicyShellDialogFrameProps
> = ({
	id,
	variant,
	title,
	position,
	onCancel,
	onDefault,
	initialFocusRef,
	children,
}) => {
	const contentRef = useRef<HTMLDivElement | null>(null);
	useKeyboardEquivalents({
		onDefault,
		onCancel,
		targetRef: contentRef,
	});
	useFocusTrap({ ref: contentRef, autoFocus: true, initialFocusRef });
	return (
		<ClassicyWindow
			id={id}
			appId={SHELL_APP_ID}
			title={title}
			hideIcon={true}
			closable={false}
			onCaptionClose={onCancel}
			resizable={false}
			zoomable={false}
			collapsable={false}
			scrollable={false}
			modal={true}
			initialSize={[0, 0]}
			initialPosition={
				position === "center" ? ["center", "center"] : ["left", "bottom"]
			}
			analyticsExclude
		>
			<ClassicyWindowSelfPadding rootRef={contentRef}>
				<div
					ref={contentRef}
					className={`classicyShellDialog ${variant}`}
					role="dialog"
					aria-modal="true"
					aria-label={title}
				>
					{children}
				</div>
			</ClassicyWindowSelfPadding>
		</ClassicyWindow>
	);
};

/** A shell dialog's icon, from the active package's icons. */
const ShellDialogIcon: FunctionalComponent<{ iconKey: string }> = ({
	iconKey,
}) => {
	const src = useClassicyAsset("icons", iconKey) ?? "";
	return (
		<div className="classicyShellDialogIcon" aria-hidden="true">
			{src && (
				<ClassicyIconImage
					src={src}
					drawnAt={Number.POSITIVE_INFINITY}
					alt=""
				/>
			)}
		</div>
	);
};

type ClassicyShutDownDialogProps = {
	shell: string;
	onClose: () => void;
	/** Runs the chosen command once the dialog has closed. */
	onChoose: (choice: ClassicyShutDownChoice) => void;
};

/**
 * Shut Down Windows (shell32 dialog 1065): "What do you want the computer to
 * do?" over the choices Classicy can make, Stand by, Shut down and Restart,
 * opened on the last one chosen (Shut down the first time), then OK and
 * Cancel. Windows 98 SE hid the choices a computer could not make; Classicy
 * has no wake events, hibernation, MS-DOS mode or Log off here (Log Off is the
 * Start menu's), so those are left out as Windows left them out, and its Help
 * button too, which opened a Help topic Classicy does not have.
 */
const ClassicyShutDownDialog: FunctionalComponent<
	ClassicyShutDownDialogProps
> = ({ shell, onClose, onChoose }) => {
	const stored = useAppManager(
		(s) => s.System.Manager.Desktop.taskbar?.shutDownChoice,
	);
	const [choice, setChoice] = useState<ClassicyShutDownChoice>(() =>
		isClassicyShutDownChoice(stored) ? stored : "shutDown",
	);
	const optionsRef = useRef<HTMLElement | null>(null);
	const contentKey = "classicy-shut-down";
	// Only the choice it opened on takes the focus.
	const [openedOn] = useState(choice);
	useLayoutEffect(() => {
		optionsRef.current = document.getElementById(`${contentKey}-${openedOn}`);
	}, [openedOn]);
	const ok = useCallback(() => onChoose(choice), [choice, onChoose]);
	return (
		<ClassicyShellDialogFrame
			id={SYSTEM_DIALOG_WINDOW_IDS.shutDown}
			variant="classicyShellDialogShutDown"
			title={`Shut Down ${shell}`}
			position="center"
			onCancel={onClose}
			onDefault={ok}
			initialFocusRef={optionsRef}
		>
			<div className="classicyShellDialogTop">
				<ShellDialogIcon iconKey="system.bigSwitchOff" />
				<div className="classicyShellDialogBody">
					<p className="classicyShellDialogPrompt" id={`${contentKey}-prompt`}>
						What do you want the computer to do?
					</p>
					<ClassicyRadioInput
						name={contentKey}
						align="columns"
						className="classicyShellDialogOptions"
						inputs={(["standBy", "shutDown", "restart"] as const).map((id) => ({
							id: `${contentKey}-${id}`,
							label: CLASSICY_SHUT_DOWN_CHOICE_LABELS[id],
							checked: id === choice,
						}))}
						onClickFunc={(id) => {
							const next = id.slice(contentKey.length + 1);
							if (isClassicyShutDownChoice(next)) setChoice(next);
						}}
					/>
				</div>
			</div>
			<div className="classicyShellDialogButtons">
				<ClassicyButton isDefault={true} onClickFunc={ok}>
					OK
				</ClassicyButton>
				<ClassicyButton onClickFunc={onClose}>Cancel</ClassicyButton>
			</div>
		</ClassicyShellDialogFrame>
	);
};

type ClassicyLogOffDialogProps = {
	shell: string;
	onClose: () => void;
	onLogOff: () => void;
};

/**
 * Log Off Windows (shell32 dialog 1071): "Are you sure you want to log off?"
 * with Yes, the default, and No.
 */
const ClassicyLogOffDialog: FunctionalComponent<ClassicyLogOffDialogProps> = ({
	shell,
	onClose,
	onLogOff,
}) => (
	<ClassicyShellDialogFrame
		id={SYSTEM_DIALOG_WINDOW_IDS.logOff}
		variant="classicyShellDialogLogOff"
		title={`Log Off ${shell}`}
		position="center"
		onCancel={onClose}
		onDefault={onLogOff}
	>
		<div className="classicyShellDialogTop">
			<ShellDialogIcon iconKey="system.security.key" />
			<div className="classicyShellDialogBody">
				<p className="classicyShellDialogPrompt">
					Are you sure you want to log off?
				</p>
			</div>
		</div>
		<div className="classicyShellDialogButtons">
			<ClassicyButton isDefault={true} onClickFunc={onLogOff}>
				Yes
			</ClassicyButton>
			<ClassicyButton onClickFunc={onClose}>No</ClassicyButton>
		</div>
	</ClassicyShellDialogFrame>
);

/** The Open box's id in the Run dialog. */
export const CLASSICY_RUN_FIELD_ID = "classicy-run-open";

/** A path the Run dialog's Browse… puts in the Open box: quoted when it holds a space, as Windows quotes it. */
export const classicyRunBrowsedCommand = (path: string): string =>
	/\s/.test(path) ? `"${path}"` : path;

/**
 * Run (shell32 dialog 1003): its icon and prompt, the Open box (an editable
 * combo box of the earlier commands, `taskbar.runHistory`, opened on the
 * last one with its text selected), then OK (dimmed while the box is empty),
 * Cancel and Browse…. OK runs the command (`classicyResolveRunCommand`):
 * an http(s) URL, a file or folder path through Finder, a program by its name
 * or id; a command naming nothing shows Windows' "Cannot find the file"
 * message, captioned with the name, and returns to the dialog with the text
 * selected. Browse… opens an Open dialog ("Browse") whose choice fills the
 * box. It opens in the work area's lower-left corner, above the Start button.
 */
const ClassicyRunDialog: FunctionalComponent<{
	shell: string;
	onClose: () => void;
}> = ({ shell, onClose }) => {
	const dispatch = useAppManagerDispatch();
	const getFileSystem = useClassicyFileSystemAccessor();
	const overrides = useClassicyAppIdentityOverrides();
	const history = useAppManager(
		(s) => s.System.Manager.Desktop.taskbar?.runHistory,
	);
	const earlier = useMemo(
		() =>
			Array.isArray(history)
				? history.filter((entry): entry is string => typeof entry === "string")
				: [],
		[history],
	);
	const [initial, setInitial] = useState(() => earlier[0] ?? "");
	const [text, setText] = useState(initial);
	// Remounts the Open box with `initial`: Browse… replaces its text.
	const [fieldKey, setFieldKey] = useState(0);
	const [missing, setMissing] = useState<string | null>(null);
	const [browsing, setBrowsing] = useState(false);
	const fieldRef = useRef<HTMLElement | null>(null);

	// The Open box is focused with its text selected, on open and after the
	// message or Browse… hands the dialog back.
	const selectField = useCallback(() => {
		const input = document.getElementById(CLASSICY_RUN_FIELD_ID);
		if (input instanceof HTMLInputElement) {
			input.focus();
			input.select();
		}
	}, []);
	useLayoutEffect(() => {
		fieldRef.current = document.getElementById(CLASSICY_RUN_FIELD_ID);
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: on open, and when Browse… refills the box
	useEffect(() => {
		selectField();
	}, [fieldKey, selectField]);

	const run = useCallback(() => {
		const command = classicyRunCommandText(text);
		if (command === "") return;
		const fs = getFileSystem();
		const apps = useAppManager.getState().System.Manager.Applications.apps;
		const target = classicyResolveRunCommand(command, {
			apps,
			isMounted: isClassicyAppMounted,
			overrides,
			fs,
		});
		if (target.kind === "missing") {
			setMissing(target.name);
			return;
		}
		dispatch({ type: "ClassicyDesktopTaskbarAddRunCommand", command: text });
		onClose();
		runClassicyRunTarget(target, fs, dispatch);
	}, [text, getFileSystem, overrides, dispatch, onClose]);

	const volumes = useMemo(
		() => [desktopVolume(getFileSystem())],
		[getFileSystem],
	);

	return (
		<>
			<ClassicyShellDialogFrame
				id={SYSTEM_DIALOG_WINDOW_IDS.run}
				variant="classicyShellDialogRun"
				title="Run"
				position="lowerLeft"
				onCancel={onClose}
				onDefault={run}
				initialFocusRef={fieldRef}
			>
				<div className="classicyShellDialogTop">
					<ShellDialogIcon iconKey="system.files.application" />
					<div className="classicyShellDialogBody">
						<p className="classicyShellDialogPrompt">
							{classicyRunPrompt(shell)}
						</p>
					</div>
				</div>
				<div className="classicyShellDialogField">
					<label
						className="classicyShellDialogFieldLabel"
						htmlFor={CLASSICY_RUN_FIELD_ID}
					>
						Open:
					</label>
					<ClassicyComboBox
						key={fieldKey}
						id={CLASSICY_RUN_FIELD_ID}
						options={earlier.map((entry) => ({ value: entry, label: entry }))}
						prefillValue={initial}
						filter={false}
						onChangeFunc={setText}
					/>
				</div>
				<div className="classicyShellDialogButtons">
					<ClassicyButton
						isDefault={true}
						disabled={classicyRunCommandText(text) === ""}
						onClickFunc={run}
					>
						OK
					</ClassicyButton>
					<ClassicyButton onClickFunc={onClose}>Cancel</ClassicyButton>
					<ClassicyButton onClickFunc={() => setBrowsing(true)}>
						Browse...
					</ClassicyButton>
				</div>
			</ClassicyShellDialogFrame>
			{missing !== null && (
				<ClassicyAlert
					id="run_missing"
					appId={SHELL_APP_ID}
					alertType="stop"
					title={missing}
					label={classicyRunMissingMessage(missing)}
					buttons={[{ id: "ok", label: "OK", role: "default" }]}
					onClose={() => {
						setMissing(null);
						dispatch({
							type: "ClassicyWindowFocus",
							app: { id: SHELL_APP_ID },
							window: { id: SYSTEM_DIALOG_WINDOW_IDS.run },
						});
						requestAnimationFrame(selectField);
					}}
				/>
			)}
			<ClassicyFileOpenDialog
				id="run_browse"
				appId={SHELL_APP_ID}
				open={browsing}
				title="Browse"
				volumes={volumes}
				fileTypeFilters={[
					{
						label: "Programs",
						types: [ClassicyFileSystemEntryFileType.AppShortcut],
					},
					{ label: "All Files", types: null },
				]}
				onOpenFunc={([selection]) => {
					setBrowsing(false);
					if (selection) {
						const command = classicyRunBrowsedCommand(selection.entry.id);
						setInitial(command);
						setText(command);
						setFieldKey((key) => key + 1);
					}
				}}
				onCancelFunc={() => {
					setBrowsing(false);
					requestAnimationFrame(selectField);
				}}
			/>
		</>
	);
};

/**
 * The screen Stand by and Shut down leave (`classicyPowerScreen`, above
 * everything, the pointer hidden): Stand by's is dark, as the display went
 * dark, and a key or a button press wakes the session as it was; Shut down's
 * is Windows 98's "It's now safe to turn off your computer." (its LOGOS.SYS,
 * drawn: the package holds no Microsoft bitmap of it), and a key or a press
 * powers on, a fresh session (`startClassicyFreshSession("restart")`). The
 * waking key or press is swallowed (window capture, so it runs before the
 * screen saver's document listeners), the click that follows a press too,
 * and a screen saver that started meanwhile is woken with it.
 */
const ClassicyPowerScreen: FunctionalComponent<{
	state: ClassicyPowerState;
	onWake: () => void;
}> = ({ state, onWake }) => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		let woken = false;
		const swallowClick = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			window.removeEventListener("click", swallowClick, true);
		};
		const wake = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			if (woken) return;
			woken = true;
			if (e.type === "mousedown")
				window.addEventListener("click", swallowClick, true);
			const saver =
				useAppManager.getState().System.Manager.Applications.apps[
					SCREEN_SAVER_APP_ID
				];
			if ((saver?.data as { active?: unknown } | undefined)?.active === true)
				dispatch({ type: "ClassicyAppScreenSaverDeactivate" });
			onWake();
		};
		window.addEventListener("keydown", wake, true);
		window.addEventListener("mousedown", wake, true);
		return () => {
			window.removeEventListener("keydown", wake, true);
			window.removeEventListener("mousedown", wake, true);
			// The click that follows a press may land after the unmount.
			setTimeout(
				() => window.removeEventListener("click", swallowClick, true),
				0,
			);
		};
	}, [dispatch, onWake]);
	return (
		<div
			className={`classicyPowerScreen ${
				state === "off"
					? "classicyPowerScreenOff"
					: "classicyPowerScreenStandBy"
			}`}
			role={state === "off" ? "status" : "presentation"}
		>
			{state === "off" && (
				<p className="classicyPowerScreenMessage">
					{CLASSICY_SAFE_TO_TURN_OFF_LINES[0]}
					<br />
					{CLASSICY_SAFE_TO_TURN_OFF_LINES[1]}
				</p>
			)}
		</div>
	);
};

export type ClassicyShellDialogsProps = {
	/**
	 * What Log Off's Yes does once the programs have closed, the host's own
	 * logon (`ClassicyDesktop`'s `onLogOff`); absent, a fresh session starts
	 * (`startClassicyFreshSession("logOff")`).
	 */
	onLogOff?: () => void;
};

/**
 * The Windows shell's system dialogs (`systemDialog` `"shutDown"`, `"run"`,
 * `"logOff"`) and power screens. Shut Down and Log Off are system modal:
 * the screen behind them is dimmed (`classicyShellDialogDim`, above the
 * taskbar, which the package draws as Windows 98's 50% dither of black). Run
 * is the taskbar's, and dims nothing.
 */
export const ClassicyShellDialogs: FunctionalComponent<
	ClassicyShellDialogsProps
> = ({ onLogOff }) => {
	const dispatch = useAppManagerDispatch();
	const layout = useClassicyAppearanceLayout();
	const shell = classicyShellName(layout);
	const dialog = useAppManager(
		(s) => s.System.Manager.Desktop.systemDialog ?? null,
	);
	const [power, setPower] = useState<ClassicyPowerState | null>(null);

	const close = useCallback(() => {
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: null });
	}, [dispatch]);

	const choose = useCallback(
		(choice: ClassicyShutDownChoice) => {
			dispatch({ type: "ClassicyDesktopTaskbarSetShutDownChoice", choice });
			close();
			if (choice === "standBy") {
				setPower("standBy");
				return;
			}
			closeClassicySessionPrograms(dispatch);
			if (choice === "shutDown") setPower("off");
			else startClassicyFreshSession("restart");
		},
		[dispatch, close],
	);

	const logOff = useCallback(() => {
		close();
		closeClassicySessionPrograms(dispatch);
		if (onLogOff) onLogOff();
		else startClassicyFreshSession("logOff");
	}, [close, dispatch, onLogOff]);

	const wake = useCallback(() => {
		if (power === "off") startClassicyFreshSession("restart");
		else setPower(null);
	}, [power]);

	const dimmed = dialog === "shutDown" || dialog === "logOff";
	return (
		<>
			{dimmed && <div className="classicyShellDialogDim" aria-hidden="true" />}
			{dialog === "shutDown" && (
				<ClassicyShutDownDialog
					shell={shell}
					onClose={close}
					onChoose={choose}
				/>
			)}
			{dialog === "logOff" && (
				<ClassicyLogOffDialog shell={shell} onClose={close} onLogOff={logOff} />
			)}
			{dialog === "run" && <ClassicyRunDialog shell={shell} onClose={close} />}
			{power !== null && <ClassicyPowerScreen state={power} onWake={wake} />}
		</>
	);
};
