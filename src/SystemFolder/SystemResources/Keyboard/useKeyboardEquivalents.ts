import { type RefObject, useEffect, useRef } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyCommandKeyHeld } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

/**
 * HIG keyboard-equivalent engine (Mac OS 8 HIG, Ch. 3 "Keyboard Navigation and
 * Focus" / Ch. 2 "Default Buttons").
 *
 * Wires the two dialog-wide keyboard equivalents the HIG requires:
 *   - Return / Enter  -> the default action (the dialog's default button)
 *   - Escape / Cmd-.  -> the Cancel action (Cmd is Command or Control; Control
 *     alone under the package's `layout.keyboard.command` "ctrl", Windows 98)
 *
 * The default action deliberately does NOT fire when focus is on another button
 * or inside a multi-line text area, so those elements keep their own behavior
 * (activating the focused button, inserting a newline). Any handler that calls
 * `preventDefault()` upstream also suppresses it.
 *
 * Scope defaults to the whole document; pass `targetRef` to bind within a single
 * dialog so nested/stacked dialogs don't cross-fire.
 *
 * Under the package's `layout.dialog.flushInput` (Windows 98: WIG Ch.10
 * "Message Notification", p.212) the dialog takes no key pressed before it
 * showed: every auto-repeated keydown is ignored, and so is every keydown
 * that came before the hook mounted, until the dialog is armed by a key
 * coming up or a new key going down after it mounted. So a Return held from
 * the command that raised an alert never dismisses it. Absent, any keydown
 * counts, as it always has.
 */
export type UseKeyboardEquivalentsOptions = {
	/** Fired on Return / Enter (the default button's action). */
	onDefault?: () => void;
	/** Fired on Escape or Command-period (the Cancel action). */
	onCancel?: () => void;
	/** When false the listener is not attached. Defaults to true. */
	enabled?: boolean;
	/** Element to scope the listener to. Defaults to `document`. */
	targetRef?: RefObject<HTMLElement | null>;
};

const isTextEntry = (el: EventTarget | null): boolean => {
	if (!(el instanceof HTMLElement)) return false;
	const tag = el.tagName;
	return tag === "TEXTAREA" || el.isContentEditable;
};

const isActivatable = (el: EventTarget | null): boolean => {
	if (!(el instanceof HTMLElement)) return false;
	return (
		el.tagName === "BUTTON" ||
		el.getAttribute("role") === "button" ||
		el.tagName === "A"
	);
};

export const useKeyboardEquivalents = ({
	onDefault,
	onCancel,
	enabled = true,
	targetRef,
}: UseKeyboardEquivalentsOptions): void => {
	const flushInput = useClassicyAppearanceLayout().dialog?.flushInput === true;
	// When the dialog mounted, on the events' own clock (a fresh event's
	// `timeStamp`), and whether a key has come up or gone down anew since:
	// `layout.dialog.flushInput`'s arming.
	const mountedAtRef = useRef<number | null>(null);
	const armedRef = useRef(false);
	useEffect(() => {
		mountedAtRef.current = new Event("classicy-dialog-mount").timeStamp;
		armedRef.current = false;
		return () => {
			mountedAtRef.current = null;
		};
	}, []);
	useEffect(() => {
		if (!flushInput) return;
		// A key coming up anywhere arms the dialog: whatever goes down next is
		// a new press.
		const arm = () => {
			armedRef.current = true;
		};
		document.addEventListener("keyup", arm, true);
		return () => document.removeEventListener("keyup", arm, true);
	}, [flushInput]);

	useEffect(() => {
		if (!enabled) return;
		const node: HTMLElement | Document = targetRef?.current ?? document;

		const handler = (event: Event) => {
			const e = event as KeyboardEvent;
			if (e.defaultPrevented) return;
			if (flushInput) {
				// Held keys repeat; a key that went down before the dialog
				// showed belongs to the command that raised it.
				if (e.repeat) return;
				if (!armedRef.current) {
					const mountedAt = mountedAtRef.current;
					if (mountedAt !== null && e.timeStamp < mountedAt) return;
					armedRef.current = true;
				}
			}

			// Cancel: Escape, or Command/Ctrl + "." (Ctrl alone under the
			// package's `layout.keyboard.command` "ctrl": Win+period cancels
			// nothing, `classicyCommandKeyHeld`).
			if (
				onCancel &&
				(e.key === "Escape" || (classicyCommandKeyHeld(e) && e.key === "."))
			) {
				e.preventDefault();
				onCancel();
				return;
			}

			// Default action: Return / Enter, unless a text area or another
			// activatable element should handle it.
			if (
				onDefault &&
				(e.key === "Enter" || e.key === "Return") &&
				!e.metaKey &&
				!e.ctrlKey &&
				!isTextEntry(e.target) &&
				!isActivatable(e.target)
			) {
				e.preventDefault();
				onDefault();
			}
		};

		node.addEventListener("keydown", handler);
		return () => node.removeEventListener("keydown", handler);
	}, [enabled, onDefault, onCancel, targetRef, flushInput]);
};

/**
 * Trap Tab focus within a container (for modal dialogs). Tab cycles forward
 * through focusable descendants, Shift-Tab backward, wrapping at the ends so
 * focus never leaves the dialog. Optionally focuses the first field on mount.
 */
export type UseFocusTrapOptions = {
	ref: RefObject<HTMLElement | null>;
	enabled?: boolean;
	/** Focus the first focusable element (or the container) on activation. */
	autoFocus?: boolean;
	/**
	 * Element to focus on activation instead of the first focusable one. Use it
	 * to give initial focus to a dialog's default button (HIG Ch.3 "Keyboard
	 * Navigation and Focus"): the default button should be focused so Return
	 * activates it and focus coincides with the default ring. Falls back to the
	 * first focusable element when the ref is empty.
	 */
	initialFocusRef?: RefObject<HTMLElement | null>;
};

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const useFocusTrap = ({
	ref,
	enabled = true,
	autoFocus = true,
	initialFocusRef,
}: UseFocusTrapOptions): void => {
	useEffect(() => {
		if (!enabled) return;
		const container = ref.current;
		if (!container) return;

		const focusable = () =>
			Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
				(el) => el.offsetParent !== null || el === document.activeElement,
			);

		if (autoFocus) {
			const preferred = initialFocusRef?.current;
			(preferred ?? focusable()[0] ?? container).focus?.();
		}

		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const items = focusable();
			if (items.length === 0) return;
			const first = items[0];
			const last = items[items.length - 1];
			const active = document.activeElement as HTMLElement | null;
			if (e.shiftKey && (active === first || !container.contains(active))) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};

		container.addEventListener("keydown", handler);
		return () => container.removeEventListener("keydown", handler);
	}, [ref, enabled, autoFocus, initialFocusRef]);
};
