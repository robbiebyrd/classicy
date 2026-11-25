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
import { useClassicyTaskbarMenu } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import { ClassicyTaskbarTasks } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import { ClassicyTaskbarTray } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTray.internal";
import {
	classicyDesktopHasOpenModal,
	useClassicyTaskbarKeys,
} from "@/SystemFolder/SystemResources/Taskbar/useClassicyTaskbarKeys.internal";

/**
 * The taskbar's background under button 2, which opens the taskbar's own
 * menu: the window buttons' list and the status area's own boxes, around
 * their buttons (the root itself is checked as the event's current target).
 */
const TASKBAR_BACKGROUND = [
	".classicyTaskbarTasks",
	".classicyTaskbarTray",
	".classicyTaskbarTrayIcons",
	".classicyTaskbarTrayExtensions",
].join(", ");

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
	 * hides the strip; the status area's other contents (the menu bar
	 * extensions) stay.
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
 * - **The status area** (`ClassicyTaskbarTray.internal.tsx`) shows the
 *   Control Strip's modules as notification icons, in the strip's
 *   arrangement less the ones the user hid (none while the user has turned
 *   the strip off or `hideModules` is set), then the menu bar extensions'
 *   region. Button 1 on an icon opens the module's `content` above it, else
 *   its menu (after the double-click time when the menu has a default
 *   item), button 2 its menu at the pointer, a double-click its default
 *   item, and the module's name is its tooltip (WIG Ch.10 "Status
 *   Notification", pp.211–212).
 * - **The clock** (`ClassicyTaskbarClock.internal.tsx`) ends the status
 *   area, and stays when its modules go: the virtual clock's time without
 *   seconds, `4:37 PM` (`16:37` with the Date & Time control panel's
 *   24-hour clock), hidden while that panel hides the clock. Its tooltip is
 *   the long date (`Wednesday, November 25, 2026`), a double-click opens the
 *   Date & Time control panel, a click does nothing, and button 2 opens the
 *   taskbar's menu with Adjust Date/Time first, its default item. It keeps
 *   the store's time as the menu bar's clock does.
 * - **Its own menu.** Button 2 on the taskbar's background opens Minimize
 *   All Windows (Undo Minimize All after it, until one of those windows is
 *   restored or closed by other means) and Properties, the Control Strip
 *   control panel (`ClassicyTaskbarMenu.internal.ts`; WIG App. B, Table
 *   B.3, p.359).
 * - **The band.** It publishes its height as the taskbar band, so windows,
 *   desktop icons and menus keep above it (`useClassicyTaskbarBand`).
 *
 * It sits over windows and palettes (z-index 355, the Control Strip's band)
 * and under a modal dialog's scrim. Structure only: the package's stylesheet
 * sizes and draws every part.
 */
export const ClassicyTaskbar: FunctionalComponent<ClassicyTaskbarProps> = ({
	disabledModules,
	hideModules = false,
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
	// Button 2 on the taskbar's background (the bar itself, the window
	// buttons' list around its buttons, the status area around its icons)
	// opens the taskbar's own menu. Over a part that has its own (a window
	// button, a tray icon) or none (the Start button), and over the taskbar
	// in any case, the browser's menu and the desktop's never open.
	const showTaskbarMenu = useClassicyTaskbarMenu();
	const onContextMenu = (e: MouseEvent<HTMLElement>) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		const target = e.target;
		if (
			target === e.currentTarget ||
			(target instanceof Element && target.matches(TASKBAR_BACKGROUND))
		)
			showTaskbarMenu([e.clientX, e.clientY]);
	};

	return (
		<nav
			{...appearance.attrs}
			ref={rootRef}
			aria-label="Taskbar"
			className={classNames("classicyTaskbar", appearance.className, className)}
			style={{ ...appearance.style, ...style }}
			onContextMenu={onContextMenu}
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
			<ClassicyTaskbarTray
				disabledModules={disabledModules}
				hideModules={hideModules}
				showTaskbarMenu={showTaskbarMenu}
			/>
		</nav>
	);
};
