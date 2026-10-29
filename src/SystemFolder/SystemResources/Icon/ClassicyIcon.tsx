import "./ClassicyIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useId,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
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
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex";

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
	 * none); return `false` to have the icon move to where its outline was let
	 * go — a drop back in its own folder — or `true` when the drop was handled
	 * (or refused) elsewhere and the icon stays put.
	 */
	onFileDrag?: (
		target: ClassicyFileDropTarget | null,
		point: [number, number],
		outlineTopLeft: [number, number],
	) => boolean;
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
 * toggles the selected (highlighted) look; double-click or Enter/Space calls
 * `onClickFunc`. Position and selection are local state — nothing is written
 * to the store. Size follows the theme's `--desktop-icon-size` unless `size`
 * is set.
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
	className,
	style,
}) => {
	const [position, setPosition] = useState<[number, number]>(initialPosition);
	const [dragging, setDragging] = useState<boolean>(false);
	const [active, setActive] = useState<boolean>(false);

	// Whether the pointer actually moved the icon between mousedown and mouseup.
	// A ref, not state: it must be readable inside the same mouseup that clears
	// it, and it never affects what is rendered.
	const movedWhileDragging = useRef<boolean>(false);

	const iconRef = useRef<HTMLDivElement>(null);
	const appearance = useClassicyAppearance(
		"Icon",
		{ dragging, selected: active },
		iconRef,
	);
	// One dragEnd per dragStart: mouseup also ends presses that never dragged.
	const dragEmittedRef = useRef(false);

	const id = `${appId}.shortcut`;

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyIcon", appId, name, icon, label };

	const toggleFocus = () => {
		track("focus", analyticsArgs);
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

	const stopChangeIcon = () => {
		// Gated on a real drag: mouseup also ends a bare click, and Mac OS 8 never
		// moved an icon you only clicked to select it.
		if (snapTo && movedWhileDragging.current) {
			setPosition((p) => snapToGrid(p, snapTo, snapOrigin));
		}
		movedWhileDragging.current = false;
		setDragging(false);
		if (dragEmittedRef.current) {
			dragEmittedRef.current = false;
			appearance.emit("dragEnd");
		}
	};

	const startDrag = (e: MouseEvent<HTMLDivElement>) => {
		if (onFileDrag) {
			if (e.button !== 0) return;
			const el = iconRef.current;
			startClassicyFileDrag({
				start: { clientX: e.clientX, clientY: e.clientY },
				parts: [
					{ image: el?.querySelector("img"), label: el?.querySelector("p") },
				],
				source: el,
				onDrop: (target, point, outlineTopLeft) => {
					if (onFileDrag(target, point, outlineTopLeft)) return;
					if (positionLocked) return;
					// Dropped back in its own folder: the icon goes where its
					// outline was let go, i.e. it moves as far as the pointer did.
					const next: [number, number] = [
						position[0] + point[0] - e.clientX,
						position[1] + point[1] - e.clientY,
					];
					setPosition(snapTo ? snapToGrid(next, snapTo, snapOrigin) : next);
					setFocus(true);
				},
			});
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

	const iconEl = (
		<div
			className={classNames(
				"classicyIconMaskOuter",
				invisible ? "classicyIconInvisible" : "",
			)}
			style={{ "--classicy-icon-mask": `url(${icon})` } as CSSProperties}
		>
			<div className={"classicyIconMask"}>
				<img src={icon} alt={name} />
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
			onMouseUp={stopChangeIcon}
			onDoubleClick={doDoubleClick}
		>
			{labelPosition === "above" ? labelEl : iconEl}
			{labelPosition === "above" ? iconEl : labelEl}
		</div>
	);
};
