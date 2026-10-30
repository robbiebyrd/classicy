import "./ClassicyControlStrip.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
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
import type { ClassicyControlStripEdge } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
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
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
};

// HIGOS8 Figure 6-15: a module's surface overlaps the strip by 3 px (its bottom
// border lands two rows into the module) and a menu's left edge sits on the
// module's left separator.
const MODULE_POPUP_INSET = { top: 3, left: -1 };

// Pixels a press on the tab may travel and still count as a click.
const TAB_CLICK_SLOP = 3;

/**
 * One module's width with its separator: the scroll arrows' step, the tab's
 * resize step, and the strip's narrowest size. Measured from the first
 * module; with nothing to measure, the theme's module width plus its
 * separator (H-R12), read from the variables the viewport inherits. Each call
 * may force a style read: call it once per gesture.
 */
const moduleStepOf = (viewport: HTMLElement | null): number =>
	viewport?.querySelector<HTMLElement>(".classicyControlStripModule")
		?.offsetWidth ||
	readClassicyThemeVar("--control-strip-module-width", undefined, viewport) +
		readClassicyThemeVar("--control-strip-border-width", undefined, viewport);

/**
 * Snap a requested width to whole modules — the strip never shows part of
 * one — between one module and all of them. `step` is the module step when
 * the caller already holds it (a drag reads it once, on the press).
 */
const clampStripWidth = (
	viewport: HTMLElement | null,
	next: number,
	step: number = moduleStepOf(viewport),
): number => {
	const snapped = Math.round(next / step) * step;
	return Math.max(step, Math.min(snapped, viewport?.scrollWidth || snapped));
};

export type ClassicyControlStripPosition = {
	edge: ClassicyControlStripEdge;
	/** Distance in px from the desktop's bottom edge to the strip's. */
	bottom: number;
};

/**
 * The depth of the desktop's menu bar below the top of `desktop`, the area the
 * strip may not enter; 0 when there is no menu bar.
 */
const menuBarInsetOf = (desktop: HTMLElement): number => {
	const menuBar = desktop.querySelector(".classicyDesktopMenuBar");
	if (!menuBar) return 0;
	return Math.max(
		0,
		menuBar.getBoundingClientRect().bottom -
			desktop.getBoundingClientRect().top,
	);
};

/**
 * Where a Control-dragged strip docks (#298, #299): to the edge on the
 * pointer's half of the desktop, at the height the pointer carries it to —
 * kept between the desktop's bottom and the underside of the menu bar.
 */
export const computeClassicyControlStripPosition = ({
	pointer: [x, y],
	grabOffsetY,
	desktop,
	stripHeight,
	topInset = 0,
}: {
	/** The pointer, in client coordinates. */
	pointer: [number, number];
	/** How far below the strip's top edge the pointer took hold of it. */
	grabOffsetY: number;
	desktop: { left: number; top: number; width: number; height: number };
	stripHeight: number;
	/** Height at the top of the desktop the strip may not enter (the menu bar). */
	topInset?: number;
}): ClassicyControlStripPosition => {
	const edge = x - desktop.left < desktop.width / 2 ? "left" : "right";
	const stripTop = y - grabOffsetY - desktop.top;
	const highest = Math.max(0, desktop.height - topInset - stripHeight);
	const bottom = desktop.height - stripTop - stripHeight;
	return {
		edge,
		bottom: Math.round(Math.min(highest, Math.max(0, bottom))),
	};
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

// The strip's position custom properties belong to its stored position
// (ClassicyDesktopControlStripSetPosition): an Appearance Package's style never
// sets them, even in the default position, where the strip writes neither and
// the stylesheet's default applies. A consumer `style` still may.
const CONTROL_STRIP_POSITION_PROPERTIES = [
	"--classicy-control-strip-bottom",
	"--classicy-control-strip-top-inset",
];
const withoutPositionProperties = (
	style: CSSProperties | undefined,
): CSSProperties | undefined => {
	if (
		!style ||
		!CONTROL_STRIP_POSITION_PROPERTIES.some((key) => Object.hasOwn(style, key))
	)
		return style;
	const rest: Record<string, unknown> = { ...style };
	for (const key of CONTROL_STRIP_POSITION_PROPERTIES) delete rest[key];
	return rest as CSSProperties;
};

/**
 * The Mac OS 8 Control Strip (HIGOS8 Ch.6 "Persistent Access", p.125, Figure
 * 6-15): a floating strip, docked to the lower left of the desktop until the
 * user moves it, that keeps small module buttons within reach while their
 * control panels are closed.
 *
 * Docked left, from left to right: a collapse box, a scroll arrow, the
 * modules, a scroll arrow and the tab. The collapse box tucks the strip down to
 * the tab; a click
 * on the tab collapses or expands it, and dragging the tab sizes it. When the
 * modules do not fit, the scroll arrows step through them. Each module is a
 * pop-up bevel button, so its menu opens above the strip and behaves as a
 * standard or sticky menu. Its contextual menu hides the strip or opens the
 * Control Strip control panel.
 *
 * Control-dragging the collapse box moves the strip up or down the screen and
 * docks it to the edge on whichever half of the desktop it is dropped
 * (#298, #299). Docked right, the strip is mirrored: the tab leads and points
 * left, and the collapse box closes the right end.
 *
 * Modules come from `registerClassicyControlStripModule` — Classicy's own
 * (Sound, Screen Saver) and any an app or extension registers. Collapsed
 * state, width, docked position, and which modules show in what order persist
 * in the store (`System.Manager.Desktop.controlStrip`); the Control Strip
 * control panel edits them.
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
	style,
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

	const setWidth = useCallback(
		(next: number) => {
			if (next !== width)
				dispatch({ type: "ClassicyDesktopControlStripSetWidth", width: next });
		},
		[dispatch, width],
	);

	// While a Control-drag is under way the strip follows it locally; the store
	// takes the position once, on release.
	const [movePreview, setMovePreview] =
		useState<ClassicyControlStripPosition | null>(null);
	const edge = movePreview?.edge ?? stored?.edge ?? "left";
	const bottom = movePreview?.bottom ?? stored?.bottom ?? 0;
	// Docked right the tab points left, so dragging it left widens the strip.
	const growDirection = edge === "right" ? -1 : 1;

	const [canScroll, setCanScroll] = useState({ left: false, right: false });
	const stripRef = useRef<HTMLDivElement>(null);
	const appearance = useClassicyAppearance(
		"ControlStrip",
		{ collapsed, dragging: Boolean(movePreview) },
		stripRef,
	);
	const { emit } = appearance;
	// The tab (a click, Enter or Space, or a drag on a collapsed strip) and the
	// collapse box all land here.
	const setCollapsed = useCallback(
		(next: boolean) => {
			dispatch({
				type: "ClassicyDesktopControlStripSetCollapsed",
				collapsed: next,
			});
			emit(next ? "collapse" : "expand", withClassicyAppearanceInput());
		},
		[dispatch, emit],
	);
	const viewportRef = useRef<HTMLDivElement>(null);
	const moveRef = useRef<{
		startX: number;
		startY: number;
		grabOffsetY: number;
		moved: boolean;
		position: ClassicyControlStripPosition | null;
	} | null>(null);
	// A Control-press on the collapse box is a move, never a collapse.
	const suppressCollapseClickRef = useRef(false);
	const dragRef = useRef<{
		startX: number;
		startWidth: number;
		/** The module step, read once on the press (G14). */
		step: number;
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

	// The menu bar's depth, kept current so the SCSS cap on a stored height
	// stops under the menu bar, not just at the desktop's top edge, when the
	// desktop shrinks.
	const [topInset, setTopInset] = useState(0);
	useLayoutEffect(() => {
		const measure = () => {
			const desktop = stripRef.current?.offsetParent;
			const next = desktop instanceof HTMLElement ? menuBarInsetOf(desktop) : 0;
			setTopInset((prev) => (prev === next ? prev : next));
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);

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
			step: moduleStepOf(viewportRef.current),
			moved: false,
		};
	};

	useEffect(() => {
		const onMove = (e: globalThis.MouseEvent) => {
			const drag = dragRef.current;
			if (!drag) return;
			const dx = e.clientX - drag.startX;
			if (!drag.moved && Math.abs(dx) <= TAB_CLICK_SLOP) return;
			const starting = !drag.moved;
			drag.moved = true;
			if (collapsed) {
				// Dragging a collapsed strip pulls it back out at its last size.
				dragRef.current = null;
				setCollapsed(false);
				return;
			}
			if (starting) emit("dragStart", { kind: "resize" });
			setWidth(
				clampStripWidth(
					viewportRef.current,
					drag.startWidth + growDirection * dx,
					drag.step,
				),
			);
		};
		const onUp = () => {
			const drag = dragRef.current;
			dragRef.current = null;
			if (drag && !drag.moved) setCollapsed(!collapsed);
			if (drag?.moved) emit("dragEnd", { kind: "resize" });
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [collapsed, growDirection, setCollapsed, setWidth, emit]);

	// Control-drag on the collapse box: past the click slop the strip follows
	// the pointer up and down and docks to the pointer's half of the desktop;
	// release stores where it landed.
	useEffect(() => {
		const onMove = (e: globalThis.MouseEvent) => {
			const move = moveRef.current;
			const strip = stripRef.current;
			const desktop = strip?.offsetParent;
			if (!move || !strip || !(desktop instanceof HTMLElement)) return;
			if (
				!move.moved &&
				Math.abs(e.clientX - move.startX) <= TAB_CLICK_SLOP &&
				Math.abs(e.clientY - move.startY) <= TAB_CLICK_SLOP
			)
				return;
			if (!move.moved) emit("dragStart", { kind: "move" });
			move.moved = true;
			move.position = computeClassicyControlStripPosition({
				pointer: [e.clientX, e.clientY],
				grabOffsetY: move.grabOffsetY,
				desktop: desktop.getBoundingClientRect(),
				stripHeight: strip.offsetHeight,
				topInset: menuBarInsetOf(desktop),
			});
			setMovePreview(move.position);
		};
		const onUp = () => {
			const move = moveRef.current;
			moveRef.current = null;
			if (!move) return;
			// The press's own click, if it lands on the collapse box, fires right
			// after this release; any later activation must collapse normally,
			// even when the drag ended elsewhere and no click followed.
			setTimeout(() => {
				suppressCollapseClickRef.current = false;
			}, 0);
			if (move.moved) emit("dragEnd", { kind: "move" });
			if (!move.position) return;
			dispatch({
				type: "ClassicyDesktopControlStripSetPosition",
				...move.position,
			});
			setMovePreview(null);
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [dispatch, emit]);

	const onCollapseBoxMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
		// Every press decides afresh whether the click that ends it collapses.
		suppressCollapseClickRef.current = false;
		// macOS reports a Control-click as the primary button; other platforms
		// may report it as the secondary one.
		if (!e.ctrlKey || (e.button !== 0 && e.button !== 2)) return;
		e.preventDefault();
		suppressCollapseClickRef.current = true;
		const top = stripRef.current?.getBoundingClientRect().top ?? e.clientY;
		moveRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			grabOffsetY: e.clientY - top,
			moved: false,
			position: null,
		};
	};

	// A Control-click raises a contextual menu on macOS; on the collapse box it
	// starts a move instead, so claim it before the strip's own menu does.
	const onCollapseBoxContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
		if (!e.ctrlKey && !moveRef.current) return;
		e.preventDefault();
		e.stopPropagation();
	};

	// Left and Right Arrow size the strip a module at a time — toward the tab
	// grows it; Enter and Space reach the tab as a click (below).
	const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (collapsed || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
		e.preventDefault();
		const el = viewportRef.current;
		const current = el?.clientWidth ?? 0;
		const direction = (e.key === "ArrowRight" ? 1 : -1) * growDirection;
		const step = moduleStepOf(el);
		setWidth(clampStripWidth(el, current + direction * step, step));
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
								icon:
									resolveClassicyAsset(
										"icons",
										"controlPanels.controlStripManager.app",
									) ?? "",
							},
						}),
				},
			],
			[e.clientX, e.clientY],
		);
	};

	return (
		<div
			{...appearance.attrs}
			ref={stripRef}
			role="toolbar"
			aria-label="Control Strip"
			onContextMenu={onContextMenu}
			className={classNames(
				"classicyControlStrip",
				appearance.className,
				edge === "right" && "classicyControlStripRight",
				className,
			)}
			style={{
				...withoutPositionProperties(appearance.style),
				...(bottom === 0
					? {}
					: ({
							"--classicy-control-strip-bottom": `${bottom}px`,
							"--classicy-control-strip-top-inset": `${topInset}px`,
						} as CSSProperties)),
				...style,
			}}
		>
			{!collapsed && (
				<>
					<button
						type="button"
						className="classicyControlStripCell classicyControlStripCollapseBox"
						aria-label="Collapse Control Strip"
						onMouseDown={onCollapseBoxMouseDown}
						onContextMenu={onCollapseBoxContextMenu}
						onClick={(e) => {
							// Enter or Space (detail 0) is never the end of a press.
							if (suppressCollapseClickRef.current && e.detail !== 0) {
								suppressCollapseClickRef.current = false;
								return;
							}
							setCollapsed(true);
						}}
					>
						<ClassicyPixelArt rows={controlStripCollapseGlyph} />
					</button>
					<button
						type="button"
						className="classicyControlStripCell classicyControlStripScroll classicyControlStripScrollStart"
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
