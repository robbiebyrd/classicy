import "@/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcher.scss";
import {
	type FC as FunctionalComponent,
	type RefObject,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	CLASSICY_PART_ATTRIBUTE,
	CLASSICY_STATE,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLICATION_SWITCHER_TEAR_OFF,
	classicyModalWindowOpen,
} from "@/SystemFolder/Extensions/ApplicationSwitcher/ClassicyApplicationSwitcherContext";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";

/**
 * How far past the Application menu's bottom the pointer goes before the
 * menu tears off: "When the user drags a tear-off menu three pixels away
 * from the menu bar, the menu separates" (HIG7 p.93).
 */
export const CLASSICY_APP_SWITCHER_TEAR_OFF_DISTANCE = 3;

/** The outline a tear-off drags: viewport coordinates, the menu's size. */
export type ClassicyAppSwitcherTearOffOutline = {
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * Where the outline hangs for the pointer at `x`, `y` (viewport), for an
 * open menu of `width` by `height`: centered across the pointer, its bottom
 * edge at the pointer, as Mac OS 8.5 draws it
 * (`platinum-85-tearoff-outline.png`, `…-outline-2.png`).
 */
export const classicyAppSwitcherTearOffOutline = (
	x: number,
	y: number,
	width: number,
	height: number,
): ClassicyAppSwitcherTearOffOutline => ({
	left: Math.round(x - width / 2),
	top: Math.round(y - height),
	width,
	height,
});

const SWITCHER_SELECTOR = `[${CLASSICY_PART_ATTRIBUTE.part}="switcher"]`;

/**
 * The Application menu's tear-off (Mac OS 8.5; HIG7 pp.93-95, "Tear-Off
 * Menus"): with the mouse button held from a press on the Application menu
 * (its title or its open menu), dragging past the menu's bottom shows a
 * dotted outline of the menu that follows the pointer, and letting go
 * there opens the Application Switcher's palette where the outline was,
 * and closes the menu; back over the menu, the outline goes. A press on the
 * closed title pulled down past it opens the menu, as Mac OS opens a menu on
 * the press. Escape or a lost pointer stream ends the drag with nothing
 * torn off, and nothing tears off while a modal window is open. A palette
 * already open moves to the new place: one copy at a time (HIG7 p.93). Off
 * when the active package's
 * `layout.applicationSwitcher.palette` is `"none"`.
 */
export const ClassicyAppSwitcherTearOff: FunctionalComponent<{
	navRef: RefObject<HTMLElement | null>;
}> = ({ navRef }) => {
	const enabled =
		useClassicyAppearanceLayout().applicationSwitcher?.palette !== "none";
	const dispatch = useAppManagerDispatch();
	const { closeAll } = useContext(ClassicyMenuContext);
	// Nothing tears off while a modal window is open: under a dialog Mac OS
	// 8.5 dims the Application menu's title and opens nothing
	// (`resources/screenshots/mac-os-8.5/platinum-85-appmenu-modal.png`).
	const modalOpen = useAppManager(classicyModalWindowOpen);
	const modalOpenRef = useRef(modalOpen);
	modalOpenRef.current = modalOpen;
	const [outline, setOutline] =
		useState<ClassicyAppSwitcherTearOffOutline | null>(null);

	useEffect(() => {
		if (!enabled || typeof document === "undefined") return;
		let tracking = false;
		// The drag opened the closed menu once already: a second click on
		// the title before it shows open would close it again.
		let pulledOpen = false;
		let current: ClassicyAppSwitcherTearOffOutline | null = null;
		let stopWatching: (() => void) | null = null;

		const switcherItem = () =>
			navRef.current?.querySelector<HTMLElement>(SWITCHER_SELECTOR) ?? null;
		// The open Application menu's list (none while it is closed: the list
		// stays in the document, and the title carries the `open` state).
		const openList = (item: HTMLElement) =>
			item.classList.contains(CLASSICY_STATE.open)
				? item.querySelector<HTMLElement>("ul")
				: null;

		const show = (next: ClassicyAppSwitcherTearOffOutline | null) => {
			current = next;
			setOutline(next);
		};
		const end = () => {
			tracking = false;
			show(null);
			stopWatching?.();
			stopWatching = null;
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp, true);
			document.removeEventListener("keydown", onKey, true);
		};
		const onMove = (e: MouseEvent) => {
			if (!tracking) return;
			if ((e.buttons & 1) === 0) {
				end();
				return;
			}
			const item = switcherItem();
			if (!item) {
				end();
				return;
			}
			const list = openList(item);
			if (!list) {
				if (!pulledOpen && e.clientY > item.getBoundingClientRect().bottom) {
					pulledOpen = true;
					item.click();
				}
				return;
			}
			const r = list.getBoundingClientRect();
			show(
				e.clientY > r.bottom + CLASSICY_APP_SWITCHER_TEAR_OFF_DISTANCE
					? classicyAppSwitcherTearOffOutline(
							e.clientX,
							e.clientY,
							r.width,
							r.height,
						)
					: null,
			);
		};
		const onUp = (e: MouseEvent) => {
			if (!tracking) return;
			const at = current;
			end();
			if (!at) return;
			e.preventDefault();
			closeAll();
			const desktop = navRef.current
				?.closest(".classicyDesktop")
				?.getBoundingClientRect();
			dispatch({
				type: APPLICATION_SWITCHER_TEAR_OFF,
				position: [
					at.left - (desktop?.left ?? 0),
					at.top - (desktop?.top ?? 0),
				],
			});
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && tracking) end();
		};
		const onDown = (e: MouseEvent) => {
			if (e.button !== 0 || tracking || modalOpenRef.current) return;
			const item = switcherItem();
			if (!item || !(e.target instanceof Node) || !item.contains(e.target))
				return;
			tracking = true;
			pulledOpen = false;
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp, true);
			document.addEventListener("keydown", onKey, true);
			stopWatching = onClassicyPointerStreamLost(end);
		};

		document.addEventListener("mousedown", onDown, true);
		return () => {
			document.removeEventListener("mousedown", onDown, true);
			end();
		};
	}, [enabled, navRef, dispatch, closeAll]);

	return outline ? (
		<div
			className="classicyApplicationSwitcherTearOffOutline"
			aria-hidden="true"
			style={{
				left: outline.left,
				top: outline.top,
				width: outline.width,
				height: outline.height,
			}}
		/>
	) : null;
};
