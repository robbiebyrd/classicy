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
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import type { ClassicyBevelPopupRect } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import { setClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import {
	classicyTaskbarEdge,
	classicyTaskbarOptions,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	CLASSICY_START_MENU_ID,
	ClassicyStartMenu,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyStartMenu.internal";
import {
	type ClassicyTaskbarEdge,
	setClassicyTaskbarBand,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	classicyTaskbarAutoHideDuration,
	classicyTaskbarHiddenTranslate,
	isClassicyTaskbarVertical,
	useClassicyTaskbarAutoHide,
	useClassicyTaskbarDock,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarDock.internal";
import { useClassicyTaskbarCommands } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import { ClassicyTaskbarQuickLaunch } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarQuickLaunch.internal";
import {
	CLASSICY_TASKBAR_TOOLTIP_DELAY_MS,
	ClassicyTaskbarTasks,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import { ClassicyTaskbarTray } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTray.internal";
import {
	classicyDesktopHasOpenModal,
	useClassicyTaskbarKeys,
} from "@/SystemFolder/SystemResources/Taskbar/useClassicyTaskbarKeys.internal";

/**
 * The taskbar's background under button 2, which opens the taskbar's own
 * menu: the band site (the window buttons' list and its gripper and up/down
 * control, the Quick Launch toolbar around its buttons) and the status
 * area's own boxes, around their buttons (the root itself is checked as the
 * event's current target).
 */
const TASKBAR_BAND_SITE = [
	".classicyTaskbarTasks",
	".classicyTaskbarGripper",
	".classicyTaskbarPager",
	".classicyTaskbarQuickLaunch",
	".classicyTaskbarQuickLaunchButtons",
].join(", ");
const TASKBAR_STATUS_AREA = [
	".classicyTaskbarTray",
	".classicyTaskbarTrayIcons",
	".classicyTaskbarTrayExtensions",
].join(", ");

/**
 * The taskbar's empty area a press moves it from (plan 0020-w98 E4): the
 * bar itself, its bands around their buttons and the status area around its
 * icons, but not a band's gripper, which belongs to its band.
 */
const isTaskbarBackground = (
	target: EventTarget | null,
	root: HTMLElement,
): boolean =>
	target === root ||
	(target instanceof Element &&
		!target.matches(".classicyTaskbarGripper") &&
		(target.matches(TASKBAR_BAND_SITE) || target.matches(TASKBAR_STATUS_AREA)));

/**
 * The Start button's label when the layout gives none (WIG Ch.3 "The Start
 * Button", p.15, Figure 3.1).
 */
export const CLASSICY_TASKBAR_DEFAULT_START_LABEL = "Start";

/**
 * The Start button's tooltip, Windows 98 SE's (explorer.exe's string 533,
 * "Click here to begin."), shown after the ToolTip delay while the menu is
 * closed.
 */
export const CLASSICY_TASKBAR_START_TOOLTIP = "Click here to begin.";

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
	/**
	 * The signed-in user's name: the Start menu shows Log Off <name>… only
	 * with one (plan 0020-w98 E2). `ClassicyDesktop` forwards its `userName`.
	 */
	userName?: string;
	/** Extra class names, merged onto the root `<nav>` after the component's own. */
	className?: string;
	/** Inline style, merged onto the root `<nav>` after the component's own. */
	style?: CSSProperties;
};

/** The root's class for each edge it is docked to (plan 0020-w98 E4). */
const EDGE_CLASS: Record<ClassicyTaskbarEdge, string> = {
	top: "classicyTaskbarEdgeTop",
	right: "classicyTaskbarEdgeRight",
	bottom: "classicyTaskbarEdgeBottom",
	left: "classicyTaskbarEdgeLeft",
};

/**
 * The taskbar's band (`ClassicyTaskbarBand.internal.ts`): the root's
 * measured thickness on the edge it is docked to (its height at the top or
 * bottom, its width at a side), published once it is laid out and on each
 * resize or move, and withdrawn on unmount, so window geometry, the desktop
 * icon grid and every menu keep to the work area it leaves. An auto-hide
 * taskbar (`reserve` false) takes no band, as Windows gives an auto-hide
 * taskbar's edge back to the work area. Each mount owns its own band, so a
 * second desktop's taskbar on the page never clears this one's. Returns the
 * thickness last measured.
 */
const useClassicyTaskbarBandPublisher = (
	rootRef: RefObject<HTMLElement | null>,
	edge: ClassicyTaskbarEdge,
	reserve: boolean,
): number => {
	const [thickness, setThickness] = useState(0);
	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const owner = {};
		const publish = () => {
			const px = isClassicyTaskbarVertical(edge)
				? root.offsetWidth
				: root.offsetHeight;
			setThickness(px);
			setClassicyTaskbarBand(reserve ? px : 0, owner, edge);
		};
		publish();
		const observer =
			typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
		observer?.observe(root);
		return () => {
			observer?.disconnect();
			setClassicyTaskbarBand(0, owner, edge);
		};
	}, [rootRef, edge, reserve]);
	return thickness;
};

/**
 * Whether the taskbar was pressed or focused since a window last became the
 * active one: under Taskbar Properties' "Always on top" off, it is drawn
 * above the windows only then, as a taskbar that is not topmost comes to the
 * front when used and goes behind the window activated next.
 */
const useClassicyTaskbarRaised = (): {
	raised: boolean;
	raise: () => void;
} => {
	const [raised, setRaised] = useState(false);
	const activeWindow = useAppManager((s) => {
		const app = Object.values(s.System.Manager.Applications.apps).find(
			(a) => a.open && a.focused,
		);
		if (!app) return "";
		const window = listAppWindows(app).find((w) => w.focused && !w.closed);
		return window ? `${app.id}\u0000${window.id}` : "";
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the active window, which sends the taskbar back
	useEffect(() => {
		setRaised(false);
	}, [activeWindow]);
	return { raised, raise: () => setRaised(true) };
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
 *   About This Computer, Programs, Documents, Settings, Help, Run..., Empty
 *   Trash… and Reset PRAM…, Log Off <name>... (with a `userName`) and Shut
 *   Down..., beside the layout's `taskbar.startBanner`), and carries `open`
 *   while it is open: a press toggles it, as do Enter, Space and CTRL+ESC
 *   anywhere on the page (WIG App. B, Table B.2, p.358), and Escape closes
 *   it, leaving the focus on the button (handed back to it from the menu).
 *   Nothing opens it while a modal dialog is open on the desktop. Its label
 *   is the layout's `taskbar.startLabel` (`"Start"` when absent); its icon
 *   is an empty span the package draws. Its tooltip, after 500 ms whatever
 *   Balloon Help says, is Windows 98's "Click here to begin."
 *   (`CLASSICY_TASKBAR_START_TOOLTIP`), never over the open menu.
 * - **A window button** (`classicyTaskbarTask`) shows the window's icon and
 *   title (its app's display name when untitled), cut with an ellipsis and
 *   then shown whole as a tooltip after 500 ms, whatever Balloon Help says.
 *   It is `active` (and `aria-pressed`) for the active window, or for the
 *   front window of an app whose modal or palette holds focus; `collapsed`
 *   while its window is collapsed (minimized under a layout that minimizes);
 *   `pressed` while a press is held on it; `classicyTaskbarTaskAttention`
 *   while its window asks for attention (`ClassicyAppRequestAttention`),
 *   which the package draws flashing. A click restores a minimized
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
 * - **Quick Launch** (`ClassicyTaskbarQuickLaunch.internal.tsx`), shown
 *   after the Start button unless the user turned it off (Toolbars ▸ Quick
 *   Launch, stored as `System.Manager.Desktop.taskbar.quickLaunch`): the
 *   Finder, Show Desktop and the apps the host marks
 *   (`ClassicyApp`'s `showInQuickLaunch`), each a flat button with its name
 *   as a tooltip. While it shows, the window buttons' band leads with a
 *   gripper too.
 * - **Its own menu.** Button 2 on the taskbar's background opens Toolbars ▸
 *   (over the bar and its bands, not the status area), Cascade Windows,
 *   Tile Windows Horizontally and Vertically, Minimize All Windows, the Undo
 *   of the last of those, and Properties, the Control Strip control panel
 *   (`ClassicyTaskbarMenu.internal.ts`; WIG App. B, Table B.3, p.359;
 *   Windows 98 SE's explorer.exe).
 * - **Paging.** When the window buttons at their least width no longer fit
 *   the row, they show one row at a time behind an up/down control at the
 *   band's right (`ClassicyTaskbarTasks.internal.tsx`).
 * - **The band.** It publishes its thickness as the taskbar band on the
 *   edge it is docked to, so windows, desktop icons and menus keep to the
 *   work area it leaves (`useClassicyTaskbarInsets`).
 * - **Docking and Taskbar Properties** (plan 0020-w98 E4,
 *   `ClassicyTaskbarDock.internal.ts`): a drag of its empty area moves it to
 *   the top, a side or the bottom (`classicyTaskbarEdge<Edge>`,
 *   `classicyTaskbarVertical` at a side, `dragging` during the drag),
 *   stored as `System.Manager.Desktop.taskbar.edge`; Taskbar Properties'
 *   options (`classicyTaskbarOptions`) send it behind the windows while it
 *   is not in use (`classicyTaskbarBelow`), slide it off its edge
 *   (`classicyTaskbarAutoHide`, `collapsed` while hidden, no band), give the
 *   Start menu small icons and drop the clock.
 *
 * It sits over windows and palettes (z-index 355, the Control Strip's band)
 * and under a modal dialog's scrim. Structure only: the package's stylesheet
 * sizes and draws every part.
 */
export const ClassicyTaskbar: FunctionalComponent<ClassicyTaskbarProps> = ({
	disabledModules,
	hideModules = false,
	userName,
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
	const dispatch = useAppManagerDispatch();
	// Taskbar Properties' options and the edge it is docked to (plan
	// 0020-w98 E4), each with Windows 98's default when absent.
	const stored = useAppManager((s) => s.System.Manager.Desktop.taskbar);
	const options = classicyTaskbarOptions(stored);
	// Docking: a drag of the bar's empty area carries it to another edge,
	// drawn there while the drag lasts and stored at the release.
	const dock = useClassicyTaskbarDock(
		rootRef,
		classicyTaskbarEdge(stored),
		(edge) => dispatch({ type: "ClassicyDesktopTaskbarSetEdge", edge }),
		isTaskbarBackground,
	);
	const edge = dock.edge;
	const vertical = isClassicyTaskbarVertical(edge);
	const thickness = useClassicyTaskbarBandPublisher(
		rootRef,
		edge,
		!options.autoHide,
	);
	const { raised, raise } = useClassicyTaskbarRaised();

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
	// Auto hide: slid off its edge until the pointer reaches it, and shown
	// while its Start menu is open (CTRL+ESC included) or it is being moved.
	const autoHide = useClassicyTaskbarAutoHide(
		rootRef,
		options.autoHide,
		startOpen || dock.dragging,
	);
	// Its tooltip, "Click here to begin.", after Windows' initial ToolTip
	// delay (the double-click time), whatever Balloon Help says; never over
	// the open menu, and put away by a press, as a Windows tooltip is.
	const { handlers: startTip, balloon: startTipBalloon } =
		useClassicyBalloonHelp(
			startRef,
			{
				content: CLASSICY_TASKBAR_START_TOOLTIP,
				delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS,
			},
			{ force: true },
		);
	// A press opens or closes it, as a menu title does; Enter and Space reach
	// it as a click with no press count.
	const onStartMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		startTip.onMouseLeave();
		if (e.button === 0) toggleStartMenu();
	};
	const onStartMouseEnter = () => {
		if (!startOpen) startTip.onMouseEnter();
	};
	// However the menu opens (a press, CTRL+ESC, Enter), the tooltip goes.
	const hideStartTipRef = useRef(startTip.onMouseLeave);
	hideStartTipRef.current = startTip.onMouseLeave;
	useEffect(() => {
		if (startOpen) hideStartTipRef.current();
	}, [startOpen]);
	const onStartClick = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.detail === 0) toggleStartMenu();
	};
	const onStartKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Escape" && startOpen) {
			e.preventDefault();
			closeStartMenu();
		}
	};
	// Button 2 on the taskbar's background (the bar itself, the bands around
	// their buttons, the status area around its icons) opens the taskbar's
	// own menu, led by Toolbars ▸ except over the status area (the band
	// site's menu). Over a part that has its own (a window button, a Quick
	// Launch button, a tray icon) or none (the Start button), and over the
	// taskbar in any case, the browser's menu and the desktop's never open.
	const { showMenu: showTaskbarMenu, toggleDesktop } =
		useClassicyTaskbarCommands();
	const onContextMenu = (e: MouseEvent<HTMLElement>) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		const target = e.target;
		const at: [number, number] = [e.clientX, e.clientY];
		if (
			target === e.currentTarget ||
			(target instanceof Element && target.matches(TASKBAR_BAND_SITE))
		)
			showTaskbarMenu(at, [], { toolbars: true });
		else if (target instanceof Element && target.matches(TASKBAR_STATUS_AREA))
			showTaskbarMenu(at);
	};
	// Quick Launch, shown unless the user turned it off.
	const quickLaunch = useAppManager(
		(s) => s.System.Manager.Desktop.taskbar?.quickLaunch !== false,
	);

	// The pop-ups open toward the desktop: below (flipping above from a
	// bottom taskbar), or beside a side one (flipping left from the right).
	const popupSide = vertical ? "right" : "below";
	// Auto hide's slide: off its edge but for the strip, at ReactOS's speeds.
	const slide: CSSProperties = options.autoHide
		? {
				translate: autoHide.hidden
					? classicyTaskbarHiddenTranslate(edge, thickness)
					: "0 0",
				transitionDuration: `${classicyTaskbarAutoHideDuration(
					thickness,
					autoHide.hidden,
				)}ms`,
			}
		: {};
	// Under "Always on top" off it goes behind the windows, but for while it
	// is in use (pressed or focused since a window was last activated, its
	// Start menu open, being moved).
	const below = !options.alwaysOnTop && !raised && !startOpen && !dock.dragging;

	return (
		<nav
			{...appearance.attrs}
			ref={rootRef}
			aria-label="Taskbar"
			className={classNames(
				"classicyTaskbar",
				EDGE_CLASS[edge],
				{
					classicyTaskbarVertical: vertical,
					classicyTaskbarAutoHide: options.autoHide,
					classicyTaskbarBelow: below,
				},
				classicyStateClasses({
					collapsed: autoHide.hidden,
					dragging: dock.dragging,
				}),
				appearance.className,
				className,
			)}
			style={{ ...appearance.style, ...slide, ...style }}
			onContextMenu={onContextMenu}
			onMouseDown={(e) => {
				raise();
				dock.onMouseDown(e);
			}}
			onMouseEnter={autoHide.onMouseEnter}
			onMouseLeave={autoHide.onMouseLeave}
			onFocus={() => {
				raise();
				autoHide.onFocus();
			}}
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
				aria-describedby={startTip["aria-describedby"]}
				onMouseDown={onStartMouseDown}
				onMouseEnter={onStartMouseEnter}
				onMouseLeave={startTip.onMouseLeave}
				onClick={onStartClick}
				onKeyDown={onStartKeyDown}
			>
				<span className="classicyTaskbarStartIcon" aria-hidden="true" />
				<span className="classicyTaskbarStartLabel">{startLabel}</span>
			</button>
			{startTipBalloon}
			{startAnchor && (
				<ClassicyStartMenu
					anchor={startAnchor}
					buttonRef={startRef}
					label={startLabel}
					banner={startBanner}
					onClose={closeStartMenu}
					userName={userName}
					side={popupSide}
					smallIcons={options.smallStartMenuIcons}
				/>
			)}
			{quickLaunch && (
				<ClassicyTaskbarQuickLaunch
					showTaskbarMenu={showTaskbarMenu}
					toggleDesktop={toggleDesktop}
				/>
			)}
			<ClassicyTaskbarTasks gripper={quickLaunch} vertical={vertical} />
			<ClassicyTaskbarTray
				disabledModules={disabledModules}
				hideModules={hideModules}
				showTaskbarMenu={showTaskbarMenu}
				popupSide={popupSide}
				showClock={options.showClock}
			/>
		</nav>
	);
};
