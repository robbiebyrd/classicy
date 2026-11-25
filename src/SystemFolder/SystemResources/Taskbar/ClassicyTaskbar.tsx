import "./ClassicyTaskbar.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import type { ClassicyBevelPopupRect } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import { setClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import {
	CLASSICY_START_MENU_ID,
	ClassicyStartMenu,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { ClassicyTaskbarTasks } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import {
	classicyDesktopHasOpenModal,
	useClassicyTaskbarKeys,
} from "@/SystemFolder/SystemResources/Taskbar/useClassicyTaskbarKeys.internal";

/**
 * The Start button's label when the layout gives none (WIG Ch.3 "The Start
 * Button", p.15, Figure 3.1).
 */
export const CLASSICY_TASKBAR_DEFAULT_START_LABEL = "Start";

export type ClassicyTaskbarProps = {
	/**
	 * Control Strip module ids the host turns off
	 * (`CLASSICY_CONTROL_STRIP_MODULE_IDS` names the built-ins), as
	 * `ClassicyControlStrip`'s `disabledModules`: published for the Control
	 * Strip control panel, which does not offer them, and never shown in the
	 * status area. `ClassicyDesktop` forwards its `controlStrip` prop's.
	 */
	disabledModules?: string[];
	/**
	 * Show no Control Strip module in the status area, as `controlStrip={false}`
	 * hides the strip; the status area's other contents stay.
	 * `ClassicyDesktop` sets it for `controlStrip={false}`.
	 */
	hideModules?: boolean;
	/** Extra class names, merged onto the root `<nav>` after the component's own. */
	className?: string;
	/** Inline style, merged onto the root `<nav>` after the component's own. */
	style?: CSSProperties;
};

/**
 * The taskbar's band (`ClassicyTaskbarBand.internal.ts`): the root's
 * measured height, published once it is laid out and on each resize, and
 * withdrawn on unmount, so window geometry, the desktop icon grid and every
 * menu keep above it. Each mount owns its own band, so a second desktop's
 * taskbar on the page never clears this one's.
 */
const useClassicyTaskbarBandPublisher = (
	rootRef: RefObject<HTMLElement | null>,
): void => {
	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const owner = {};
		const publish = () => setClassicyTaskbarBand(root.offsetHeight, owner);
		publish();
		const observer =
			typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
		observer?.observe(root);
		return () => {
			observer?.disconnect();
			setClassicyTaskbarBand(0, owner);
		};
	}, [rootRef]);
};

/**
 * The Windows 95/98 taskbar (WIG Ch.3 "The Taskbar", "The Start Button" and
 * "Window Buttons", pp.15–16, Figure 3.1; Ch.9 "Single Document Window
 * Interface", p.175; Ch.10 "Taskbar Integration", pp.211–212): a bar along
 * the desktop's bottom edge with the Start button at its left, a button for
 * each open primary window in the middle (none for a modal dialog or a
 * palette), and the status area at its right.
 *
 * `ClassicyDesktop` mounts it in the Control Strip's place when the active
 * Appearance Package's layout declares `taskbar` (the Windows 98 package),
 * forwarding its `controlStrip` prop's `disabledModules`, and `false` as
 * `hideModules`; with no `taskbar` in the layout it is never mounted, so
 * Platinum and System 7 draw the Control Strip as always.
 *
 * - **The Start button** opens the Start menu (`ClassicyStartMenu.internal.tsx`:
 *   About This Computer, Programs, Settings, Help, Empty Trash… and Reset
 *   PRAM…, beside the layout's `taskbar.startBanner`), and carries `open`
 *   while it is open: a press toggles it, as do Enter, Space and CTRL+ESC
 *   anywhere on the page (WIG App. B, Table B.2, p.358), and Escape closes
 *   it, leaving the focus on the button (handed back to it from the menu).
 *   Nothing opens it while a modal dialog is open on the desktop. Its label
 *   is the layout's `taskbar.startLabel` (`"Start"` when absent); its icon
 *   is an empty span the package draws.
 * - **A window button** (`classicyTaskbarTask`) shows the window's icon and
 *   title (its app's display name when untitled), cut with an ellipsis and
 *   then shown whole as a tooltip after 500 ms, whatever Balloon Help says.
 *   It is `active` (and `aria-pressed`) for the active window, or for the
 *   front window of an app whose modal or palette holds focus; `collapsed`
 *   while its window is collapsed (minimized under a layout that minimizes);
 *   `pressed` while a press is held on it. A click restores a minimized
 *   window, minimizes the active one, and activates any other; button 2
 *   activates the window (unless it is minimized) and opens its pop-up menu
 *   at the pointer, where the window has one. Every command runs through
 *   the window's own path (the window registry). The buttons keep the order
 *   their windows opened in, for the session.
 * - **The band.** It publishes its height as the taskbar band, so windows,
 *   desktop icons and menus keep above it (`useClassicyTaskbarBand`).
 *
 * It sits over windows and palettes (z-index 355, the Control Strip's band)
 * and under a modal dialog's scrim. Structure only: the package's stylesheet
 * sizes and draws every part.
 */
export const ClassicyTaskbar: FunctionalComponent<ClassicyTaskbarProps> = ({
	disabledModules,
	className,
	style,
}) => {
	const layout = useClassicyAppearanceLayout();
	const startLabel =
		layout.taskbar?.startLabel ?? CLASSICY_TASKBAR_DEFAULT_START_LABEL;
	const startBanner = layout.taskbar?.startBanner;
	const rootRef = useRef<HTMLElement>(null);
	const startRef = useRef<HTMLButtonElement>(null);
	const appearance = useClassicyAppearance("Taskbar", {}, rootRef);
	useClassicyTaskbarBandPublisher(rootRef);

	// Publish the host's choice for the Control Strip control panel, as the
	// strip does: the panel keeps offering what the status area may show.
	const disabledKey = JSON.stringify(disabledModules ?? []);
	useEffect(() => {
		setClassicyControlStripDisabledModules(JSON.parse(disabledKey));
		return () => setClassicyControlStripDisabledModules([]);
	}, [disabledKey]);

	// The Start button's rect while its menu is open, else null: the menu is
	// placed against the button as it stood when it opened.
	const [startAnchor, setStartAnchor] = useState<ClassicyBevelPopupRect | null>(
		null,
	);
	const startOpen = startAnchor !== null;
	const openStartMenu = useCallback(() => {
		const button = startRef.current;
		// A modal dialog blocks the taskbar as it blocks the desktop.
		if (!button || classicyDesktopHasOpenModal(rootRef.current)) return;
		const { top, bottom, left, right } = button.getBoundingClientRect();
		setStartAnchor({ top, bottom, left, right });
	}, []);
	const closeStartMenu = useCallback(() => {
		setStartAnchor(null);
		// Hand the focus back to the button when it was in the menu (the
		// keyboard, Escape), as Windows leaves it on the Start button.
		const menu = document.getElementById(CLASSICY_START_MENU_ID);
		if (menu?.contains(document.activeElement)) startRef.current?.focus();
	}, []);
	const toggleStartMenu = () => {
		if (startOpen) closeStartMenu();
		else openStartMenu();
	};
	useClassicyTaskbarKeys(rootRef, startOpen, openStartMenu, closeStartMenu);
	// A press opens or closes it, as a menu title does; Enter and Space reach
	// it as a click with no press count.
	const onStartMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.button === 0) toggleStartMenu();
	};
	const onStartClick = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.detail === 0) toggleStartMenu();
	};
	const onStartKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Escape" && startOpen) {
			e.preventDefault();
			closeStartMenu();
		}
	};
	// The browser's own menu never opens over the taskbar.
	const suppressContextMenu = (e: MouseEvent) => e.preventDefault();

	return (
		<nav
			{...appearance.attrs}
			ref={rootRef}
			aria-label="Taskbar"
			className={classNames("classicyTaskbar", appearance.className, className)}
			style={{ ...appearance.style, ...style }}
			onContextMenu={suppressContextMenu}
		>
			<button
				ref={startRef}
				type="button"
				className={classNames(
					"classicyTaskbarStart",
					classicyStateClasses({ open: startOpen }),
				)}
				data-classicy-part="taskbar-start"
				aria-haspopup="menu"
				aria-expanded={startOpen}
				aria-controls={startOpen ? CLASSICY_START_MENU_ID : undefined}
				onMouseDown={onStartMouseDown}
				onClick={onStartClick}
				onKeyDown={onStartKeyDown}
			>
				<span className="classicyTaskbarStartIcon" aria-hidden="true" />
				<span className="classicyTaskbarStartLabel">{startLabel}</span>
			</button>
			{startAnchor && (
				<ClassicyStartMenu
					anchor={startAnchor}
					buttonRef={startRef}
					label={startLabel}
					banner={startBanner}
					onClose={closeStartMenu}
				/>
			)}
			<ClassicyTaskbarTasks />
			{/* biome-ignore lint/a11y/useSemanticElements: the status area is a flex row of icons and the clock, not a form; a fieldset would bring a legend and form-control semantics */}
			<div
				className="classicyTaskbarTray"
				data-classicy-part="taskbar-tray"
				role="group"
				aria-label="Notification area"
			/>
		</nav>
	);
};
