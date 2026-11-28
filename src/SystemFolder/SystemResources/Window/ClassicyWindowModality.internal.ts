import { createContext, type RefObject, useEffect, useRef } from "react";
import {
	getClassicyWindowEntries,
	subscribeClassicyWindowEntries,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

/**
 * Who owns a modal dialog, for `layout.dialog.modality` `"application"`
 * (WIG Ch.10 "Message Notification", p.212; "Modeless Interaction", p.214;
 * Ch.8 "Modeless vs. Modal", p.147). Provided around a modal by the desktop
 * and the Windows shell, never by a host:
 *
 * - `"system"`: a system-modal dialog (MB_SYSTEMMODAL: `Desktop.errorDialog`,
 *   the desktop's Empty Trash and Reset PRAM, the shell's Shut Down and Log
 *   Off), which keeps the desktop-wide scrim above the taskbar.
 * - `"taskbar"`: a dialog the taskbar owns (Windows 98's Run, explorer.exe's
 *   own window), which draws no scrim and disables no app's windows.
 *
 * Absent (every other modal), a modal is its own app's: application modal
 * under `"application"`. Read only under that layout key; under `"desktop"`
 * (absent, every package but Windows 98) every modal draws its scrim, as
 * before.
 */
export type ClassicyWindowModalOwner = "system" | "taskbar";

export const ClassicyWindowModalOwnerContext = createContext<
	ClassicyWindowModalOwner | undefined
>(undefined);

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** The DOM id a window's root carries (`ClassicyWindow`'s `[appId, id].join("_")`). */
const windowDomId = (appId: string, windowId: string) =>
	[appId, windowId].join("_");

// How many application modals hold each element inert, so the last one to
// close is the one that clears it (two stacked dialogs of one app).
const inertHolds = new WeakMap<HTMLElement, number>();

const holdInert = (el: HTMLElement) => {
	const holds = inertHolds.get(el) ?? 0;
	if (holds === 0) el.setAttribute("inert", "");
	inertHolds.set(el, holds + 1);
};

const releaseInert = (el: HTMLElement) => {
	const holds = inertHolds.get(el) ?? 0;
	if (holds <= 1) {
		inertHolds.delete(el);
		el.removeAttribute("inert");
		return;
	}
	inertHolds.set(el, holds - 1);
};

/** The owner app's modeless windows, as drawn now (the modal and the app's other modals left out). */
export const classicyApplicationModalOwnerWindows = (
	appId: string,
	windowId: string,
): HTMLElement[] =>
	getClassicyWindowEntries()
		.filter(
			(entry) =>
				entry.appId === appId && entry.windowId !== windowId && !entry.modal,
		)
		.map((entry) =>
			document.getElementById(windowDomId(entry.appId, entry.windowId)),
		)
		.filter((el): el is HTMLElement => el instanceof HTMLElement);

const zIndexOf = (el: Element): number => {
	const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
	return Number.isFinite(z) ? z : 0;
};

const containsPoint = (el: HTMLElement, x: number, y: number): boolean => {
	const r = el.getBoundingClientRect();
	return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
};

/**
 * Whether a press lands on one of the owner's disabled windows. An inert
 * element takes no press, so a browser delivers it to whatever lies under
 * the window (the desktop, an icon, a window drawn beneath it); the press
 * counts when it lies inside an owner window and its target is inside that
 * window (a browser without `inert`), the desktop itself, a desktop icon,
 * or a window stacked below it. A press on a window stacked above, the
 * taskbar, a menu or the dialog itself is not one.
 */
export const classicyApplicationModalBlocks = (
	owners: readonly HTMLElement[],
	target: EventTarget | null,
	x: number,
	y: number,
): boolean => {
	if (!(target instanceof Element)) return false;
	for (const owner of owners) {
		if (owner.contains(target)) return true;
	}
	const hit = owners.filter((owner) => containsPoint(owner, x, y));
	if (hit.length === 0) return false;
	if (target.id === "classicyDesktop") return true;
	if (target.closest(".classicyDesktopIcon")) return true;
	const under = target.closest(".classicyWindow");
	if (!under) return false;
	const top = Math.max(...hit.map(zIndexOf));
	return zIndexOf(under) < top;
};

/**
 * An application-modal dialog's hold on its app (`layout.dialog.modality`
 * `"application"`): while `enabled`, the app's other modeless windows are
 * `inert` (windows that open meanwhile too, through the window registry),
 * and a press over one, caught in the capture phase before anything else
 * sees it, is swallowed and handed to `onBlockedPress` (the window beeps and
 * activates the dialog, as a disabled owner window does in Windows), and the
 * focus goes back to the dialog's control focused last (else its first). Other
 * apps, the desktop and the taskbar are left alone.
 */
export const useClassicyApplicationModal = ({
	enabled,
	appId,
	windowId,
	modalRef,
	onBlockedPress,
}: {
	enabled: boolean;
	appId: string;
	windowId: string;
	modalRef: RefObject<HTMLElement | null>;
	onBlockedPress: () => void;
}): void => {
	const onBlockedPressRef = useRef(onBlockedPress);
	onBlockedPressRef.current = onBlockedPress;
	useEffect(() => {
		if (!enabled || typeof document === "undefined") return;
		const held = new Set<HTMLElement>();
		const apply = () => {
			const now = new Set(
				classicyApplicationModalOwnerWindows(appId, windowId),
			);
			for (const el of held) {
				if (!now.has(el)) {
					releaseInert(el);
					held.delete(el);
				}
			}
			for (const el of now) {
				if (!held.has(el)) {
					holdInert(el);
					held.add(el);
				}
			}
		};
		apply();
		const unsubscribe = subscribeClassicyWindowEntries(apply);
		// The control last focused in the dialog, which a blocked press gives
		// the focus back to (Windows reactivates the dialog with its focus).
		let lastFocus: HTMLElement | null = null;
		const onFocusIn = (event: FocusEvent) => {
			const modal = modalRef.current;
			if (
				modal &&
				event.target instanceof HTMLElement &&
				modal.contains(event.target)
			)
				lastFocus = event.target;
		};
		const refocus = () => {
			const modal = modalRef.current;
			if (!modal || modal.contains(document.activeElement)) return;
			if (lastFocus?.isConnected && modal.contains(lastFocus)) {
				lastFocus.focus();
				return;
			}
			const contents =
				modal.querySelector<HTMLElement>(".classicyWindowContentsInner") ??
				modal;
			contents.querySelector<HTMLElement>(FOCUSABLE)?.focus();
		};
		const onPress = (event: MouseEvent) => {
			const modal = modalRef.current;
			if (modal && event.target instanceof Node && modal.contains(event.target))
				return;
			if (
				!classicyApplicationModalBlocks(
					[...held],
					event.target,
					event.clientX,
					event.clientY,
				)
			)
				return;
			event.preventDefault();
			event.stopPropagation();
			onBlockedPressRef.current();
			refocus();
		};
		document.addEventListener("focusin", onFocusIn, true);
		document.addEventListener("mousedown", onPress, true);
		return () => {
			document.removeEventListener("focusin", onFocusIn, true);
			document.removeEventListener("mousedown", onPress, true);
			unsubscribe();
			for (const el of held) releaseInert(el);
			held.clear();
		};
	}, [enabled, appId, windowId, modalRef]);
};
