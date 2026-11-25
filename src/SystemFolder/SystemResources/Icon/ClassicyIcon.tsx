import "./ClassicyIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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
import {
	classicyFileDragAppearanceCallbacks,
	useClassicyFileDragEndOnUnmount,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragAppearance.internal";
import { useClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { useClassicySelectedIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicySelectedIconImage.internal";
import { useClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import {
	classicyIconDragThreshold,
	classicyTraveledPast,
	isClassicyGestureButton,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex.internal";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

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
	/**
	 * Controlled selection: whether the icon is drawn selected. Omitted, a
	 * click toggles the icon's own selected look (the icon's original
	 * behavior). Given, the icon draws what it is told, reports each change
	 * to the package as `select`, and a click calls `onSelectClick` instead
	 * (`ClassicyFileBrowser`'s icon view keeps one selection for its icons).
	 */
	selected?: boolean;
	/** With `selected`: a click on the icon (the caller selects). */
	onSelectClick?: (e: MouseEvent<HTMLDivElement>) => void;
	/**
	 * While true, the caption is a text field holding the name, selected, for
	 * the user to rename the item: Return or a click elsewhere commits it
	 * (`onRenameCommit`, with the text as typed), Escape cancels
	 * (`onRenameCancel`). Clicks and keys inside the field stay in it.
	 */
	renaming?: boolean;
	/** With `renaming`: the new name, when committed. */
	onRenameCommit?: (name: string) => void;
	/** With `renaming`: Escape. */
	onRenameCancel?: () => void;
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
 * The caption's text field while an icon is renamed: the name, selected
 * whole, focused once it mounts. Return or a click elsewhere (the field's
 * blur) commits the text once; Escape cancels. Its presses, clicks and keys
 * stop here, so the icon neither drags, selects nor opens under them.
 */
const ClassicyIconRenameField: FunctionalComponent<{
	name: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
}> = ({ name, onCommit, onCancel }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const doneRef = useRef(false);
	useLayoutEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		input.focus({ preventScroll: true });
		input.select();
	}, []);
	const finish = (commit: boolean) => {
		if (doneRef.current) return;
		doneRef.current = true;
		if (commit) onCommit(inputRef.current?.value ?? name);
		else onCancel();
	};
	const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
	return (
		<input
			ref={inputRef}
			className={"classicyIconRename"}
			type={"text"}
			defaultValue={name}
			aria-label={"Name"}
			spellCheck={false}
			onMouseDown={stop}
			onMouseUp={stop}
			onClick={stop}
			onDoubleClick={stop}
			onContextMenu={stop}
			onKeyDown={(e) => {
				e.stopPropagation();
				if (e.key === "Enter") {
					e.preventDefault();
					finish(true);
				} else if (e.key === "Escape") {
					e.preventDefault();
					finish(false);
				}
			}}
			onBlur={() => finish(true)}
		/>
	);
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
 * toggles the selected (highlighted) look; double-click or Enter/Space calls
 * `onClickFunc`. Position and selection are local state — nothing is written
 * to the store. Size follows the theme's `--desktop-icon-size` unless `size`
 * is set. Drawn in a window that is not the active one, the root carries the
 * `inactive` state (`ClassicyWindowActiveContext`), for a package that draws
 * a selection in an inactive window apart. Under a package whose layout says
 * `mouse: "windows"` (Windows 98), an icon without `onFileDrag` drags on
 * button 1 alone and moves only once the pointer is 4 px from the press,
 * keeping where it was grabbed; under `input.escapeCancels`, Escape
 * mid-drag puts it back where the press found it.
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
	selected: selectedProp,
	onSelectClick,
	renaming = false,
	onRenameCommit,
	onRenameCancel,
	className,
	style,
}) => {
	const [position, setPosition] = useState<[number, number]>(initialPosition);
	const [dragging, setDragging] = useState<boolean>(false);
	const [ownSelected, setActive] = useState<boolean>(false);
	// Controlled (`selected` given): the caller's selection; else the icon's own.
	const controlled = selectedProp !== undefined;
	const active = controlled ? selectedProp : ownSelected;

	// Whether the pointer actually moved the icon between mousedown and mouseup.
	// A ref, not state: it must be readable inside the same mouseup that clears
	// it, and it never affects what is rendered.
	const movedWhileDragging = useRef<boolean>(false);
	// The press discipline (`layout.mouse`, Escape's cancel): the active
	// package's layout.
	const layout = useClassicyAppearanceLayout();
	// The press of a drag of the icon itself: where the pointer went down
	// and where the icon was then, for the drag threshold, the grab offset
	// and Escape.
	const pressRef = useRef<{
		point: [number, number];
		position: [number, number];
	}>({ point: [0, 0], position: [0, 0] });

	const iconRef = useRef<HTMLDivElement>(null);
	// `inactive` while the window the icon is drawn in is not the active one
	// (outside a window, never), as ClassicyScrollArea reads it: Windows 98
	// draws an inactive list view's selected item apart (LVS_SHOWSELALWAYS).
	const inactive = useContext(ClassicyWindowActiveContext) === false;
	const appearance = useClassicyAppearance(
		"Icon",
		{ dragging, selected: active, inactive },
		iconRef,
	);
	// One dragEnd per dragStart: mouseup also ends presses that never dragged.
	const dragEmittedRef = useRef(false);
	// A file drag in progress ends (canceled) before the icon unmounts.
	const endFileDragOnUnmount = useClassicyFileDragEndOnUnmount();

	const id = `${appId}.shortcut`;

	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyIcon", appId, name, icon, label };

	const toggleFocus = () => {
		track("focus", analyticsArgs);
		appearance.emit("select", { selected: !active });
		setActive(!active);
	};
	// Controlled, the icon reports each change of the selection it is given
	// (a click, the keyboard, a selection rectangle, Select All), never the
	// first render's.
	const reportedSelectedRef = useRef(active);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `active` is the trigger; emit closes over the package's hooks only
	useEffect(() => {
		if (!controlled || reportedSelectedRef.current === active) return;
		reportedSelectedRef.current = active;
		appearance.emit("select", { selected: active });
	}, [active, controlled]);
	const onClick = (e: MouseEvent<HTMLDivElement>) => {
		if (!controlled) {
			toggleFocus();
			return;
		}
		track("focus", analyticsArgs);
		onSelectClick?.(e);
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
		if (renaming) return;
		if (onClickFunc) {
			// A double-click or Enter/Space.
			appearance.emit("open", withClassicyAppearanceInput());
			// Controlled, the selection is the caller's to keep.
			if (!controlled) clearFocus();
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

	// Escape mid-drag, under a package whose layout says
	// `input.escapeCancels` (Windows 98; WIG Ch.4 "Shortcut Keys", p.27):
	// the icon goes back where the press found it, and the drag ends there.
	useClassicyEscapeCancel(dragging, () => {
		if (movedWhileDragging.current) setPosition(pressRef.current.position);
		movedWhileDragging.current = false;
		setDragging(false);
		if (dragEmittedRef.current) {
			dragEmittedRef.current = false;
			appearance.emit("dragEnd", { lost: false, canceled: true });
		}
	});

	const startDrag = (e: MouseEvent<HTMLDivElement>) => {
		if (renaming) return;
		if (onFileDrag) {
			if (e.button !== 0) return;
			const el = iconRef.current;
			// Where the icons' holder is on screen at the press: the folder's
			// contents may scroll under the drag (its window auto-scrolls near
			// an edge, or the wheel turns), carrying the holder with them.
			const holderAtPress = holder?.current?.getBoundingClientRect();
			const abandon = startClassicyFileDrag({
				start: { clientX: e.clientX, clientY: e.clientY },
				parts: [
					{ image: el?.querySelector("img"), label: el?.querySelector("p") },
				],
				source: el,
				// The outline drags, not the icon: `dragging` stays off.
				...classicyFileDragAppearanceCallbacks(appearance.emit),
				onDrop: (target, point, outlineTopLeft) => {
					if (onFileDrag(target, point, outlineTopLeft)) return;
					if (positionLocked) return;
					// Dropped back in its own folder: the icon goes where its
					// outline was let go, i.e. it moves as far as the pointer did
					// across the contents, less however far they scrolled.
					const holderNow = holder?.current?.getBoundingClientRect();
					const scrolled =
						holderAtPress && holderNow
							? [
									holderNow.left - holderAtPress.left,
									holderNow.top - holderAtPress.top,
								]
							: [0, 0];
					const next: [number, number] = [
						position[0] + point[0] - e.clientX - scrolled[0],
						position[1] + point[1] - e.clientY - scrolled[1],
					];
					setPosition(snapTo ? snapToGrid(next, snapTo, snapOrigin) : next);
					setFocus(true);
				},
			});
			endFileDragOnUnmount(abandon);
			return;
		}
		if (positionLocked) return;
		// Under `layout.mouse` "windows" only button 1 drags (WIG Ch.4 "Mouse
		// Actions", pp.24-25).
		if (!isClassicyGestureButton(e, layout)) return;
		movedWhileDragging.current = false;
		pressRef.current = { point: [e.clientX, e.clientY], position };
		setDragging(true);
		dragEmittedRef.current = true;
		appearance.emit("dragStart");
	};

	const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
		if (holder?.current && dragging && iconRef.current) {
			// Under `layout.mouse` "windows" the icon moves only once the
			// pointer is 4 px from the press (Windows' drag rectangle), and
			// keeps where it was grabbed; else it centers under the pointer
			// from the first move.
			const threshold = classicyIconDragThreshold(layout);
			const press = pressRef.current;
			if (
				!movedWhileDragging.current &&
				!classicyTraveledPast(press.point, [e.clientX, e.clientY], threshold)
			) {
				return;
			}
			movedWhileDragging.current = true;
			setFocus(true);
			if (threshold > 0) {
				setPosition([
					press.position[0] + e.clientX - press.point[0],
					press.position[1] + e.clientY - press.point[1],
				]);
				return;
			}
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

	const labelEl = renaming ? (
		<ClassicyIconRenameField
			name={name}
			onCommit={(value) => onRenameCommit?.(value)}
			onCancel={() => onRenameCancel?.()}
		/>
	) : (
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
				<img src={image} alt={name} />
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
			onClick={onClick}
			onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
				if (renaming) return;
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
