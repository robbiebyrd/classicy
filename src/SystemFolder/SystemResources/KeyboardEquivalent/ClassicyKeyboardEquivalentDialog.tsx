import "./ClassicyKeyboardEquivalent.scss";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	ClassicyAlert,
	type ClassicyAlertButton,
} from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useFocusTrap } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import {
	type ClassicyKeyboardEquivalentProblem,
	type ClassicyKeyboardEquivalentRuleOptions,
	checkKeyboardEquivalent,
	spellKeyboardEquivalent,
} from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";
import { keyboardShortcutFromEvent } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const MODIFIER_KEYS = new Set(["Meta", "Control", "Shift", "Alt", "OS"]);

export type ClassicyKeyboardEquivalentDialogProps =
	ClassicyKeyboardEquivalentRuleOptions & {
		/** Window id (unique per open dialog). Defaults to "keyboardEquivalentDialog". */
		id?: string;
		/**
		 * Owning app id — pass your app's so the dialog opens as one of its
		 * windows. Defaults to "ClassicyKeyboardEquivalentDialog".
		 */
		appId?: string;
		/** Title-bar text. Defaults to `""` (an untitled title bar). */
		title?: string;
		/** Bold instruction above the feedback field. Defaults to the HIG wording. */
		prompt?: ReactNode;
		/** What the equivalent does, shown under the field (HIG Figure 6-9). */
		description?: ReactNode;
		/** Equivalent shown when the dialog opens; typing replaces it. */
		initialValue?: string;
		/** Label of the confirming (default) button. Defaults to "OK". */
		confirmLabel?: string;
		/** Label of the cancel button. Defaults to "Cancel". */
		cancelLabel?: string;
		/** Adds a Help button to the invalid-combination alert. */
		onHelp?: () => void;
		/** Called with the new equivalent, in display form ("⌃⌘S"). */
		onConfirm: (shortcut: string) => void;
		/** Called by Cancel, Escape or ⌘-period. The caller closes the dialog. */
		onCancel?: () => void;
		/** Extra class names, merged onto the dialog window after the component's own. */
		className?: string;
		/** Inline style, merged onto the dialog window after the component's own. */
		style?: CSSProperties;
	};

/**
 * The movable modal dialog for defining a keyboard equivalent (HIGOS8 Ch.6
 * "Keyboard Equivalent Support", pp.120–122, Figures 6-9 to 6-11).
 *
 * While it is open every key combination is captured instead of acting: as
 * soon as one is typed the feedback field shows it. A combination with
 * neither a command key nor a function key, or one another item already uses,
 * leaves the field unchanged and raises an alert saying why. Return chooses
 * OK and Escape (or ⌘-period) Cancel, as in any dialog, so those cannot be
 * recorded bare.
 *
 * Captured keys are kept from the app's own menu shortcuts. A browser may
 * still act on a few combinations before the page sees them (⌘W, ⌘Q, ⌘T and
 * ⌘N close or open tabs and windows), so those can never be recorded.
 */
export const ClassicyKeyboardEquivalentDialog: FunctionalComponent<
	ClassicyKeyboardEquivalentDialogProps
> = ({
	id = "keyboardEquivalentDialog",
	appId = "ClassicyKeyboardEquivalentDialog",
	title = "",
	prompt = "Press any combination of keys to define the keyboard equivalent:",
	description,
	initialValue = "",
	confirmLabel = "OK",
	cancelLabel = "Cancel",
	inUse,
	requireCommandKey,
	current,
	validate,
	onHelp,
	onConfirm,
	onCancel,
	className,
	style,
}) => {
	const contentRef = useRef<HTMLDivElement | null>(null);
	const [value, setValue] = useState(initialValue);
	const [problem, setProblem] =
		useState<ClassicyKeyboardEquivalentProblem | null>(null);

	const confirm = useCallback(() => {
		if (value) onConfirm(value);
	}, [value, onConfirm]);
	const cancel = useCallback(() => onCancel?.(), [onCancel]);

	// Focus the dialog body, not a button: every key is captured here, so a
	// focus ring on Cancel would promise a Space press it never gets.
	useFocusTrap({
		ref: contentRef,
		autoFocus: true,
		initialFocusRef: contentRef,
	});

	// Capture phase on window, ahead of the menu-shortcut dispatcher and the
	// dialog keyboard hooks (both skip a defaultPrevented event), so a typed
	// combination defines the equivalent rather than running a command.
	useEffect(() => {
		if (problem) return; // the alert owns the keyboard until dismissed
		const onKeyDown = (e: KeyboardEvent) => {
			const bare = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
			if (MODIFIER_KEYS.has(e.key)) return; // still assembling the chord
			if (bare && e.key === "Tab") return; // move between Cancel and OK
			e.preventDefault();
			e.stopPropagation();
			if (bare && (e.key === "Enter" || e.key === "Return")) {
				confirm();
				return;
			}
			if (
				(bare && e.key === "Escape") ||
				((e.metaKey || e.ctrlKey) && e.key === ".")
			) {
				cancel();
				return;
			}
			const shortcut = keyboardShortcutFromEvent(e);
			if (!shortcut) return;
			const refused = checkKeyboardEquivalent(shortcut, {
				inUse,
				requireCommandKey,
				current: current ?? initialValue,
				validate,
			});
			if (refused) setProblem(refused);
			else setValue(shortcut);
		};
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [
		problem,
		confirm,
		cancel,
		inUse,
		requireCommandKey,
		current,
		initialValue,
		validate,
	]);

	const alertButtons: ClassicyAlertButton[] = [
		{ id: "ok", label: "OK", role: "default" },
		...(onHelp
			? [{ id: "help", label: "Help", role: "help" as const, onClick: onHelp }]
			: []),
	];

	return (
		<>
			<ClassicyWindow
				id={id}
				className={className}
				style={style}
				appId={appId}
				title={title}
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
			>
				<div
					ref={contentRef}
					className="classicyKeyboardEquivalentDialog"
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
					aria-label={title || undefined}
				>
					<p className="classicyKeyboardEquivalentPrompt">{prompt}</p>
					<output
						className="classicyKeyboardEquivalentDisplay"
						aria-live="polite"
						aria-label="Keyboard equivalent"
					>
						{spellKeyboardEquivalent(value) || " "}
					</output>
					{description != null && description !== "" && (
						<p className="classicyKeyboardEquivalentDescription">
							{description}
						</p>
					)}
					<div className="classicyKeyboardEquivalentButtons">
						<ClassicyButton onClickFunc={cancel}>{cancelLabel}</ClassicyButton>
						<ClassicyButton
							isDefault={true}
							disabled={!value}
							onClickFunc={confirm}
						>
							{confirmLabel}
						</ClassicyButton>
					</div>
				</div>
			</ClassicyWindow>
			{problem && (
				<ClassicyAlert
					id={`${id}-alert`}
					appId={appId}
					alertType="note"
					movable={true}
					label={problem.label}
					message={problem.message}
					buttons={alertButtons}
					onClose={() => setProblem(null)}
				/>
			)}
		</>
	);
};
