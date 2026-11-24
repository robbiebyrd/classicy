import "./ClassicyIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	isClassicyContextualPress,
	isClassicyControlPress,
	openClassicyControlPressContextMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualPress.internal";
import {
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	CLASSICY_FILE_PATH_ATTRIBUTE,
	type ClassicyFileDropTarget,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import {
	classicyFileDragAppearanceCallbacks,
	useClassicyFileDragEndOnUnmount,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAppearance.internal";
import type { ClassicyFileDragOutlinePart } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicySelectedIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicySelectedIconImage.internal";
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex.internal";

interface ClassicyIconProps {
	/** Owning app id; prefixes the element's DOM id (`<appId>.shortcut-…`). */
	appId: string;
	/** Item name: the image's alt text, and the caption when `label` is unset. */
	name: string;
	/** Icon image URL (e.g. a `ClassicyIcons` entry). Also used as the selection mask. */
	icon: string;
	/** Caption under the icon. Defaults to `name`. */
	label?: string;
	/** Caption placement relative to the image. Defaults to `below`. */
	labelPosition?: ClassicyLabelPosition;
	/** Starting `[left, top]` in px within the positioned container. Defaults to `[0, 0]`. */
	initialPosition?: [number, number];
	/**
	 * The positioned container the icon lives in. Drag coordinates are
	 * measured against it, so without it the icon cannot be dragged.
	 */
	holder?: RefObject<HTMLElement | null>;
	/** "Open" action: called on double-click, or Enter/Space while focused. A single click only selects. */
	onClickFunc?: () => void;
	/**
	 * Draws the icon and caption faded (45% opacity) — the file browser sets it
	 * for entries marked `_invisible` when invisible files are shown. Defaults
	 * to `false`.
	 */
	invisible?: boolean;
	/** Explicit icon size in px. Falls back to the theme's desktop icon size. */
	size?: number;
	/** Grid pitch. When set, a *dragged* icon rounds to the nearest cell. */
	snapTo?: [number, number];
	/**
	 * Top-left of the lattice `snapTo` repeats over. Defaults to the origin, but
	 * the file browser's layout starts one padding in, so a snap that ignored it
	 * would round onto cells the layout never uses.
	 */
	snapOrigin?: [number, number];
	/**
	 * Disables repositioning — used by "Keep arranged", where position is
	 * derived. An icon with `onFileDrag` can still be dragged *out* to another
	 * folder. Defaults to `false`.
	 */
	positionLocked?: boolean;
	/**
	 * Marks the icon as a folder the Finder can drop items into (its path): see
	 * `ClassicyFileDrag`.
	 */
	dropFolderPath?: string;
	/**
	 * The file system path the icon stands for, carried in
	 * `data-classicy-file-path` — how a file browser finds its selected items
	 * and the item under a right-click.
	 */
	filePath?: string;
	/**
	 * Drag the icon as a Finder item: a dotted outline follows the pointer
	 * across windows and the desktop (`startClassicyFileDrag`) instead of the
	 * icon itself. Called on release with the drop target (null when there is
	 * none), the pointer, where the outline's top left was let go, and how far
	 * the pointer traveled from the press; return `false` to have the icon
	 * move to where its outline was let go — a drop back in its own folder —
	 * or `true` when the drop was handled (or refused) elsewhere and the icon
	 * stays put.
	 */
	onFileDrag?: (
		target: ClassicyFileDropTarget | null,
		point: [number, number],
		outlineTopLeft: [number, number],
		travel: [number, number],
	) => boolean;
	/**
	 * The parts the Finder drag's outline traces (see `onFileDrag`), read at
	 * the press. Defaults to this icon's image and label; a container that
	 * drags a selection passes every selected icon's.
	 */
	fileDragParts?: () => ClassicyFileDragOutlinePart[];
	/**
	 * Moves the icon by `dx`, `dy` (rounded onto `snapTo`'s grid) each time
	 * `id` changes: a container moving a selection's other icons as far as
	 * the one dragged within their folder. The value it mounts with is not
	 * applied.
	 */
	moveBy?: { id: number; dx: number; dy: number };
	/**
	 * Whether the icon is selected, for a container that keeps the
	 * selection itself (a file browser's icon view, whose selection
	 * rectangle selects many at once). Left out, the icon keeps its own.
	 */
	selected?: boolean;
	/**
	 * Called with the selection a click, drag or open asks for (a click
	 * toggles it). With `selected` set the icon shows only what `selected`
	 * says, so the container applies it.
	 */
	onSelectedChange?: (selected: boolean) => void;
	/**
	 * With `selected`, the presses and clicks that select, with their
	 * modifiers, for the container to apply its own rules (the file
	 * browser's icon view: a click selects the icon alone, Shift or Command
	 * toggles it, a press on an unselected icon selects it alone so its drag
	 * carries it alone). Given, a click no longer toggles the icon by itself.
	 * A contextual-menu press (Control or the right button) is reported as a
	 * press with no modifiers; the click ending a drag is not reported.
	 */
	onSelectionGesture?: (gesture: ClassicyIconSelectionGesture) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/**
	 * Inline style, merged onto the root element after the component's own, so
	 * its keys win — including `--desktop-icon-size`. A `left`/`top` here
	 * overrides the icon's position, so the icon no longer follows a drag.
	 * Stacking belongs to the icon states (ClassicyIcon.scss: 10, dragging 500), so a
	 * `zIndex` here is dropped.
	 */
	style?: CSSProperties;
}

/** A press (mousedown) or click on an icon, as `onSelectionGesture` reports it. */
export type ClassicyIconSelectionGesture = {
	type: "press" | "click";
	shiftKey: boolean;
	metaKey: boolean;
};

/**
 * Rounds a dropped icon's position to the nearest cell of the lattice with the
 * given `pitch` and `origin`. Exported so the rounding can be unit-tested
 * directly — jsdom has no layout engine, so a simulated drag would only ever
 * measure zeros.
 */
export const snapToGrid = (
	position: [number, number],
	pitch: [number, number],
	origin: [number, number] = [0, 0],
): [number, number] => [
	origin[0] + Math.round((position[0] - origin[0]) / pitch[0]) * pitch[0],
	origin[1] + Math.round((position[1] - origin[1]) / pitch[1]) * pitch[1],
];

/**
 * An icon with a caption that can be selected, dragged and opened — the
 * Finder-style icon used on surfaces other than the desktop, such as
 * `ClassicyFileBrowser`'s icon view (desktop icons are `ClassicyDesktopIcon`,
 * normally created for you by `ClassicyApp`). Use it in place of an `<img>`
 * plus caption when the picture stands for an openable item.
 *
 * The icon is absolutely positioned at `initialPosition` inside a positioned
 * container; pass that container as `holder` to make it draggable, and
 * `snapTo` (with `snapOrigin`) to round drops onto a grid. A single click
 * toggles the selected (highlighted) look (the click ending a drag does
 * not); double-click or Enter/Space calls `onClickFunc`. A Control-press or a
 * right-press is the contextual-menu click: it selects the icon, never drags
 * it, and a Control-press opens the contextual menu where the browser does
 * not (off macOS), the click after it swallowed. Position and selection are local state — nothing is written
 * to the store — unless the container passes `selected` (and
 * `onSelectedChange`) to keep the selection itself, as the file browser's
 * icon view does. Size follows the theme's `--desktop-icon-size` unless
 * `size` is set.
 *
 * ```tsx
 * <div ref={holderRef} style={{ position: "relative", height: 200 }}>
 *     <ClassicyIcon appId="Demo.app" name="Read Me" icon={docIcon} holder={holderRef} />
 * </div>
 * ```
 */
export const ClassicyIcon: FunctionalComponent<ClassicyIconProps> = ({
	appId,
	name,
	icon,
	label,
	labelPosition = "below",
	initialPosition = [0, 0],
	holder,
	onClickFunc,
	invisible = false,
	size,
	snapTo,
	snapOrigin,
	positionLocked = false,
	dropFolderPath,
	filePath,
	onFileDrag,
	fileDragParts,
	moveBy,
	selected,
	onSelectedChange,
	onSelectionGesture,
	className,
	style,
}) => {
	const [position, setPosition] = useState<[number, number]>(initialPosition);
	const [dragging, setDragging] = useState<boolean>(false);
	const [ownActive, setOwnActive] = useState<boolean>(false);
	// Selected: the container's say when it keeps the selection, else the
	// icon's own.
	const active = selected ?? ownActive;
	const setActive = (next: boolean) => {
		if (selected === undefined) setOwnActive(next);
		onSelectedChange?.(next);
	};

	// Whether the pointer actually moved the icon between mousedown and mouseup.
	// A ref, not state: it must be readable inside the same mouseup that clears
	// it, and it never affects what is rendered.
	const movedWhileDragging = useRef<boolean>(false);
	// Whether the current press became a Finder drag. The click that ends it,
	// when it is let go over the icon, is no click (Mac OS 8.1 keeps a
	// selection it dragged): set when the drag starts, cleared at each press.
	const pressDraggedRef = useRef<boolean>(false);

	const iconRef = useRef<HTMLDivElement>(null);
	const appearance = useClassicyAppearance(
		"Icon",
		{ dragging, selected: active },
		iconRef,
	);
	// One dragEnd per dragStart: mouseup also ends presses that never dragged.
	const dragEmittedRef = useRef(false);
	// A file drag in progress ends (canceled) before the icon unmounts.
	const endFileDragOnUnmount = useClassicyFileDragEndOnUnmount();

	const id = `${appId}.shortcut`;

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyIcon", appId, name, icon, label };

	const toggleFocus = (e: MouseEvent<HTMLDivElement>) => {
		// The click ending a drag: the press was a drag, not a click.
		if (pressDraggedRef.current) {
			pressDraggedRef.current = false;
			return;
		}
		track("focus", analyticsArgs);
		if (onSelectionGesture) {
			// The container's rules: a plain click selects, a modified one
			// toggles.
			const toggles = e.shiftKey || e.metaKey;
			appearance.emit("select", { selected: toggles ? !active : true });
			onSelectionGesture({
				type: "click",
				shiftKey: e.shiftKey,
				metaKey: e.metaKey,
			});
			return;
		}
		appearance.emit("select", { selected: !active });
		setActive(!active);
	};
	const setFocus = (active: boolean) => {
		track("focus", analyticsArgs);
		setActive(active);
	};

	const clearFocus = () => {
		track("blur", analyticsArgs);
		setActive(false);
	};

	const doDoubleClick = () => {
		if (onClickFunc) {
			// A double-click or Enter/Space.
			appearance.emit("open", withClassicyAppearanceInput());
			clearFocus();
			onClickFunc();
		}
	};

	// `lost`: ended by the pointer stream being lost, not by a release.
	const stopChangeIcon = (lost: boolean) => {
		// Gated on a real drag: mouseup also ends a bare click, and Mac OS 8 never
		// moved an icon you only clicked to select it.
		if (snapTo && movedWhileDragging.current) {
			setPosition((p) => snapToGrid(p, snapTo, snapOrigin));
		}
		// The icon itself was dragged: the click that may follow is no click.
		if (movedWhileDragging.current) pressDraggedRef.current = true;
		movedWhileDragging.current = false;
		setDragging(false);
		if (dragEmittedRef.current) {
			dragEmittedRef.current = false;
			appearance.emit("dragEnd", { lost });
		}
	};

	// The pointer stream lost mid-drag (the window blurred, a pointercancel,
	// the page hidden): the icon stays where it was dragged, as if released
	// there, instead of following the pointer back with no button held.
	useClassicyPointerStreamLost(dragging, () => stopChangeIcon(true));

	// A container's `moveBy`: applied when its id changes, never at mount.
	const movedByRef = useRef(moveBy?.id);
	useEffect(() => {
		if (!moveBy || movedByRef.current === moveBy.id) return;
		movedByRef.current = moveBy.id;
		setPosition((p) => {
			const next: [number, number] = [p[0] + moveBy.dx, p[1] + moveBy.dy];
			return snapTo ? snapToGrid(next, snapTo, snapOrigin) : next;
		});
	}, [moveBy, snapTo, snapOrigin]);

	const startDrag = (e: MouseEvent<HTMLDivElement>) => {
		pressDraggedRef.current = false;
		// The contextual-menu click (a Control-press or a right-press, HIGOS8
		// p.93), as the Mac OS 8.1 Finder takes it on an icon: it selects the
		// icon as a press does (alone, unless it is already selected), never
		// drags it, and opens the menu (`ClassicyContextualPress.internal.ts`).
		if (isClassicyContextualPress(e)) {
			if (onSelectionGesture)
				onSelectionGesture({ type: "press", shiftKey: false, metaKey: false });
			else if (!active) {
				appearance.emit("select", { selected: true });
				setFocus(true);
			}
			if (isClassicyControlPress(e))
				openClassicyControlPressContextMenu(e.nativeEvent);
			return;
		}
		if (e.button === 0)
			onSelectionGesture?.({
				type: "press",
				shiftKey: e.shiftKey,
				metaKey: e.metaKey,
			});
		if (onFileDrag) {
			if (e.button !== 0) return;
			const el = iconRef.current;
			const dragCallbacks = classicyFileDragAppearanceCallbacks(
				appearance.emit,
			);
			const abandon = startClassicyFileDrag({
				start: { clientX: e.clientX, clientY: e.clientY },
				parts: fileDragParts?.() ?? [
					{ image: el?.querySelector("img"), label: el?.querySelector("p") },
				],
				source: el,
				// The outline drags, not the icon: `dragging` stays off.
				...dragCallbacks,
				onStart: () => {
					pressDraggedRef.current = true;
					dragCallbacks.onStart();
				},
				onDrop: (target, point, outlineTopLeft) => {
					const travel: [number, number] = [
						point[0] - e.clientX,
						point[1] - e.clientY,
					];
					if (onFileDrag(target, point, outlineTopLeft, travel)) return;
					if (positionLocked) return;
					// Dropped back in its own folder: the icon goes where its
					// outline was let go, i.e. it moves as far as the pointer did.
					const next: [number, number] = [
						position[0] + travel[0],
						position[1] + travel[1],
					];
					setPosition(snapTo ? snapToGrid(next, snapTo, snapOrigin) : next);
					setFocus(true);
				},
			});
			endFileDragOnUnmount(abandon);
			return;
		}
		if (positionLocked) return;
		movedWhileDragging.current = false;
		setDragging(true);
		dragEmittedRef.current = true;
		appearance.emit("dragStart");
	};

	const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
		if (holder?.current && dragging && iconRef.current) {
			movedWhileDragging.current = true;
			setFocus(true);
			setPosition([
				e.clientX -
					holder.current.getBoundingClientRect().left -
					iconRef.current.getBoundingClientRect().width / 2,
				e.clientY -
					holder.current.getBoundingClientRect().top -
					iconRef.current.getBoundingClientRect().height / 2,
			]);
		}
	};
	const iconId = useId();

	const labelEl = (
		<p className={classNames(invisible ? "classicyIconInvisible" : "")}>
			{label ? label : name}
		</p>
	);

	// Without `size` the icon draws at the theme's desktop icon size
	// (`--desktop-icon-size`). Rendered at the small-icon size or less, it
	// draws the icon's own small image when it has one; larger draws `icon`.
	const themeIconSize = useAppManager(
		(s) => s.System?.Manager?.Appearance?.activeTheme?.desktop?.iconSize,
	);
	// Selected, the image the active package draws for it selected, when it
	// registers one (`registerClassicySelectedIconImages`) and once it has
	// loaded, marked so its stylesheet draws no selected look of its own over
	// it. The mask keeps the plain image's shape.
	const {
		image,
		plain: iconUrl,
		drawsSelectedImage,
	} = useClassicySelectedIconImage(
		icon,
		size ?? themeIconSize ?? Number.POSITIVE_INFINITY,
		active,
	);
	const iconEl = (
		<div
			className={classNames(
				"classicyIconMaskOuter",
				invisible ? "classicyIconInvisible" : "",
				drawsSelectedImage && "classicyIconSelectedImage",
			)}
			style={{ "--classicy-icon-mask": `url("${iconUrl}")` } as CSSProperties}
		>
			<div className={"classicyIconMask"}>
				{/* Not natively draggable: Firefox would start an HTML drag
				    of the image and stop the mousemoves the icon drags by. */}
				<img src={image} alt={name} draggable={false} />
			</div>
		</div>
	);

	return (
		// biome-ignore lint/a11y/useSemanticElements: icon is a draggable div with ref and complex mouse handling incompatible with <button>
		<div
			{...appearance.attrs}
			role="button"
			tabIndex={0}
			ref={iconRef}
			id={`${id}-${iconId}`}
			draggable={false}
			{...(dropFolderPath === undefined
				? {}
				: { [CLASSICY_DROP_FOLDER_ATTRIBUTE]: dropFolderPath })}
			{...(filePath === undefined
				? {}
				: { [CLASSICY_FILE_PATH_ATTRIBUTE]: filePath })}
			className={classNames(
				"classicyIcon",
				appearance.className,
				labelPositionClass(labelPosition),
				className,
			)}
			style={
				{
					// Package style first: the icon's position is its own (a
					// package never moves it), and only a consumer's wins over it.
					...withoutZIndex(appearance.style),
					left: `${position[0]}px`,
					top: `${position[1]}px`,
					// Every rule in ClassicyIcon.scss that sizes this icon — the
					// container itself, the mask, the mask outer, and the <img> —
					// derives from --desktop-icon-size via var()/calc(), and this
					// element is their common ancestor (custom properties cascade
					// to descendants, not upward), so overriding it here scales
					// all of them together and keeps cleanupIcon's `iconSize * 2`
					// spacing math in sync with what's actually on screen. Omitted
					// when `size` is undefined so the theme's value keeps cascading
					// exactly as it did before this prop existed.
					...(size === undefined ? {} : { "--desktop-icon-size": `${size}px` }),
					...withoutZIndex(style),
				} as CSSProperties
			}
			onClick={toggleFocus}
			onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					doDoubleClick();
				}
			}}
			onMouseDown={startDrag}
			onMouseMove={changeIcon}
			onMouseUp={() => stopChangeIcon(false)}
			onDoubleClick={doDoubleClick}
		>
			{labelPosition === "above" ? labelEl : iconEl}
			{labelPosition === "above" ? iconEl : labelEl}
		</div>
	);
};
