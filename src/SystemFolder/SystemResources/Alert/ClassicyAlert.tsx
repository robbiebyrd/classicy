import "./ClassicyAlert.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * Mac OS 8 HIG Alert Box (Human Interface Guidelines, Ch. 3 §"Alert Boxes").
 *
 * A special modal dialog that conveys a warning/error with a severity icon,
 * a two-tier text block (bold label + plain narrative), and up to four
 * buttons. Alerts contain ONLY an icon, text, and buttons — no other controls.
 *
 * Three severities, each with its own system icon (from `ClassicyIcons`):
 *   - note    — info icon; typically OK only (+ optional Help)
 *   - caution — warn icon; OK/Continue + Cancel (+ optional Help)
 *   - stop    — error icon; OK only (+ optional Help)
 *
 * Movable alert     = red title-bar highlight (draggable).
 * Non-movable alert = red border around the content region (`.classicyWindowRed`).
 */

export type ClassicyAlertType = "note" | "caution" | "stop";

/** How a button participates in the alert's keyboard/layout semantics. */
export type ClassicyAlertButtonRole = "default" | "cancel" | "help" | "normal";

export type ClassicyAlertButton = {
	/** Stable id, used to resolve the default button. */
	id: string;
	/** Button text — HIG asks for a specific verb (e.g. "Delete", not "OK"). */
	label: string;
	/**
	 * default → Return/Enter triggers it and it gets the default ring.
	 * cancel  → Escape / Command-period triggers it; laid out left of default.
	 * help    → pushed to the far left (a "?" affordance).
	 * normal  → an ordinary optional button.
	 */
	role?: ClassicyAlertButtonRole;
	disabled?: boolean;
	onClick?: () => void;
};

export type ClassicyAlertProps = {
	/** Window id (unique per open alert). */
	id?: string;
	/** Owning app id. */
	appId?: string;
	/** Severity — selects the icon and default button semantics. */
	alertType?: ClassicyAlertType;
	/** Title-bar text (shown on the movable variant). */
	title?: string;
	/** Bold system-font heading (tier 1). */
	label: string;
	/** Plain small-system-font narrative (tier 2). */
	message?: ReactNode;
	/**
	 * Up to four buttons. When omitted, a sensible default set is generated
	 * from `alertType` (note/stop → OK; caution → Cancel + Continue).
	 */
	buttons?: ClassicyAlertButton[];
	/**
	 * Overrides which button is the default (its `id`). HIG: a caution alert's
	 * default is OK/Continue UNLESS the action risks data loss, in which case
	 * the safe choice (Cancel) should be the default — set this to the Cancel id.
	 */
	defaultButtonId?: string;
	/**
	 * Movable alert (draggable, red title-bar highlight) when true; otherwise a
	 * non-movable alert with a red content-region border. Defaults to false.
	 */
	movable?: boolean;
	/** Called after any button is clicked (in addition to that button's onClick). */
	onClose?: () => void;
};

const AlertIcon: FunctionalComponent<{ alertType: ClassicyAlertType }> = ({
	alertType,
}) => {
	switch (alertType) {
		case "caution":
			// Classic caution triangle (system warn icon).
			return <img src={ClassicyIcons.system.warn} alt="Caution" />;
		case "stop":
			// Classic stop octagon (system error icon).
			return <img src={ClassicyIcons.system.error} alt="Error" />;
		default:
			// Classic note bubble (system info icon).
			return <img src={ClassicyIcons.system.info} alt="Info" />;
	}
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
}) => {
	const player = useSoundDispatch();
	const contentRef = useRef<HTMLDivElement | null>(null);

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

	const cancelButton = useMemo(
		() => resolvedButtons.find((b) => b.role === "cancel"),
		[resolvedButtons],
	);

	const handleButton = useCallback(
		(button: ClassicyAlertButton) => {
			if (button.disabled) return;
			button.onClick?.();
			onClose?.();
		},
		[onClose],
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

	// Keep Tab focus inside the alert and focus the default button on open.
	useFocusTrap({ ref: contentRef, autoFocus: true });

	// The non-movable variant is an error-typed window, so ClassicyWindow already
	// plays the alert sound. The movable variant is a plain modal, so play here.
	useEffect(() => {
		if (movable) {
			player({ type: "ClassicySoundPlayError" });
		}
	}, [movable, player]);

	return (
		<ClassicyWindow
			id={id}
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
		>
			<div
				ref={contentRef}
				className={classNames(
					"classicyAlert",
					movable ? "classicyAlertMovable" : "classicyAlertFixed",
				)}
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
				<div className={"classicyAlertButtons"}>
					{resolvedButtons.map((button) => (
						<ClassicyButton
							key={button.id}
							isDefault={button.id === defaultButton?.id}
							disabled={button.disabled}
							onClickFunc={() => handleButton(button)}
							className={classNames(
								button.role === "help" ? "classicyAlertHelpButton" : "",
							)}
						>
							{button.role === "help" ? button.label || "?" : button.label}
						</ClassicyButton>
					))}
				</div>
			</div>
		</ClassicyWindow>
	);
};
