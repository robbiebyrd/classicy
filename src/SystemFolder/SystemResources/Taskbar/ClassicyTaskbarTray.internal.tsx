import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type MouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { ClassicyBevelButtonPopup } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopup";
import type {
	ClassicyBevelPopupRect,
	ClassicyBevelPopupSide,
} from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButtonPopupPlacement";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	arrangeClassicyControlStripModules,
	type ClassicyControlStripModuleDefinition,
	type ClassicyControlStripModuleRegistration,
	classicyControlStripModuleLabel,
	useClassicyControlStripRegistrations,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyTaskbarClock } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarClock.internal";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";

/**
 * The taskbar's status area (plan 0020-w98 §2, "The tray"; WIG Ch.3 "The
 * Status Area", p.16; Ch.10 "Status Notification", pp.211–212, Figure 10.2):
 * the Control Strip's modules as notification icons, then the menu bar
 * extensions' region, then the clock. Internal: not exported from the
 * package.
 */

/**
 * The double-click time, in ms: how long a tray icon whose menu has a
 * default item waits after a click before it opens its surface, so a
 * double-click runs the default alone (Windows' `GetDoubleClickTime()`, 500
 * by default; a notification icon tells a click from a double-click by it).
 * The tooltip's delay is the same time (`CLASSICY_TASKBAR_TOOLTIP_DELAY_MS`).
 */
export const CLASSICY_TASKBAR_DOUBLE_CLICK_MS = 500;

/** The DOM id of a module's surface; its tray icon's `aria-controls` names it. */
export const classicyTaskbarTrayPopupId = (moduleId: string): string =>
	`classicy-taskbar-tray-${moduleId}`;

/**
 * The modules the tray shows, left to right: the registrations
 * `arrangeClassicyControlStripModules` makes available (their owners
 * mounted, none the host disabled, the user's order first). None while the
 * host hides the modules (`hide`, `controlStrip={false}`). The Control
 * Strip's own visibility and hidden-module list (`controlStrip.visible`,
 * `hiddenModules`) are not read: under the shell the Control Strip control
 * panel is Taskbar Properties (plan 0020-w98 E4), so nothing there could
 * turn a stored choice back, and a strip hidden under Platinum or System 7
 * would otherwise leave the status area empty for good. Windows 98's
 * Taskbar Properties offers no per-icon choice either (WIG Ch.10 p.212 has
 * each owner add and remove its own icon). Pure.
 */
export function classicyTaskbarTrayModules<
	T extends ClassicyControlStripModuleRegistration,
>(
	registrations: readonly T[],
	{
		disabledModules,
		stored,
		mountedApps,
		hide = false,
	}: {
		disabledModules?: readonly string[];
		stored?: {
			moduleOrder?: readonly string[];
		};
		mountedApps: ReadonlySet<string>;
		hide?: boolean;
	},
): T[] {
	if (hide) return [];
	return arrangeClassicyControlStripModules(registrations, {
		disabledModules,
		moduleOrder: stored?.moduleOrder,
		mountedApps,
	});
}

/**
 * A menu's default command (WIG Ch.10 "Status Notification", p.212: "a
 * double-click … carries out the default command"): its first item marked
 * `isDefault` that can be chosen (enabled, neither a divider nor a submenu),
 * else none.
 */
export const classicyTaskbarTrayDefaultItem = (
	menuItems: readonly ClassicyMenuItem[] | undefined,
): ClassicyMenuItem | undefined =>
	menuItems?.find(
		(item) =>
			item.isDefault === true &&
			item.disabled !== true &&
			item.id !== "spacer" &&
			!(item.menuChildren && item.menuChildren.length > 0),
	);

// Run a menu item as the menu runs a chosen one: its handler, else its
// event dispatched with its data.
const runMenuItem = (
	item: ClassicyMenuItem,
	dispatch: (action: { type: string; [key: string]: unknown }) => void,
) => {
	if (item.onClickFunc) item.onClickFunc();
	else if (item.event && item.eventData)
		dispatch({ type: item.event, ...item.eventData });
};

type TraySurface = {
	/** The icon's rect when the surface opened. */
	anchor: ClassicyBevelPopupRect;
	/** Opened from the keyboard: its first item or control takes the focus. */
	keyboard: boolean;
};

/**
 * One module's notification icon. A component of its own, keyed on the
 * registration's revision as the Control Strip keys its modules, so the
 * module's hook forms (`icon`, `menuItems`) and its `content` run inside the
 * providers with a fresh set of hooks after a replacement.
 *
 * WIG Ch.10 "Status Notification" (pp.211–212):
 *
 * - **Button 1** opens the module's `content` (Sound's slider) above the
 *   icon, else its `menuItems`: Windows 98's own Display indicator opened
 *   its menu of settings on a click, and a module's menu is its control
 *   (plan 0020-w98 Decisions). When the menu has a default item, the
 *   surface opens only once the double-click time has passed without a
 *   second click, so a double-click runs the default alone. A click while
 *   the surface is open closes it. Enter and Space open it at once, its
 *   first item or control focused. Its menu is a Windows pop-up menu: the
 *   arrows reach it from anywhere and walk its dimmed items too, and it
 *   never closes for idleness (the surface's `keyboard`).
 * - **Button 2** opens `menuItems` at the pointer, as a pop-up menu; a
 *   module with no menu opens nothing.
 * - **A double-click** runs the menu's default item (`isDefault`), if any.
 * - **The tooltip** names the module after 500 ms, whatever Balloon Help
 *   says (audit 7.28), and goes at a press.
 */
const ClassicyTaskbarTrayIcon: FunctionalComponent<{
	module: ClassicyControlStripModuleDefinition;
	popupSide: ClassicyBevelPopupSide;
}> = ({ module, popupSide }) => {
	const overrides = useClassicyAppIdentityOverrides();
	const dispatch = useAppManagerDispatch();
	const { showContextMenu } = useClassicyContextualMenu();
	// Function forms are hooks; a definition never switches form without a
	// new revision, which remounts this component.
	const icon = typeof module.icon === "function" ? module.icon() : module.icon;
	const menuItems =
		typeof module.menuItems === "function"
			? module.menuItems()
			: module.menuItems;
	const Content = module.content;
	const hasMenu = (menuItems?.length ?? 0) > 0;
	const opensContent = Content !== undefined;
	const opensSomething = opensContent || hasMenu;
	const defaultItem = classicyTaskbarTrayDefaultItem(menuItems);
	// K-D7: a module an app owns shows the app's display name.
	const label = classicyControlStripModuleLabel(module, overrides);
	const popupId = classicyTaskbarTrayPopupId(module.id);

	const buttonRef = useRef<HTMLButtonElement>(null);
	const [surface, setSurface] = useState<TraySurface | null>(null);
	const open = surface !== null;

	// The click waiting out the double-click time (a menu with a default).
	const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelPending = useCallback(() => {
		if (pendingRef.current === null) return;
		clearTimeout(pendingRef.current);
		pendingRef.current = null;
	}, []);
	useEffect(() => cancelPending, [cancelPending]);

	const { handlers, balloon } = useClassicyBalloonHelp(
		buttonRef,
		{ content: label, delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS },
		{ force: true },
	);

	const openSurface = (keyboard: boolean) => {
		const button = buttonRef.current;
		if (!button) return;
		const { top, bottom, left, right } = button.getBoundingClientRect();
		handlers.onMouseLeave();
		setSurface({ anchor: { top, bottom, left, right }, keyboard });
	};
	const closeSurface = useCallback(() => {
		setSurface(null);
		// Hand the focus back to the icon when it was in the surface (the
		// keyboard, Escape).
		const popup = document.getElementById(popupId);
		if (popup?.contains(document.activeElement)) buttonRef.current?.focus();
	}, [popupId]);

	const onMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		// A press puts the tooltip away, as Windows' does.
		handlers.onMouseLeave();
		// A pointer press leaves the focus where it is, as on a window
		// button: the tray takes none from a click.
		if (e.button === 0) e.preventDefault();
	};
	const onMouseEnter = () => {
		if (!open) handlers.onMouseEnter();
	};
	const onClick = (e: MouseEvent<HTMLButtonElement>) => {
		// The second click of a double-click is the double-click's.
		if (e.detail > 1) return;
		cancelPending();
		if (open) {
			closeSurface();
			return;
		}
		if (!opensSomething) return;
		// Enter or Space: at once, from the keyboard.
		if (e.detail === 0) {
			openSurface(true);
			return;
		}
		if (!defaultItem) {
			openSurface(false);
			return;
		}
		pendingRef.current = setTimeout(() => {
			pendingRef.current = null;
			openSurface(false);
		}, CLASSICY_TASKBAR_DOUBLE_CLICK_MS);
	};
	const onDoubleClick = () => {
		cancelPending();
		if (!defaultItem) return;
		if (open) setSurface(null);
		runMenuItem(defaultItem, dispatch);
	};
	const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
		// Never the browser's menu, the taskbar's or the desktop's.
		e.preventDefault();
		cancelPending();
		handlers.onMouseLeave();
		if (open) setSurface(null);
		if (!hasMenu || !menuItems) return;
		// A Windows pop-up menu: no leading Help item, and it takes the
		// keyboard while open, as TrackPopupMenu's menu loop does.
		showContextMenu(menuItems, [e.clientX, e.clientY], {
			helpItem: false,
			keyboard: true,
		});
	};

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				className={classNames(
					"classicyTaskbarTrayIcon",
					classicyStateClasses({ open }),
				)}
				aria-label={label}
				aria-haspopup={opensContent ? "dialog" : hasMenu ? "menu" : undefined}
				aria-expanded={opensSomething ? open : undefined}
				aria-controls={open ? popupId : undefined}
				aria-describedby={handlers["aria-describedby"]}
				onMouseDown={onMouseDown}
				onMouseEnter={onMouseEnter}
				onMouseLeave={handlers.onMouseLeave}
				onClick={onClick}
				onDoubleClick={onDoubleClick}
				onContextMenu={onContextMenu}
			>
				<ClassicyIconImage src={icon} alt="" draggable={false} />
			</button>
			{balloon}
			{surface && (
				<ClassicyBevelButtonPopup
					id={popupId}
					className="classicyTaskbarTrayPopup"
					anchor={surface.anchor}
					// Toward the desktop: below where there is room, and the menu
					// bounds end at the taskbar's band, so from a bottom tray it
					// flips above the icon; beside a side taskbar (`popupSide`
					// "right", flipping left from a right one).
					side={popupSide}
					// A menu starts at the icon's edge; a panel (the slider) is
					// centered on it, as on the Control Strip.
					align={opensContent ? "center" : "start"}
					menuItems={opensContent ? undefined : menuItems}
					content={opensContent && Content ? <Content /> : undefined}
					label={label}
					focusFirstItem={surface.keyboard}
					buttonRef={buttonRef}
					onClose={closeSurface}
					// On the band's top edge, a menu that fits there is whole.
					menuScrollMargin={0}
					// A Windows pop-up menu: the arrows from anywhere, dimmed
					// items walked, and no idle close.
					keyboard
				/>
			)}
		</>
	);
};

/**
 * The status area (`div.classicyTaskbarTray`, `data-classicy-part=
 * "taskbar-tray"`, a `group` labelled "Notification area"): the Control
 * Strip's modules as notification icons (`ul.classicyTaskbarTrayIcons`, one
 * `button.classicyTaskbarTrayIcon` each, `classicyTaskbarTrayModules`), then
 * the menu bar extensions' region (`ul#classicyDesktopMenuExtensions`, also
 * `classicyTaskbarTrayExtensions`, `data-classicy-part="extensions"`),
 * which `ClassicyMenuBarExtension` portals into under a taskbar, the
 * headless screen bar drawing none, then the clock
 * (`time.classicyTaskbarClock`, `ClassicyTaskbarClock.internal.tsx`), which
 * stays when the modules go. The Control Strip's own settings
 * (`collapsed`, `width`, `edge`, `bottom`) mean nothing here: they stay
 * stored and apply again under a package that draws the strip.
 */
export const ClassicyTaskbarTray: FunctionalComponent<{
	/** The host's disabled module ids (`ClassicyTaskbar`'s `disabledModules`). */
	disabledModules?: readonly string[];
	/** Show no module (`ClassicyTaskbar`'s `hideModules`). */
	hideModules?: boolean;
	/**
	 * Opens the taskbar's own menu (`useClassicyTaskbarMenu`, the taskbar's),
	 * which button 2 on the clock opens with Adjust Date/Time first.
	 */
	showTaskbarMenu?: (
		at: [number, number],
		leading?: readonly ClassicyMenuItem[],
	) => void;
	/**
	 * The side the icons' pop-ups open on (`"below"`, flipping above, unless
	 * the taskbar stands at a side: `"right"`, flipping left).
	 */
	popupSide?: ClassicyBevelPopupSide;
	/** Draw the clock (Taskbar Properties' "Show Clock"); default true. */
	showClock?: boolean;
}> = ({
	disabledModules,
	hideModules = false,
	showTaskbarMenu,
	popupSide = "below",
	showClock = true,
}) => {
	const registrations = useClassicyControlStripRegistrations();
	const mountedApps = useClassicyMountedApps();
	const stored = useAppManager((s) => s.System.Manager.Desktop.controlStrip);
	const shown = classicyTaskbarTrayModules(registrations, {
		disabledModules,
		stored,
		mountedApps,
		hide: hideModules,
	});

	return (
		// biome-ignore lint/a11y/useSemanticElements: the status area is a flex row of icons and the clock, not a form; a fieldset would bring a legend and form-control semantics
		<div
			className="classicyTaskbarTray"
			data-classicy-part="taskbar-tray"
			role="group"
			aria-label="Notification area"
		>
			<ul className="classicyTaskbarTrayIcons">
				{shown.map(({ definition, revision }) => (
					<li key={`${definition.id}:${revision}`}>
						<ClassicyTaskbarTrayIcon
							module={definition}
							popupSide={popupSide}
						/>
					</li>
				))}
			</ul>
			{/* The menu bar extensions' region: the id the screen bar's has,
			    which the headless screen bar under a taskbar does not draw. */}
			<ul
				id="classicyDesktopMenuExtensions"
				className="classicyDesktopMenuExtensions classicyTaskbarTrayExtensions"
				data-classicy-part="extensions"
			/>
			{showClock && <ClassicyTaskbarClock showTaskbarMenu={showTaskbarMenu} />}
		</div>
	);
};
