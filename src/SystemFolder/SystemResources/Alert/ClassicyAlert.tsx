import "./ClassicyAlert.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyHelpButton } from "@/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyWindowAlertTypeContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowAlertType.internal";
import { ClassicyWindowSelfPadding } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding";

/**
 * Alert severity: `note` (information), `caution` (an action with consequences
 * the user should confirm), or `stop` (a problem that prevents an action).
 */
export type ClassicyAlertType = "note" | "caution" | "stop";

/** How a button participates in the alert's keyboard/layout semantics. */
export type ClassicyAlertButtonRole = "default" | "cancel" | "help" | "normal";

/** One button in a `ClassicyAlert`'s button row. */
export type ClassicyAlertButton = {
	/** Stable id, used as the React key and to resolve the default button. */
	id: string;
	/** Button text — HIG asks for a specific verb (e.g. "Delete", not "OK"). */
	label: string;
	/**
	 * default → Return/Enter triggers it and it gets the default ring.
	 * cancel  → Escape / Command-period triggers it; laid out left of default.
	 * help    → a ClassicyHelpButton pushed to the far left; `label` becomes
	 *           its accessible name ("Help" when it is empty or "?").
	 * normal  → an ordinary optional button.
	 */
	role?: ClassicyAlertButtonRole;
	/** Dims the button; a disabled button ignores clicks and keyboard equivalents. */
	disabled?: boolean;
	/** Called when the button is activated, before the alert's `onClose`. */
	onClick?: () => void;
	/**
	 * The button's access key (`ClassicyButton`'s `accessKey`), read only
	 * under a package's `layout.menu.accessKeys`. Omitted, a message box's
	 * own buttons take Windows' (user.exe's "&Yes", "&No", "&Retry",
	 * "&Abort", "&Ignore"; WIG Appendix B Table B.5), OK and Cancel none
	 * (Return and Escape reach them), and any other the package's automatic
	 * pick; `""` gives it none.
	 */
	accessKey?: string;
};

export type ClassicyAlertProps = {
	/** Window id; must be unique per open alert. Defaults to `"alert"`. */
	id?: string;
	/** Id of the owning app (the enclosing `ClassicyApp`). Defaults to `"ClassicyAlert"`. */
	appId?: string;
	/** Severity — selects the icon and the generated default buttons. Defaults to `"note"`. */
	alertType?: ClassicyAlertType;
	/** Title-bar text, shown on the movable variant. Defaults to `""`. */
	title?: string;
	/** Bold system-font heading (tier 1); also the dialog's accessible name. */
	label: string;
	/** Plain small-system-font narrative (tier 2). Omitted when empty. */
	message?: ReactNode;
	/**
	 * Up to four buttons (extras are dropped), laid out left to right in array
	 * order. When omitted or empty, a default set is generated from `alertType`:
	 * note/stop → OK; caution → Cancel + Continue.
	 */
	buttons?: ClassicyAlertButton[];
	/**
	 * Overrides which button is the default (its `id`). HIG: a caution alert's
	 * default is OK/Continue UNLESS the action risks data loss, in which case
	 * the safe choice (Cancel) should be the default — set this to the Cancel id.
	 * Without it, the button with role `default` wins, else the last button
	 * that is neither `cancel` nor `help`.
	 */
	defaultButtonId?: string;
	/**
	 * Movable alert (draggable, red title-bar highlight) when true; otherwise a
	 * non-movable alert with a red content-region border. Defaults to `false`.
	 */
	movable?: boolean;
	/**
	 * Called after any enabled button is activated (in addition to that
	 * button's `onClick`). The alert does not unmount itself — stop rendering
	 * it here.
	 */
	onClose?: () => void;
	/** Extra class names, merged onto the dialog window after the component's own. */
	className?: string;
	/** Inline style, merged onto the dialog window after the component's own. */
	style?: CSSProperties;
};

const AlertIcon: FunctionalComponent<{ alertType: ClassicyAlertType }> = ({
	alertType,
}) => {
	const warn = useClassicyAsset("icons", "system.warn") ?? "";
	const error = useClassicyAsset("icons", "system.error") ?? "";
	const info = useClassicyAsset("icons", "system.info") ?? "";
	switch (alertType) {
		case "caution":
			// Classic caution triangle (system warn icon).
			return <img src={warn} alt="Caution" />;
		case "stop":
			// Classic stop octagon (system error icon).
			return <img src={error} alt="Error" />;
		default:
			// Classic note bubble (system info icon).
			return <img src={info} alt="Info" />;
	}
};

/**
 * An alert button's `data-classicy-role`: the default button, the cancel
 * button, or any other (the help button included).
 */
const alertButtonRole = (
	button: ClassicyAlertButton,
	defaultId: string | undefined,
): "default" | "cancel" | "other" => {
	if (button.id === defaultId) return "default";
	if (button.role === "cancel") return "cancel";
	return "other";
};

// A message box's own buttons and the access keys Windows 98 gives them
// (user.exe's button strings, read from the Windows 98 SE CD: "OK",
// "Cancel", "&Abort", "&Retry", "&Ignore", "&Yes", "&No"), in the case
// they are drawn in, so each lands on its first letter.
const MESSAGE_BOX_ACCESS_KEYS: Readonly<Record<string, string>> = {
	yes: "Y",
	no: "N",
	retry: "R",
	abort: "A",
	ignore: "I",
};

/** A button's access key: its own, else a message box button's (through `ak`, the bundled keys' gate). */
const alertButtonAccessKey = (
	button: ClassicyAlertButton,
	ak: (key: string) => string | undefined,
): string | undefined => {
	if (button.accessKey !== undefined) return button.accessKey;
	const label = button.label.trim().toLowerCase();
	return Object.hasOwn(MESSAGE_BOX_ACCESS_KEYS, label)
		? ak(MESSAGE_BOX_ACCESS_KEYS[label])
		: undefined;
};

const defaultButtonsForType = (
	alertType: ClassicyAlertType,
): ClassicyAlertButton[] => {
	if (alertType === "caution") {
		return [
			{ id: "cancel", label: "Cancel", role: "cancel" },
			{ id: "ok", label: "Continue", role: "default" },
		];
	}
	// note & stop → single OK button by default
	return [{ id: "ok", label: "OK", role: "default" }];
};

/**
 * Mac OS 8 alert box (HIGOS8 Ch.3 "Alert Boxes", p.60): a modal window holding
 * only a severity icon, a two-tier text block (bold `label` + plain `message`)
 * and up to four buttons — no other controls. Use it in place of
 * `window.alert()` or a modal `<dialog>`; for a prompt that needs a text
 * field use `ClassicyInputDialog`, and for other app-specific modals use
 * `ClassicyWindow modal`.
 *
 * - **Severity** (`alertType`): `note` (info icon, OK), `caution` (warning
 *   triangle, Cancel + Continue) or `stop` (stop icon, OK).
 * - **Variants**: the default non-movable alert has a red border around its
 *   content; `movable` gives a draggable window with a red title bar
 *   (HIGOS8 p.57). Either way it plays the system alert sound on open.
 * - **Keyboard**: the default button is focused on open and Tab is trapped
 *   inside; Return/Enter fires the default button and Escape or Command-period
 *   fires the `cancel`-role button (if any).
 * - **Help**: a `help`-role button renders as `ClassicyHelpButton`, placed
 *   lower left (HIGOS8 p.86).
 *
 * It renders a `ClassicyWindow`, so it must sit inside a `ClassicyApp`. Show it
 * by mounting it and hide it by unmounting it from `onClose`:
 *
 * ```tsx
 * {confirming && (
 *   <ClassicyAlert
 *     id="empty-trash" appId={appId} alertType="caution"
 *     label="Are you sure you want to empty the Trash?"
 *     buttons={[
 *       { id: "cancel", label: "Cancel", role: "cancel" },
 *       { id: "ok", label: "Empty Trash", role: "default", onClick: emptyTrash },
 *     ]}
 *     onClose={() => setConfirming(false)}
 *   />
 * )}
 * ```
 */
export const ClassicyAlert: FunctionalComponent<ClassicyAlertProps> = ({
	id = "alert",
	appId = "ClassicyAlert",
	alertType = "note",
	title = "",
	label,
	message,
	buttons,
	defaultButtonId,
	movable = false,
	onClose,
	className,
	style,
}) => {
	const player = useSoundDispatch();
	// A message box's buttons' access keys, under a package that has them.
	const ak = useClassicyBundledAccessKeys();
	const contentRef = useRef<HTMLDivElement | null>(null);
	const defaultButtonRef = useRef<HTMLButtonElement | null>(null);
	const appearance = useClassicyAppearance("Alert", {}, contentRef);
	const { emit } = appearance;

	// An alert is open for as long as it is mounted: once per mount, even if
	// the sound dispatch (and so `emit`) changes identity.
	// biome-ignore lint/correctness/useExhaustiveDependencies: emitted once per mount
	useEffect(() => {
		emit("open");
	}, []);

	const resolvedButtons = useMemo(
		() =>
			(buttons && buttons.length > 0
				? buttons
				: defaultButtonsForType(alertType)
			).slice(0, 4),
		[buttons, alertType],
	);

	// Resolve which button is the default (Return/Enter target).
	const defaultButton = useMemo(() => {
		if (defaultButtonId) {
			const forced = resolvedButtons.find((b) => b.id === defaultButtonId);
			if (forced) return forced;
		}
		const roled = resolvedButtons.find((b) => b.role === "default");
		if (roled) return roled;
		// Fallback: the last non-cancel / non-help button.
		const fallback = [...resolvedButtons]
			.reverse()
			.find((b) => b.role !== "cancel" && b.role !== "help");
		return fallback ?? resolvedButtons[resolvedButtons.length - 1];
	}, [resolvedButtons, defaultButtonId]);

	// What the button row holds, as classes on it, so a package can arrange a
	// help button beside the others with plain class selectors (System 7
	// pins it before Don't Save; `:has()` would leave out Firefox 113-120).
	const hasHelpButton = resolvedButtons.some((b) => b.role === "help");
	const hasOtherButton = resolvedButtons.some(
		(b) =>
			b.role !== "help" && alertButtonRole(b, defaultButton?.id) === "other",
	);

	const cancelButton = useMemo(
		() => resolvedButtons.find((b) => b.role === "cancel"),
		[resolvedButtons],
	);

	const handleButton = useCallback(
		(button: ClassicyAlertButton) => {
			if (button.disabled) return;
			// A click (or Return/Space on the focused button), or Return,
			// Escape or Command-period through the keyboard equivalents.
			emit("close", withClassicyAppearanceInput({ buttonId: button.id }));
			button.onClick?.();
			onClose?.();
		},
		[onClose, emit],
	);

	const onDefault = useCallback(() => {
		if (defaultButton) handleButton(defaultButton);
	}, [defaultButton, handleButton]);

	const onCancel = useCallback(() => {
		if (cancelButton) handleButton(cancelButton);
	}, [cancelButton, handleButton]);

	// Return → default button, Escape / Command-period → Cancel, scoped to the
	// alert so stacked dialogs don't cross-fire.
	useKeyboardEquivalents({
		onDefault,
		onCancel: cancelButton ? onCancel : undefined,
		targetRef: contentRef,
	});

	// Keep Tab focus inside the alert and focus the DEFAULT button on open (HIG
	// Ch.3 "Keyboard Navigation and Focus"): focus must coincide with the default
	// ring, otherwise Return activates whichever button happens to be first in the
	// DOM (e.g. Cancel in a caution alert) rather than the default.
	useFocusTrap({
		ref: contentRef,
		autoFocus: true,
		initialFocusRef: defaultButtonRef,
	});

	// The non-movable variant is an error-typed window, so ClassicyWindow already
	// plays the alert sound (with the type this alert provides it below). The
	// movable variant is a plain modal, so play here. Both carry the alert's
	// type, which a sound pack may give its own sound (`alertTypeSounds`: an
	// icon's event, as Windows played for a message box); a ref, so changing
	// the type never sounds the alert again.
	const alertTypeRef = useRef(alertType);
	alertTypeRef.current = alertType;
	useEffect(() => {
		if (movable) {
			player({
				type: "ClassicySoundPlayError",
				alertType: alertTypeRef.current,
			});
		}
	}, [movable, player]);

	const alertWindow = (
		<ClassicyWindow
			id={id}
			// The movable alert's red title bar is keyed on its window's class
			// (no `:has(.classicyAlertMovable)`, which Firefox 113-120 lacks).
			className={classNames(movable && "classicyAlertMovableWindow", className)}
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
			// Non-movable → type="error" gives the red border AND blocks dragging.
			// Movable → default type keeps dragging; red title bar comes from SCSS.
			type={movable ? "default" : "error"}
			initialSize={[0, 0]}
			initialPosition={["center", "center"]}
			analyticsExclude
		>
			{/* Pads its own root, so its window is marked self-padded. */}
			<ClassicyWindowSelfPadding rootRef={contentRef}>
				<div
					{...appearance.attrs}
					ref={contentRef}
					className={classNames(
						"classicyAlert",
						appearance.className,
						movable ? "classicyAlertMovable" : "classicyAlertFixed",
					)}
					style={appearance.style}
					role="alertdialog"
					aria-modal="true"
					aria-label={label}
				>
					<div className={"classicyAlertTop"}>
						<div className={"classicyAlertIcon"}>
							<AlertIcon alertType={alertType} />
						</div>
						<div className={"classicyAlertBody"}>
							<p className={"classicyAlertLabel"}>{label}</p>
							{message != null && message !== "" && (
								<div className={"classicyAlertMessage"}>{message}</div>
							)}
						</div>
					</div>
					<div
						className={classNames(
							"classicyAlertButtons",
							hasHelpButton && "classicyAlertButtonsHaveHelp",
							hasOtherButton && "classicyAlertButtonsHaveOther",
						)}
					>
						{resolvedButtons.map((button) =>
							button.role === "help" ? (
								// HIGOS8 p.86: alert boxes place the Help button lower left
								// automatically — the bevel-button glyph, not a text "?".
								<ClassicyHelpButton
									key={button.id}
									label={
										button.label && button.label !== "?" ? button.label : "Help"
									}
									disabled={button.disabled}
									onClickFunc={() => handleButton(button)}
									className="classicyAlertHelpButton"
									{...{ [CLASSICY_PART_ATTRIBUTE.role]: "other" }}
								/>
							) : (
								<ClassicyButton
									key={button.id}
									ref={
										button.id === defaultButton?.id
											? defaultButtonRef
											: undefined
									}
									isDefault={button.id === defaultButton?.id}
									disabled={button.disabled}
									accessKey={alertButtonAccessKey(button, ak)}
									onClickFunc={() => handleButton(button)}
									{...{
										[CLASSICY_PART_ATTRIBUTE.role]: alertButtonRole(
											button,
											defaultButton?.id,
										),
									}}
								>
									{button.label}
								</ClassicyButton>
							),
						)}
					</div>
				</div>
			</ClassicyWindowSelfPadding>
		</ClassicyWindow>
	);

	return (
		<ClassicyWindowAlertTypeContext.Provider value={alertType}>
			{alertWindow}
		</ClassicyWindowAlertTypeContext.Provider>
	);
};
