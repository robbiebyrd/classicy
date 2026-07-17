import { type RefObject, useEffect } from "react";

/**
 * HIG keyboard-equivalent engine (Mac OS 8 HIG, Ch. 3 "Keyboard Navigation and
 * Focus" / Ch. 2 "Default Buttons").
 *
 * Wires the two dialog-wide keyboard equivalents the HIG requires:
 *   - Return / Enter  -> the default action (the dialog's default button)
 *   - Escape / Cmd-.  -> the Cancel action
 *
 * The default action deliberately does NOT fire when focus is on another button
 * or inside a multi-line text area, so those elements keep their own behavior
 * (activating the focused button, inserting a newline). Any handler that calls
 * `preventDefault()` upstream also suppresses it.
 *
 * Scope defaults to the whole document; pass `targetRef` to bind within a single
 * dialog so nested/stacked dialogs don't cross-fire.
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
	useEffect(() => {
		if (!enabled) return;
		const node: HTMLElement | Document = targetRef?.current ?? document;

		const handler = (event: Event) => {
			const e = event as KeyboardEvent;
			if (e.defaultPrevented) return;

			// Cancel: Escape, or Command/Ctrl + "."
			if (
				onCancel &&
				(e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "."))
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
	}, [enabled, onDefault, onCancel, targetRef]);
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
};

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const useFocusTrap = ({
	ref,
	enabled = true,
	autoFocus = true,
}: UseFocusTrapOptions): void => {
	useEffect(() => {
		if (!enabled) return;
		const container = ref.current;
		if (!container) return;

		const focusable = () =>
			Array.from(
				container.querySelectorAll<HTMLElement>(FOCUSABLE),
			).filter((el) => el.offsetParent !== null || el === document.activeElement);

		if (autoFocus) {
			const first = focusable()[0];
			(first ?? container).focus?.();
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
	}, [ref, enabled, autoFocus]);
};
