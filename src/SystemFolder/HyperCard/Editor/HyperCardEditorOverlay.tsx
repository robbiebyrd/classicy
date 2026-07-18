/**
 * Interaction layer for the editor canvas: per-part hit regions, the selection
 * outline with 8 resize handles, keyboard editing, palette drag-drop, and
 * click-to-place. Live drag/resize offsets stay in local state; a single
 * ClassicyAppHCEditSetRect commits on pointer-up.
 */

import {
	type CSSProperties,
	type DragEvent,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type PointerEvent,
	useState,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type HCEditState,
	peekLayerParts,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import type { HCRect } from "@/SystemFolder/HyperCard/HyperCardModel";

export const HYPERCARD_PART_DRAG_MIME = "application/x-hypercard-part-type";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

interface DragState {
	partId: string;
	/** undefined = move; otherwise the active resize handle. */
	handle?: HandleId;
	startX: number;
	startY: number;
	startRect: HCRect;
	dx: number;
	dy: number;
}

function partRect(edit: HCEditState, partId: string): HCRect {
	const part = peekLayerParts(edit.draft, edit.currentCardId, edit.layer)?.find(
		(p) => p.id === partId,
	);
	return part?.rect ?? [0, 0, 120, 60];
}

/** Apply a move/resize delta to a rect (resize keeps the opposite edge fixed). */
export function dragRect(drag: DragState): HCRect {
	const [x, y, w, h] = drag.startRect;
	if (!drag.handle) return [x + drag.dx, y + drag.dy, w, h];
	let [nx, ny, nw, nh] = [x, y, w, h];
	if (drag.handle.includes("w")) {
		nx = x + drag.dx;
		nw = w - drag.dx;
	}
	if (drag.handle.includes("e")) nw = w + drag.dx;
	if (drag.handle.includes("n")) {
		ny = y + drag.dy;
		nh = h - drag.dy;
	}
	if (drag.handle.includes("s")) nh = h + drag.dy;
	return [nx, ny, nw, nh];
}

interface HyperCardEditorOverlayProps {
	stackId: string;
	edit: HCEditState;
}

export const HyperCardEditorOverlay: FunctionalComponent<
	HyperCardEditorOverlayProps
> = ({ stackId, edit }) => {
	const dispatch = useAppManagerDispatch();
	const [drag, setDrag] = useState<DragState | undefined>();

	const parts =
		peekLayerParts(edit.draft, edit.currentCardId, edit.layer) ?? [];
	const selected = edit.selectedPartId;

	const commitRect = (partId: string, rect: HCRect) =>
		dispatch({ type: "ClassicyAppHCEditSetRect", stackId, partId, rect });

	const beginDrag = (
		e: PointerEvent<HTMLElement>,
		partId: string,
		handle?: HandleId,
	) => {
		e.stopPropagation();
		try {
			(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		} catch {
			// NotFoundError when the pointer id isn't active (capture races,
			// synthetic events) — dragging works without capture.
		}
		if (!handle) {
			dispatch({ type: "ClassicyAppHCEditSelect", stackId, partId });
		}
		setDrag({
			partId,
			handle,
			startX: e.clientX,
			startY: e.clientY,
			startRect: partRect(edit, partId),
			dx: 0,
			dy: 0,
		});
	};

	const onPointerMove = (e: PointerEvent<HTMLElement>) => {
		if (!drag) return;
		setDrag({
			...drag,
			dx: e.clientX - drag.startX,
			dy: e.clientY - drag.startY,
		});
	};

	const onPointerUp = () => {
		if (!drag) return;
		if (drag.dx !== 0 || drag.dy !== 0) {
			commitRect(drag.partId, dragRect(drag));
		}
		setDrag(undefined);
	};

	const surfacePoint = (
		e: { clientX: number; clientY: number },
		el: HTMLElement,
	) => {
		const box = el.getBoundingClientRect();
		return [
			Math.round(e.clientX - box.left),
			Math.round(e.clientY - box.top),
		] as [number, number];
	};

	const onSurfacePointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return;
		if (edit.placing) {
			const at = surfacePoint(e, e.currentTarget);
			dispatch({
				type: "ClassicyAppHCEditAddPart",
				stackId,
				partType: edit.placing,
				at,
			});
			return;
		}
		dispatch({ type: "ClassicyAppHCEditSelect", stackId, partId: undefined });
	};

	const onDrop = (e: DragEvent<HTMLDivElement>) => {
		const partType = e.dataTransfer?.getData(HYPERCARD_PART_DRAG_MIME);
		if (!partType) return;
		e.preventDefault();
		const at = surfacePoint(e, e.currentTarget);
		dispatch({ type: "ClassicyAppHCEditAddPart", stackId, partType, at });
	};

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const meta = e.metaKey || e.ctrlKey;
		if (meta && (e.key === "z" || e.key === "Z")) {
			e.preventDefault();
			dispatch({
				type: e.shiftKey ? "ClassicyAppHCEditRedo" : "ClassicyAppHCEditUndo",
				stackId,
			});
			return;
		}
		if (!selected) return;
		if (meta && e.key === "c") {
			dispatch({
				type: "ClassicyAppHCEditCopyPart",
				stackId,
				partId: selected,
			});
			return;
		}
		if (meta && e.key === "v") {
			dispatch({ type: "ClassicyAppHCEditPastePart", stackId });
			return;
		}
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			dispatch({
				type: "ClassicyAppHCEditDeletePart",
				stackId,
				partId: selected,
			});
			return;
		}
		if (e.key === "Escape") {
			dispatch({ type: "ClassicyAppHCEditSelect", stackId, partId: undefined });
			return;
		}
		const step = e.shiftKey ? 8 : 1;
		const deltas: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step],
		};
		const delta = deltas[e.key];
		if (!delta) return;
		e.preventDefault();
		const [x, y, w, h] = partRect(edit, selected);
		commitRect(selected, [x + delta[0], y + delta[1], w, h]);
	};

	const rectFor = (partId: string): HCRect => {
		const base = partRect(edit, partId);
		if (drag && drag.partId === partId && (drag.dx !== 0 || drag.dy !== 0)) {
			return dragRect(drag);
		}
		return base;
	};

	const rectStyle = ([x, y, w, h]: HCRect): CSSProperties => ({
		left: x,
		top: y,
		width: w,
		height: h,
	});

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: editor design surface handles pointer/key/drop directly
		<div
			className={"classicyHyperCardEditorOverlay"}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: editor surface needs keyboard input for arrow/delete/undo editing
			tabIndex={0}
			onPointerDown={onSurfacePointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onKeyDown={onKeyDown}
			onDragOver={(e) => e.preventDefault()}
			onDrop={onDrop}
		>
			{parts.map((part) => (
				<div
					key={part.id}
					className={"classicyHyperCardEditorHit"}
					data-part-id={part.id}
					style={rectStyle(rectFor(part.id))}
					onPointerDown={(e) => beginDrag(e, part.id)}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
				/>
			))}
			{selected && parts.some((p) => p.id === selected) ? (
				<div
					className={"classicyHyperCardEditorSelection"}
					style={rectStyle(rectFor(selected))}
				>
					{HANDLES.map((h) => (
						<div
							key={h}
							className={"classicyHyperCardEditorHandle"}
							data-handle={h}
							onPointerDown={(e) => beginDrag(e, selected, h)}
							onPointerMove={onPointerMove}
							onPointerUp={onPointerUp}
						/>
					))}
				</div>
			) : null}
		</div>
	);
};
