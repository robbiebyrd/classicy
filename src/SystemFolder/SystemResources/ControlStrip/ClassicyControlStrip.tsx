import "./ClassicyControlStrip.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CONTROL_STRIP_MANAGER_APP_ID,
	CONTROL_STRIP_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	controlStripCollapseGlyph,
	controlStripModuleArrow,
	controlStripScrollLeft,
	controlStripScrollLeftDisabled,
	controlStripScrollRight,
	controlStripScrollRightDisabled,
	controlStripTab,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt";
import {
	arrangeClassicyControlStripModules,
	type ClassicyControlStripModuleDefinition,
	setClassicyControlStripDisabledModules,
	useClassicyControlStripRegistrations,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyPixelArt } from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";

export type ClassicyControlStripProps = {
	/**
	 * Module ids the host turns off (`CLASSICY_CONTROL_STRIP_MODULE_IDS` names
	 * the built-ins). A disabled module is not drawn, and the Control Strip
	 * control panel does not offer it to the user. Every other registered
	 * module — the built-ins included — shows unless the user hides it.
	 */
	disabledModules?: string[];
	/** Start collapsed to the tab alone, until the user expands it. */
	defaultCollapsed?: boolean;
	/**
	 * Starting width of the module area, in px, until the user resizes it by
	 * dragging the tab. Omitted, the strip opens wide enough for every module.
	 */
	defaultWidth?: number;
	className?: string;
};

// HIGOS8 Figure 6-15: a module's surface overlaps the strip by 3 px (its bottom
// border lands two rows into the module) and a menu's left edge sits on the
// module's left separator.
const MODULE_POPUP_INSET = { top: 3, left: -1 };

// Pixels a press on the tab may travel and still count as a click.
const TAB_CLICK_SLOP = 3;
// A module and its separator (30 + 1 px), for when nothing can be measured.
const MODULE_STEP_FALLBACK = 31;

/**
 * One module's width with its separator: the scroll arrows' step, the tab's
 * resize step, and the strip's narrowest size.
 */
const moduleStepOf = (viewport: HTMLElement | null): number =>
	viewport?.querySelector<HTMLElement>(".classicyControlStripModule")
		?.offsetWidth || MODULE_STEP_FALLBACK;

/**
 * Snap a requested width to whole modules — the strip never shows part of
 * one — between one module and all of them.
 */
const clampStripWidth = (
	viewport: HTMLElement | null,
	next: number,
): number => {
	const step = moduleStepOf(viewport);
	const snapped = Math.round(next / step) * step;
	return Math.max(step, Math.min(snapped, viewport?.scrollWidth || snapped));
};

/**
 * One module's button. A component of its own so the module's hook forms
 * (`icon`, `menuItems`) and its `content` run inside the providers.
 */
const ClassicyControlStripModuleButton: FunctionalComponent<{
	module: ClassicyControlStripModuleDefinition;
}> = ({ module }) => {
	// Function forms are hooks; a definition never switches form without a new
	// revision, which remounts this component (see the key below).
	const icon = typeof module.icon === "function" ? module.icon() : module.icon;
	const menuItems =
		typeof module.menuItems === "function"
			? module.menuItems()
			: module.menuItems;
	const Content = module.content;
	return (
		<ClassicyBevelButton
			mode="popup"
			className="classicyControlStripModule"
			icon={icon}
			aria-label={module.label}
			popupDirection="horizontal"
			popupPlacement="below"
			// Figure 6-15's menus start at the module's edge; Figure 2-16's
			// slider is centred on it.
			popupAlign={menuItems ? "start" : "center"}
			popupAnchorInset={MODULE_POPUP_INSET}
			menuItems={menuItems}
			popupContent={!menuItems && Content ? <Content /> : undefined}
		>
			<ClassicyPixelArt rows={controlStripModuleArrow} />
		</ClassicyBevelButton>
	);
};

/**
 * The Mac OS 8 Control Strip (HIGOS8 Ch.6 "Persistent Access", p.125, Figure
 * 6-15): a floating strip pinned to the lower left of the desktop that keeps
 * small module buttons within reach while their control panels are closed.
 *
 * From left to right: a collapse box, a scroll arrow, the modules, a scroll
 * arrow and the tab. The collapse box tucks the strip down to the tab; a click
 * on the tab collapses or expands it, and dragging the tab sizes it. When the
 * modules do not fit, the scroll arrows step through them. Each module is a
 * pop-up bevel button, so its menu opens above the strip and behaves as a
 * standard or sticky menu. Its contextual menu hides the strip or opens the
 * Control Strip control panel.
 *
 * Modules come from `registerClassicyControlStripModule` — Classicy's own
 * (Sound, Screen Saver) and any an app or extension registers. Collapsed
 * state, width, and which modules show in what order persist in the store
 * (`System.Manager.Desktop.controlStrip`); the Control Strip control panel
 * edits them.
 *
 * ClassicyDesktop mounts one (its `controlStrip` prop configures or hides it).
 */
export const ClassicyControlStrip: FunctionalComponent<
	ClassicyControlStripProps
> = ({
	disabledModules,
	defaultCollapsed = false,
	defaultWidth,
	className,
}) => {
	const dispatch = useAppManagerDispatch();
	const stored = useAppManager((s) => s.System.Manager.Desktop.controlStrip);
	const registrations = useClassicyControlStripRegistrations();
	const mountedApps = useClassicyMountedApps();
	const { showContextMenu } = useClassicyContextualMenu();

	const hiddenModules = stored?.hiddenModules ?? [];
	const shown = arrangeClassicyControlStripModules(registrations, {
		disabledModules,
		moduleOrder: stored?.moduleOrder,
		mountedApps,
	}).filter((r) => !hiddenModules.includes(r.definition.id));

	// Publish the host's choice for the Control Strip control panel.
	const disabledKey = JSON.stringify(disabledModules ?? []);
	useEffect(() => {
		setClassicyControlStripDisabledModules(JSON.parse(disabledKey));
		return () => setClassicyControlStripDisabledModules([]);
	}, [disabledKey]);

	// The host's defaults apply until the user collapses, expands or sizes the
	// strip; from then on the stored choice wins.
	const collapsed = stored?.collapsed ?? defaultCollapsed;
	const [initialWidth, setInitialWidth] = useState<number | null>(
		defaultWidth ?? null,
	);
	const width = stored?.width ?? initialWidth;

	const setCollapsed = useCallback(
		(next: boolean) =>
			dispatch({
				type: "ClassicyDesktopControlStripSetCollapsed",
				collapsed: next,
			}),
		[dispatch],
	);
	const setWidth = useCallback(
		(next: number) => {
			if (next !== width)
				dispatch({ type: "ClassicyDesktopControlStripSetWidth", width: next });
		},
		[dispatch, width],
	);

	const [canScroll, setCanScroll] = useState({ left: false, right: false });
	const viewportRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<{
		startX: number;
		startWidth: number;
		moved: boolean;
	} | null>(null);

	const updateScrollState = useCallback(() => {
		const el = viewportRef.current;
		if (!el) return;
		const left = el.scrollLeft > 0;
		const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
		setCanScroll((prev) =>
			prev.left === left && prev.right === right ? prev : { left, right },
		);
	}, []);

	// A starting width snaps to whole modules once they can be measured. It
	// stays local: only the user's own sizing is stored.
	// biome-ignore lint/correctness/useExhaustiveDependencies: snaps the initial width once, on mount
	useLayoutEffect(() => {
		if (defaultWidth !== undefined)
			setInitialWidth(clampStripWidth(viewportRef.current, defaultWidth));
	}, []);

	// Re-measure whenever the strip changes shape or its modules change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: width, collapsed and the module list change what fits; they are triggers, not inputs
	useLayoutEffect(() => {
		updateScrollState();
	}, [width, collapsed, shown.length, updateScrollState]);

	const scrollBy = (direction: 1 | -1) => {
		const el = viewportRef.current;
		if (!el) return;
		el.scrollLeft += direction * moduleStepOf(el);
		updateScrollState();
	};

	// Tab: a press that stays put is a click (collapse/expand); one that moves
	// drags the strip's width.
	const onTabMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return;
		e.preventDefault();
		dragRef.current = {
			startX: e.clientX,
			startWidth: viewportRef.current?.clientWidth ?? 0,
			moved: false,
		};
	};

	useEffect(() => {
		const onMove = (e: globalThis.MouseEvent) => {
			const drag = dragRef.current;
			if (!drag) return;
			const dx = e.clientX - drag.startX;
			if (!drag.moved && Math.abs(dx) <= TAB_CLICK_SLOP) return;
			drag.moved = true;
			if (collapsed) {
				// Dragging a collapsed strip pulls it back out at its last size.
				dragRef.current = null;
				setCollapsed(false);
				return;
			}
			setWidth(clampStripWidth(viewportRef.current, drag.startWidth + dx));
		};
		const onUp = () => {
			const drag = dragRef.current;
			dragRef.current = null;
			if (drag && !drag.moved) setCollapsed(!collapsed);
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [collapsed, setCollapsed, setWidth]);

	// Left and Right Arrow size the strip a module at a time; Enter and Space
	// reach the tab as a click (below).
	const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (collapsed || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
		e.preventDefault();
		const el = viewportRef.current;
		const current = el?.clientWidth ?? 0;
		setWidth(
			clampStripWidth(
				el,
				current + (e.key === "ArrowRight" ? 1 : -1) * moduleStepOf(el),
			),
		);
	};

	// Hidden from the Control Strip control panel; the panel brings it back.
	if (stored?.visible === false) return null;

	const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		showContextMenu(
			[
				{
					id: "control-strip-hide",
					title: "Hide Control Strip",
					onClickFunc: () =>
						dispatch({
							type: "ClassicyDesktopControlStripSetVisible",
							visible: false,
						}),
				},
				{ id: "spacer" },
				{
					// HIGOS8 p.125: the strip's own control panel is a command away.
					id: "control-strip-open-control-panel",
					title: `Open ${CONTROL_STRIP_MANAGER_APP_NAME} Control Panel`,
					onClickFunc: () =>
						dispatch({
							type: "ClassicyAppOpen",
							app: {
								id: CONTROL_STRIP_MANAGER_APP_ID,
								name: CONTROL_STRIP_MANAGER_APP_NAME,
								icon: ClassicyIcons.controlPanels.controlStripManager.app,
							},
						}),
				},
			],
			[e.clientX, e.clientY],
		);
	};

	return (
		<div
			role="toolbar"
			aria-label="Control Strip"
			onContextMenu={onContextMenu}
			className={classNames(
				"classicyControlStrip",
				collapsed && "classicyControlStripCollapsed",
				className,
			)}
		>
			{!collapsed && (
				<>
					<button
						type="button"
						className="classicyControlStripCell classicyControlStripCollapseBox"
						aria-label="Collapse Control Strip"
						onClick={() => setCollapsed(true)}
					>
						<ClassicyPixelArt rows={controlStripCollapseGlyph} />
					</button>
					<button
						type="button"
						className="classicyControlStripCell classicyControlStripScroll"
						aria-label="Scroll Control Strip left"
						disabled={!canScroll.left}
						onClick={() => scrollBy(-1)}
					>
						<ClassicyPixelArt
							rows={
								canScroll.left
									? controlStripScrollLeft
									: controlStripScrollLeftDisabled
							}
						/>
					</button>
					<div
						ref={viewportRef}
						className="classicyControlStripModules"
						style={width === null ? undefined : { width }}
						onScroll={updateScrollState}
					>
						{shown.map(({ definition, revision }) => (
							<ClassicyControlStripModuleButton
								key={`${definition.id}:${revision}`}
								module={definition}
							/>
						))}
					</div>
					<button
						type="button"
						className="classicyControlStripCell classicyControlStripScroll"
						aria-label="Scroll Control Strip right"
						disabled={!canScroll.right}
						onClick={() => scrollBy(1)}
					>
						<ClassicyPixelArt
							rows={
								canScroll.right
									? controlStripScrollRight
									: controlStripScrollRightDisabled
							}
						/>
					</button>
				</>
			)}
			<button
				type="button"
				className="classicyControlStripTab"
				aria-label={
					collapsed
						? "Expand Control Strip"
						: "Collapse or resize Control Strip"
				}
				aria-expanded={!collapsed}
				onMouseDown={onTabMouseDown}
				// A mouse click was already handled on release; a click with no
				// pointer behind it (detail 0) is Enter or Space.
				onClick={(e) => {
					if (e.detail === 0) setCollapsed(!collapsed);
				}}
				onKeyDown={onTabKeyDown}
			>
				<ClassicyPixelArt rows={controlStripTab} />
			</button>
		</div>
	);
};
