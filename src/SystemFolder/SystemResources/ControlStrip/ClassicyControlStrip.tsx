import "./ClassicyControlStrip.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { useClassicyDefaultControlStripModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripModules";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * One control strip module: a small button that pops up a menu of status and
 * commands (HIGOS8 Figure 6-15) or another surface such as a slider (Figure
 * 2-16). HIGOS8 p.125: a module belonging to a control panel should include a
 * command that opens that control panel.
 */
export type ClassicyControlStripModule = {
	id: string;
	/** Module icon, drawn at 16 px. */
	icon: string;
	/** Accessible name ("Sound"). */
	label: string;
	/**
	 * The module's menu. A disabled item with the `classicyControlStripStatus`
	 * class renders as an italic status line, like Figure 6-15's
	 * "No Users Connected".
	 */
	menuItems?: ClassicyMenuItem[];
	/** A surface other than a menu. Ignored when `menuItems` is set. */
	content?: ReactNode;
};

type ClassicyControlStripProps = {
	/**
	 * Modules to show, left to right. Defaults to the built-in modules for
	 * Classicy's own control panels (`useClassicyDefaultControlStripModules`).
	 */
	modules?: ClassicyControlStripModule[];
	/** Start collapsed to the tab alone. */
	defaultCollapsed?: boolean;
	/**
	 * Starting width of the module area, in px; the user resizes it by dragging
	 * the tab. Omitted, the strip opens wide enough for every module.
	 */
	defaultWidth?: number;
	className?: string;
};

// Pixels a press on the tab may travel and still count as a click.
const TAB_CLICK_SLOP = 3;
// How far an arrow key on the tab resizes the strip.
const TAB_KEY_STEP = 24;

/** One module's width: the scroll arrows' step and the strip's narrowest size. */
const moduleStepOf = (viewport: HTMLElement | null): number =>
	viewport?.querySelector<HTMLElement>(".classicyControlStripModule")
		?.offsetWidth || TAB_KEY_STEP;

/** Keep a dragged width between one module and all of them. */
const clampStripWidth = (viewport: HTMLElement | null, next: number): number =>
	Math.max(
		moduleStepOf(viewport),
		Math.min(next, viewport?.scrollWidth || next),
	);

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
 * standard or sticky menu.
 *
 * Mount it as a child of ClassicyDesktop.
 */
export const ClassicyControlStrip: FunctionalComponent<
	ClassicyControlStripProps
> = ({ modules, defaultCollapsed = false, defaultWidth, className }) => {
	const builtIns = useClassicyDefaultControlStripModules();
	const shown = modules ?? builtIns;

	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const [width, setWidth] = useState<number | null>(defaultWidth ?? null);
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
			if (drag && !drag.moved) setCollapsed((c) => !c);
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [collapsed]);

	// Left and Right Arrow size the strip from the keyboard; Enter and Space
	// reach the tab as a click (below).
	const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (collapsed || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
		e.preventDefault();
		const el = viewportRef.current;
		const current = el?.clientWidth ?? 0;
		setWidth(
			clampStripWidth(
				el,
				current + (e.key === "ArrowRight" ? 1 : -1) * TAB_KEY_STEP,
			),
		);
	};

	return (
		<div
			role="toolbar"
			aria-label="Control Strip"
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
						className="classicyControlStripCollapseBox"
						aria-label="Collapse Control Strip"
						onClick={() => setCollapsed(true)}
					/>
					<button
						type="button"
						className="classicyControlStripScroll classicyControlStripScrollLeft"
						aria-label="Scroll Control Strip left"
						disabled={!canScroll.left}
						onClick={() => scrollBy(-1)}
					/>
					<div
						ref={viewportRef}
						className="classicyControlStripModules"
						style={width === null ? undefined : { width }}
						onScroll={updateScrollState}
					>
						{shown.map((module) => (
							<ClassicyBevelButton
								key={module.id}
								mode="popup"
								bevelWidth="small"
								className="classicyControlStripModule"
								icon={module.icon}
								aria-label={module.label}
								popupArrow="small"
								popupDirection="horizontal"
								popupPlacement="below"
								menuItems={module.menuItems}
								popupContent={module.content}
							/>
						))}
					</div>
					<button
						type="button"
						className="classicyControlStripScroll classicyControlStripScrollRight"
						aria-label="Scroll Control Strip right"
						disabled={!canScroll.right}
						onClick={() => scrollBy(1)}
					/>
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
					if (e.detail === 0) setCollapsed((c) => !c);
				}}
				onKeyDown={onTabKeyDown}
			/>
		</div>
	);
};
