import "./ClassicyTaskbar.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { setClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { ClassicyTaskbarTasks } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";

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
 * - **The Start button** carries `open` while its menu is open: a press
 *   toggles it, as do Enter and Space, and Escape closes it, leaving the
 *   focus on the button. Its label is the layout's `taskbar.startLabel`
 *   (`"Start"` when absent); its icon is an empty span the package draws.
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
	const rootRef = useRef<HTMLElement>(null);
	const appearance = useClassicyAppearance("Taskbar", {}, rootRef);
	useClassicyTaskbarBandPublisher(rootRef);

	// Publish the host's choice for the Control Strip control panel, as the
	// strip does: the panel keeps offering what the status area may show.
	const disabledKey = JSON.stringify(disabledModules ?? []);
	useEffect(() => {
		setClassicyControlStripDisabledModules(JSON.parse(disabledKey));
		return () => setClassicyControlStripDisabledModules([]);
	}, [disabledKey]);

	const [startOpen, setStartOpen] = useState(false);
	// A press opens or closes it, as a menu title does; Enter and Space reach
	// it as a click with no press count.
	const onStartMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.button === 0) setStartOpen((open) => !open);
	};
	const onStartClick = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.detail === 0) setStartOpen((open) => !open);
	};
	const onStartKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Escape" && startOpen) {
			e.preventDefault();
			setStartOpen(false);
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
				type="button"
				className={classNames(
					"classicyTaskbarStart",
					classicyStateClasses({ open: startOpen }),
				)}
				data-classicy-part="taskbar-start"
				aria-haspopup="menu"
				aria-expanded={startOpen}
				onMouseDown={onStartMouseDown}
				onClick={onStartClick}
				onKeyDown={onStartKeyDown}
			>
				<span className="classicyTaskbarStartIcon" aria-hidden="true" />
				<span className="classicyTaskbarStartLabel">{startLabel}</span>
			</button>
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
