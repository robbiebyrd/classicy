import {
	type MouseEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import type { ClassicyTaskbarEdge } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { isClassicyTaskbarVertical } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarDock.internal";

/**
 * Sizing the taskbar (the shell addendum's B5; WIG Ch.3 "The Taskbar",
 * p.15: "The user can also size the taskbar"): a drag of its inner edge,
 * the edge facing the desktop, resizes it, by whole rows of window buttons
 * at the top and bottom, in pixels at a side. Windows 98 as shipped, as
 * ReactOS's explorer rebuilds it (`CTrayWindow::CalculateValidSize`,
 * `CTaskSwitchWnd::UpdateButtonsSize`): at least one row, at most half the
 * desktop; at a side at least the Start button's width, at most half the
 * desktop. Internal.
 */

/** What a sizing drag needs, measured as it starts. */
export type ClassicyTaskbarSizeMetrics = {
	/** The bar's thickness with one row of window buttons, px. */
	base: number;
	/** One more row's thickness: a button's height and the gap between rows, px. */
	pitch: number;
	/** The least width at a side: the Start button's and the bar's margins, px. */
	minWidth: number;
	/** The desktop's extent across the bar (its height, or width at a side), px. */
	desktop: number;
};

/**
 * The most rows the bar may hold at the top or bottom: as many as keep it
 * within half the desktop, at least one. Pure.
 */
export function classicyTaskbarMaxRows({
	base,
	pitch,
	desktop,
}: Pick<ClassicyTaskbarSizeMetrics, "base" | "pitch" | "desktop">): number {
	if (!(pitch > 0) || !(desktop > 0)) return 1;
	return Math.max(1, Math.floor((desktop / 2 - base) / pitch) + 1);
}

/**
 * The size a sizing drag gives the bar on `edge` when its inner edge is at
 * `thickness` px from the desktop's edge it is docked to: at the top and
 * bottom the nearest whole number of rows, between one and
 * `classicyTaskbarMaxRows`; at a side the width in whole px, between
 * `minWidth` and half the desktop. Pure.
 */
export function classicyTaskbarSizeFor(
	edge: ClassicyTaskbarEdge,
	thickness: number,
	metrics: ClassicyTaskbarSizeMetrics,
): number {
	const { base, pitch, minWidth, desktop } = metrics;
	if (isClassicyTaskbarVertical(edge)) {
		const max = Math.max(minWidth, Math.floor(desktop / 2));
		return Math.round(Math.min(max, Math.max(minWidth, thickness)));
	}
	const max = classicyTaskbarMaxRows(metrics);
	if (!(pitch > 0)) return 1;
	const rows = Math.round((thickness - base) / pitch) + 1;
	return Math.min(max, Math.max(1, rows));
}

/**
 * How far the pointer at `point` is from the desktop edge the bar is docked
 * to (`rect`, the desktop's box), px: the bar's thickness were its inner
 * edge there. Pure.
 */
export function classicyTaskbarThicknessAt(
	edge: ClassicyTaskbarEdge,
	point: readonly [number, number],
	rect: Pick<DOMRect, "top" | "right" | "bottom" | "left">,
): number {
	const [x, y] = point;
	switch (edge) {
		case "top":
			return y - rect.top;
		case "left":
			return x - rect.left;
		case "right":
			return rect.right - x;
		default:
			return rect.bottom - y;
	}
}

const px = (value: string): number => {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : 0;
};

/**
 * Measures `root` (the taskbar) for a sizing drag on `edge`, holding `rows`
 * rows now: its thickness less the rows past the first, a row's pitch (the
 * Start button's height and the window buttons' `row-gap`), the least side
 * width (the Start button's width and the bar's padding across) and the
 * desktop's extent across the bar.
 */
export function measureClassicyTaskbarSize(
	root: HTMLElement,
	edge: ClassicyTaskbarEdge,
	rows: number,
): ClassicyTaskbarSizeMetrics {
	const vertical = isClassicyTaskbarVertical(edge);
	const start = root.querySelector<HTMLElement>(".classicyTaskbarStart");
	const tasks = root.querySelector<HTMLElement>(".classicyTaskbarTasks");
	const canStyle = typeof getComputedStyle === "function";
	const gap = tasks && canStyle ? px(getComputedStyle(tasks).rowGap) : 0;
	const pitch = (start?.offsetHeight ?? 0) + gap;
	const rootStyle = canStyle ? getComputedStyle(root) : null;
	const across = rootStyle
		? px(rootStyle.paddingLeft) + px(rootStyle.paddingRight)
		: 0;
	const desktopEl = root.closest(".classicyDesktop") ?? root.parentElement;
	const rect = desktopEl?.getBoundingClientRect();
	const thickness = vertical ? root.offsetWidth : root.offsetHeight;
	return {
		base: vertical ? thickness : thickness - Math.max(0, rows - 1) * pitch,
		pitch,
		minWidth: (start?.offsetWidth ?? 0) + across,
		desktop: rect ? (vertical ? rect.width : rect.height) : 0,
	};
}

/**
 * The sizing drag (`ClassicyTaskbar`'s `classicyTaskbarSizer`): a button-1
 * press with no modifier on the inner edge, then the bar follows the
 * pointer, drawn at the size it would take (`size`, while `sizing`); the
 * release, or a lost pointer stream, keeps it there (`onSize`, called only
 * for a size other than `stored`).
 */
export function useClassicyTaskbarSize(
	rootRef: RefObject<HTMLElement | null>,
	edge: ClassicyTaskbarEdge,
	stored: number | undefined,
	onSize: (size: number) => void,
): {
	size: number | undefined;
	sizing: boolean;
	onMouseDown: (e: MouseEvent<HTMLElement>) => void;
} {
	const [drag, setDrag] = useState<{
		metrics: ClassicyTaskbarSizeMetrics;
		rect: Pick<DOMRect, "top" | "right" | "bottom" | "left">;
		size: number | undefined;
	} | null>(null);
	const dragRef = useRef(drag);
	dragRef.current = drag;
	const onSizeRef = useRef(onSize);
	onSizeRef.current = onSize;
	const storedRef = useRef(stored);
	storedRef.current = stored;

	const end = useCallback(() => {
		const current = dragRef.current;
		setDrag(null);
		if (
			current &&
			current.size !== undefined &&
			current.size !== storedRef.current
		)
			onSizeRef.current(current.size);
	}, []);

	const held = drag !== null;
	useEffect(() => {
		if (!held) return;
		const onMove = (e: globalThis.MouseEvent) => {
			const current = dragRef.current;
			if (!current) return;
			const size = classicyTaskbarSizeFor(
				edge,
				classicyTaskbarThicknessAt(edge, [e.clientX, e.clientY], current.rect),
				current.metrics,
			);
			if (size !== current.size) setDrag({ ...current, size });
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", end);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", end);
		};
	}, [held, end, edge]);
	useClassicyPointerStreamLost(held, end);

	const onMouseDown = (e: MouseEvent<HTMLElement>) => {
		const root = rootRef.current;
		if (
			e.button !== 0 ||
			e.shiftKey ||
			e.ctrlKey ||
			e.altKey ||
			e.metaKey ||
			!root
		)
			return;
		// Neither a move of the taskbar nor a selection of text.
		e.preventDefault();
		e.stopPropagation();
		const desktopEl = root.closest(".classicyDesktop") ?? root.parentElement;
		const rect = desktopEl?.getBoundingClientRect();
		if (!rect) return;
		const rows = isClassicyTaskbarVertical(edge) ? 1 : (stored ?? 1);
		setDrag({
			metrics: measureClassicyTaskbarSize(root, edge, rows),
			rect,
			size: stored,
		});
	};

	return {
		size: drag ? drag.size : stored,
		sizing: drag !== null,
		onMouseDown,
	};
}
