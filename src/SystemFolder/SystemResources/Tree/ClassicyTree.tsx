import "./ClassicyTree.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEventHandler,
	type MutableRefObject,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import {
	classicyListPageOf,
	classicyListScroller,
	classicyPageKeysMove,
	classicyScrollListBy,
	classicyTreeScrollChord,
	classicyWindowsTreeKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { useListNavigation } from "@/SystemFolder/SystemResources/Keyboard/useListNavigation";
import {
	ClassicyTriangle,
	type ClassicyTriangleDirection,
} from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";
import { classicySelectsOnPress } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

/**
 * Configuration for the small ClassicyButton rendered to the right of a leaf
 * node's label. Every prop is a pass-through to ClassicyButton so callers can
 * wire up callbacks and drive the button's visual states.
 */
export type ClassicyTreeNodeButton = {
	/** Button contents (typically a short label). */
	label: ReactNode;
	/** Fired when the button is clicked. */
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	/** Renders the button in its primary/default style. */
	isDefault?: boolean;
	/** Disables the button. */
	disabled?: boolean;
	/** Holds the button in its pressed/active visual state. */
	depressed?: boolean;
};

export type ClassicyTreeSelectionMode = "none" | "single" | "multi";

export type ClassicyTreeNode = {
	/** Stable identifier for the node. */
	id: string;
	/** Text label displayed for the node. */
	label: string;
	/** Icon placed immediately to the left of the label. */
	leftIcon?: string;
	/** Icon pinned to the far right of the node's row. */
	rightIcon?: string;
	/** Child nodes. A node with children is a branch; otherwise it is a leaf. */
	children?: ClassicyTreeNode[];
	/**
	 * Whether a branch node starts expanded. Read once on mount; later
	 * expansion is tracked by the tree itself.
	 */
	defaultOpen?: boolean;
	/**
	 * Leaf-only: a single small button (kept for back-compat; `buttons` wins if
	 * both set). `button: b` renders the same as `buttons: [b]`.
	 */
	button?: ClassicyTreeNodeButton;
	/** Leaf-only: multiple small buttons rendered right of the label. */
	buttons?: ClassicyTreeNodeButton[];
	/** Grayed out; not clickable; branches also refuse to toggle. */
	disabled?: boolean;
	/** Leaf-only: opt out of selection while staying enabled-looking. Defaults to `true`. */
	selectable?: boolean;
	/**
	 * Branch-only: single-click fires onSelectNode (like a leaf) instead of
	 * toggling open/closed; double-click still toggles. Default false, which
	 * preserves the original click-to-toggle behavior for plain navigation
	 * trees (e.g. the Open dialog, where folders are never selection targets).
	 */
	branchSelectable?: boolean;
};

type ClassicyTreeProps = {
	/** The top-level nodes; each may nest further nodes in `children`. */
	nodes: ClassicyTreeNode[];
	/** Direction the disclosure triangle points when collapsed. Defaults to `"right"`. */
	direction?: ClassicyTriangleDirection;
	/** Fired whenever a branch node is expanded or collapsed. */
	onToggleNode?: (id: string, open: boolean) => void;
	/**
	 * `"none"` (the default) makes rows navigation-only. `"single"` and
	 * `"multi"` both make enabled leaves (and `branchSelectable` branches)
	 * report clicks and Enter/Space through `onSelectNode`; the tree does not
	 * enforce the difference — the owner decides how to update `selectedIds`.
	 */
	selectionMode?: ClassicyTreeSelectionMode;
	/**
	 * Ids of the highlighted nodes. Fully controlled: the tree keeps no
	 * selection of its own, so update this from `onSelectNode`.
	 */
	selectedIds?: string[];
	/**
	 * Fired when a selectable node is clicked or chosen with Enter/Space;
	 * under a package whose layout says `selection.selectOn: "press"`
	 * (Windows 98), at its button-1 press instead (`e` is the `mousedown`),
	 * the click that ends it firing nothing.
	 */
	onSelectNode?: (
		id: string,
		node: ClassicyTreeNode,
		e: ReactMouseEvent | ReactKeyboardEvent,
	) => void;
	/** Fired when a selectable leaf is double-clicked — the "open it" gesture. */
	onActivateNode?: (id: string, node: ClassicyTreeNode) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
};

/** A single row in the flattened (currently-visible) view of the tree. */
type FlatTreeRow = {
	id: string;
	node: ClassicyTreeNode;
	depth: number;
	hasChildren: boolean;
	open: boolean;
	/** The branch the row hangs under; absent at the root. */
	parentId?: string;
};

const nodeHasChildren = (node: ClassicyTreeNode): boolean =>
	Array.isArray(node.children) && node.children.length > 0;

/** Collect the ids of every branch whose `defaultOpen` is set. */
function collectDefaultOpen(
	nodes: ClassicyTreeNode[],
	acc: Set<string> = new Set(),
): Set<string> {
	for (const node of nodes) {
		if (nodeHasChildren(node) && node.defaultOpen) {
			acc.add(node.id);
		}
		if (node.children) {
			collectDefaultOpen(node.children, acc);
		}
	}
	return acc;
}

/** Depth-first pre-order flatten of the rows the user can currently see. */
function flattenVisible(
	nodes: ClassicyTreeNode[],
	openSet: Set<string>,
	depth = 0,
	acc: FlatTreeRow[] = [],
	parentId?: string,
): FlatTreeRow[] {
	for (const node of nodes) {
		const hasChildren = nodeHasChildren(node);
		const open = hasChildren && openSet.has(node.id);
		acc.push({ id: node.id, node, depth, hasChildren, open, parentId });
		if (open && node.children) {
			flattenVisible(node.children, openSet, depth + 1, acc, node.id);
		}
	}
	return acc;
}

// The roving-tabindex "active" row that drives keyboard navigation (arrow
// keys, Home/End, type-select) is a purely mechanical focus concern, kept
// deliberately separate from `selectedIds` below — a row can be the
// keyboard's current tab stop without being selected (e.g. selectionMode
// "none"), and a controlled `selectedIds` set from a parent never needs to
// touch it. `focus` (not `select`) names the setter to keep that distinction
// visible at the call site.
type SharedRowContext = {
	direction: ClassicyTriangleDirection;
	openSet: Set<string>;
	tabStopId?: string;
	toggle: (id: string) => void;
	focus: (id: string) => void;
	registerRef: (id: string, el: HTMLDivElement | null) => void;
	selectionMode: ClassicyTreeSelectionMode;
	selectedIds: string[];
	onSelectNode?: (
		id: string,
		node: ClassicyTreeNode,
		e: ReactMouseEvent | ReactKeyboardEvent,
	) => void;
	onActivateNode?: (id: string, node: ClassicyTreeNode) => void;
	/**
	 * Whether a selectable row is chosen at its button-1 press
	 * (`layout.selection.selectOn` "press") rather than at its click.
	 */
	selectOnPress: boolean;
	/** The row such a press last chose, for the click ending it to skip. */
	pressedRef: MutableRefObject<string | null>;
};

/**
 * A selectable row's press under `selectOnPress` (WIG Ch.5 "Selection with
 * the Mouse", pp.37-38; comctl32's tree view selects on WM_LBUTTONDOWN):
 * button 1 chooses it at once; the second press of a double-click changes
 * nothing (Win32's WM_LBUTTONDBLCLK), the double-click still opening or
 * toggling it.
 */
const pressSelectableRow = (
	ctx: SharedRowContext,
	node: ClassicyTreeNode,
	e: ReactMouseEvent,
) => {
	if (!ctx.selectOnPress || e.button !== 0) return;
	ctx.pressedRef.current = node.id;
	if (e.detail > 1) return;
	ctx.onSelectNode?.(node.id, node, e);
};

/** Whether a click ends a press that already chose its row (and clears it). */
const clickEndsPress = (ctx: SharedRowContext, node: ClassicyTreeNode) => {
	const pressed = ctx.pressedRef.current === node.id;
	ctx.pressedRef.current = null;
	return pressed;
};

type ClassicyTreeNodeItemProps = {
	node: ClassicyTreeNode;
	depth: number;
	ctx: SharedRowContext;
};

const ClassicyTreeNodeItem: FunctionalComponent<ClassicyTreeNodeItemProps> = ({
	node,
	depth,
	ctx,
}) => {
	const hasChildren = nodeHasChildren(node);
	const open = hasChildren && ctx.openSet.has(node.id);
	const isTabStop = ctx.tabStopId === node.id;

	const canSelect =
		!hasChildren &&
		ctx.selectionMode !== "none" &&
		node.selectable !== false &&
		!node.disabled;
	const isSelected = !hasChildren && ctx.selectedIds.includes(node.id);
	const canSelectBranch =
		hasChildren &&
		ctx.selectionMode !== "none" &&
		node.branchSelectable === true &&
		!node.disabled;
	const isBranchSelected = hasChildren && ctx.selectedIds.includes(node.id);
	const leafButtons = node.buttons ?? (node.button ? [node.button] : []);

	const rowInner = (
		<>
			<span className={"classicyTreeNodeDisclosure"}>
				{hasChildren && (
					<ClassicyTriangle
						direction={ctx.direction}
						open={open}
						interactive={false}
					/>
				)}
			</span>
			{node.leftIcon && (
				<ClassicyIconImage
					className={"classicyTreeNodeIcon"}
					src={node.leftIcon}
					// A row that cannot be chosen dims its icon by the package's
					// `iconDimming.disabledItem` rule, where it declares one.
					dimmed={node.disabled ? "disabledItem" : false}
					alt={""}
					aria-hidden={true}
				/>
			)}
			<span className={"classicyTreeNodeLabel"}>{node.label}</span>
		</>
	);

	const registerRef = (el: HTMLDivElement | null) =>
		ctx.registerRef(node.id, el);
	const onFocus = () => ctx.focus(node.id);

	return (
		<li className={"classicyTreeNode"}>
			<div
				className={"classicyTreeNodeRow"}
				style={{
					paddingLeft: `calc(var(--window-control-size) * ${depth})`,
				}}
			>
				{hasChildren ? (
					// biome-ignore lint/a11y/useSemanticElements: disclosure region is a flex container with svg/img/span children incompatible with <button>
					// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling (Enter/Space/arrows/type-select) lives on the list container that owns this row
					<div
						role="button"
						aria-expanded={open}
						aria-pressed={canSelectBranch ? isBranchSelected : undefined}
						tabIndex={isTabStop ? 0 : -1}
						ref={registerRef}
						className={classNames(
							"classicyTreeNodeLabelHolder classicyTreeNodeBranch",
							classicyStateClasses({
								disabled: node.disabled,
								selected: canSelectBranch && isBranchSelected,
							}),
						)}
						onMouseDown={(e) => {
							if (canSelectBranch) pressSelectableRow(ctx, node, e);
						}}
						onClick={(e) => {
							if (node.disabled) return;
							// A branch opted into selection (e.g. the Save dialog's
							// folder-target tree) is picked with a single click
							// (or its press, under `selectOn` "press");
							// double-click still expands/collapses it below.
							if (canSelectBranch) {
								if (clickEndsPress(ctx, node)) return;
								ctx.onSelectNode?.(node.id, node, e);
								return;
							}
							ctx.toggle(node.id);
						}}
						onDoubleClick={() => {
							if (!node.disabled) ctx.toggle(node.id);
						}}
						onFocus={onFocus}
					>
						{rowInner}
					</div>
				) : canSelect ? (
					// biome-ignore lint/a11y/useSemanticElements: selectable row is a flex container with svg/img/span children incompatible with <button>
					// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling (Enter/Space) lives on the list container that owns this row
					<div
						role="button"
						tabIndex={isTabStop ? 0 : -1}
						aria-pressed={isSelected}
						ref={registerRef}
						className={classNames(
							"classicyTreeNodeLabelHolder",
							"classicyTreeNodeLeaf",
							"classicyTreeNodeSelectable",
							classicyStateClasses({ selected: isSelected }),
						)}
						onMouseDown={(e) => pressSelectableRow(ctx, node, e)}
						onClick={(e) => {
							if (clickEndsPress(ctx, node)) return;
							ctx.onSelectNode?.(node.id, node, e);
						}}
						onDoubleClick={() => ctx.onActivateNode?.(node.id, node)}
						onFocus={onFocus}
					>
						{rowInner}
					</div>
				) : (
					// biome-ignore lint/a11y/noStaticElementInteractions: list-box leaf row is a focus target for arrow-key navigation and type-selection
					<div
						tabIndex={isTabStop ? 0 : -1}
						ref={registerRef}
						className={classNames(
							"classicyTreeNodeLabelHolder",
							"classicyTreeNodeLeaf",
							classicyStateClasses({
								disabled: node.disabled,
								selected: isSelected,
							}),
						)}
						onFocus={onFocus}
					>
						{rowInner}
					</div>
				)}
				{!hasChildren &&
					leafButtons.map((b, i) => (
						<ClassicyButton
							// biome-ignore lint/suspicious/noArrayIndexKey: buttons array is static per node
							key={i}
							buttonSize={"small"}
							margin={"sm"}
							isDefault={b.isDefault}
							disabled={b.disabled}
							depressed={b.depressed}
							onClickFunc={(e: ReactMouseEvent<HTMLButtonElement>) => {
								e.stopPropagation();
								b.onClickFunc?.(e);
							}}
						>
							{b.label}
						</ClassicyButton>
					))}
				{node.rightIcon && (
					<ClassicyIconImage
						className={"classicyTreeNodeIconRight"}
						src={node.rightIcon}
						alt={""}
						aria-hidden={true}
					/>
				)}
			</div>
			{hasChildren && open && (
				<ul className={"classicyTreeGroup"}>
					{node.children?.map((child) => (
						<ClassicyTreeNodeItem
							key={child.id}
							node={child}
							depth={depth + 1}
							ctx={ctx}
						/>
					))}
				</ul>
			)}
		</li>
	);
};

/**
 * A hierarchical outline list: branches with Mac OS 8 disclosure triangles
 * (pointing right when closed, down when open — HIGOS8 Ch.2 "Disclosure
 * Triangles", p.37) and leaves that can carry icons and small push buttons.
 * Use it in place of an interactive nested `<ul>` / `<li>`; plain static lists
 * can stay raw HTML. For multi-column data with sortable headers use
 * `ClassicyTable` with `getSubRows` instead.
 *
 * Expansion is uncontrolled (seeded from each node's `defaultOpen`, reported
 * through `onToggleNode`); selection is fully controlled through
 * `selectedIds`. Clicking a branch toggles it unless it is
 * `branchSelectable`, in which case a click selects and a double-click
 * toggles. Keyboard: Up/Down, Home/End and type-select move focus through
 * the visible rows (without selecting), ⌘→ / ⌘← open and close the focused
 * branch, and Enter/Space toggles a branch or selects a leaf. Under a
 * package whose layout declares `tree.keys: "windows"` (Windows 98; WIG
 * Ch.7 "Tree View Controls", pp.123-124) a bare Right Arrow also expands a
 * closed branch or moves to an open one's first child, and a bare Left
 * Arrow collapses an open branch or moves to the row's parent. Under
 * `selection.selectOn: "press"` (Windows 98; WIG Ch.5 "Selection with the
 * Mouse", pp.37-38) a selectable leaf or branch is chosen at its button-1
 * press, the click ending it choosing nothing more; button 2 never chooses.
 * Under `selection.pageKeys: "move"` (Windows 98; WIG Ch.5 Table 5.1,
 * pp.35-36) Page Up and Page Down move the keyboard row to the first or
 * last row shown, or a page further; under `tree.keys: "windows"` Control
 * (or ⌘) with an arrow, Home, End, Page Up or Page Down scrolls the tree's
 * scroller instead of moving or toggling anything, as comctl32's tree view
 * takes them (`TREEVIEW_ScrollKeyDown`; WIG App. B Table B.1, p.357).
 * Drawn in a window that is not the active one, the root carries the
 * `inactive` state (`ClassicyWindowActiveContext`), as `ClassicyScrollArea`
 * does.
 *
 * ```tsx
 * <ClassicyTree
 *     nodes={nodes}
 *     selectionMode="single"
 *     selectedIds={selected}
 *     onSelectNode={(id) => setSelected([id])}
 * />
 * ```
 */
export const ClassicyTree: FunctionalComponent<ClassicyTreeProps> = ({
	nodes,
	direction = "right",
	onToggleNode,
	selectionMode = "none",
	selectedIds,
	onSelectNode,
	onActivateNode,
	className,
	style,
}) => {
	const [openSet, setOpenSet] = useState<Set<string>>(() =>
		collectDefaultOpen(nodes),
	);

	const visible = useMemo(
		() => flattenVisible(nodes, openSet),
		[nodes, openSet],
	);

	// Roving tabindex + arrow/Home/End/type-select over the visible rows —
	// see the SharedRowContext comment above for why the active row is kept
	// separate from `selectedIds`.
	// Windows' tree view takes the bare arrows along a branch, and scrolls on
	// the Control chords (`tree.keys`); Mac OS 8's list views took ⌘→ / ⌘←
	// alone. It chooses a row at the press (`selection.selectOn`), Mac OS
	// 8's at the click, and moves a page on the page keys
	// (`selection.pageKeys`), where Mac OS 8's scrolled.
	const layout = useClassicyAppearanceLayout();
	const windowsKeys = classicyWindowsTreeKeys(layout);
	const selectOnPress = classicySelectsOnPress(layout);
	const pageKeysMove = classicyPageKeysMove(layout);
	const pressedRef = useRef<string | null>(null);

	const rootRef = useRef<HTMLUListElement>(null);
	const navRows = useMemo(
		() => visible.map((r) => ({ id: r.id, label: r.node.label })),
		[visible],
	);
	const {
		activeId,
		setActiveId,
		tabStopId,
		registerRef,
		selectRow,
		handleNavKey,
	} = useListNavigation(
		navRows,
		pageKeysMove
			? {
					pageRows: () =>
						classicyListPageOf(
							rootRef.current?.querySelector(".classicyTreeNodeLabelHolder"),
						)?.pageRows ?? 1,
				}
			: undefined,
	);
	// The root's one state: `inactive` while the window it is drawn in is not
	// the active one (as ClassicyScrollArea reads it; outside a window,
	// never), so a package can draw the selection as an inactive window's
	// (Windows 98: ButtonFace, as TVS_SHOWSELALWAYS draws it). Row states
	// stay on the rows.
	const inactive = useContext(ClassicyWindowActiveContext) === false;
	const appearance = useClassicyAppearance("Tree", { inactive }, rootRef);
	const emitAppearance = appearance.emit;

	// Every expansion path (click, double-click, ⌘→/⌘←, Enter/Space) runs here.
	const setOpen = useCallback(
		(id: string, open: boolean) => {
			setOpenSet((prev) => {
				const next = new Set(prev);
				if (open) next.add(id);
				else next.delete(id);
				return next;
			});
			emitAppearance(
				open ? "expand" : "collapse",
				withClassicyAppearanceInput({ nodeId: id, open }),
			);
			onToggleNode?.(id, open);
		},
		[onToggleNode, emitAppearance],
	);

	const toggle = useCallback(
		(id: string) => {
			setOpen(id, !openSet.has(id));
		},
		[openSet, setOpen],
	);

	const resolvedSelectedIds = selectedIds ?? [];

	// Every selection path (a click on a leaf or selectable branch, Enter or
	// Space on the focused row) runs here.
	const selectNode = useCallback(
		(
			id: string,
			node: ClassicyTreeNode,
			e: ReactMouseEvent | ReactKeyboardEvent,
		) => {
			emitAppearance("select", withClassicyAppearanceInput({ nodeId: id }));
			onSelectNode?.(id, node, e);
		},
		[emitAppearance, onSelectNode],
	);

	const ctx: SharedRowContext = {
		direction,
		openSet,
		tabStopId,
		toggle,
		focus: setActiveId,
		registerRef,
		selectionMode,
		selectedIds: resolvedSelectedIds,
		onSelectNode: selectNode,
		onActivateNode,
		selectOnPress,
		pressedRef,
	};

	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent<HTMLUListElement>) => {
			if (visible.length === 0) return;
			// Windows: Control (or ⌘) with a navigation key scrolls the view,
			// the keyboard row and the selection staying where they are
			// (TREEVIEW_KeyDown hands every Control key to
			// TREEVIEW_ScrollKeyDown); so the chords no longer open or close
			// a branch, which the bare arrows do.
			if (windowsKeys && (e.ctrlKey || e.metaKey) && !e.altKey) {
				const scroller = classicyListScroller(rootRef.current);
				const line = rootRef.current?.querySelector(".classicyTreeNodeRow");
				const delta = classicyTreeScrollChord(e.key, {
					rowHeight: line?.getBoundingClientRect().height ?? 0,
					scrollTop: scroller?.scrollTop ?? 0,
					scrollHeight: scroller?.scrollHeight ?? 0,
					clientHeight: scroller?.clientHeight ?? 0,
				});
				if (delta) {
					e.preventDefault();
					classicyScrollListBy(rootRef.current, delta[0], delta[1]);
					return;
				}
			}
			// Arrow/Home/End/type-select (and the page keys, under
			// `pageKeys` "move") are the shared list-navigation keys;
			// everything after this is tree-specific (expansion, selection).
			if (handleNavKey(e) !== null) return;
			const curIndex = activeId
				? visible.findIndex((r) => r.id === activeId)
				: -1;
			const current = curIndex >= 0 ? visible[curIndex] : undefined;

			// A bare arrow (Shift allowed, as comctl32 ignores it; Alt is the
			// browser's history chord) under Windows' tree keys.
			const bareArrow = windowsKeys && !e.metaKey && !e.ctrlKey && !e.altKey;

			switch (e.key) {
				case "ArrowRight": {
					// Command-Right: open the focused branch (HIG list-view equivalent).
					if (
						(e.metaKey || e.ctrlKey) &&
						current?.hasChildren &&
						!current.open &&
						!current.node.disabled
					) {
						e.preventDefault();
						setOpen(current.id, true);
						return;
					}
					// Windows: expand a closed branch, else move to its first
					// child (the row after it, the flattening being pre-order);
					// a leaf stays where it is (TREEVIEW_KeyDown's VK_RIGHT).
					if (bareArrow && current) {
						e.preventDefault();
						if (!current.hasChildren) return;
						if (!current.open) {
							if (!current.node.disabled) setOpen(current.id, true);
							return;
						}
						const child = visible[curIndex + 1];
						if (child && child.parentId === current.id) selectRow(child.id);
					}
					return;
				}
				case "ArrowLeft": {
					// Command-Left: close the focused branch (HIG list-view equivalent).
					if (
						(e.metaKey || e.ctrlKey) &&
						current?.hasChildren &&
						current.open &&
						!current.node.disabled
					) {
						e.preventDefault();
						setOpen(current.id, false);
						return;
					}
					// Windows: collapse an open branch, else move to the parent
					// (VK_LEFT); at the root a closed row stays. A dimmed branch,
					// which refuses to toggle, moves to its parent instead.
					if (bareArrow && current) {
						e.preventDefault();
						if (current.hasChildren && current.open && !current.node.disabled) {
							setOpen(current.id, false);
							return;
						}
						if (current.parentId !== undefined) selectRow(current.parentId);
					}
					return;
				}
				case "Enter":
				case " ": {
					if (!current) return;
					if (current.hasChildren) {
						if (current.node.disabled) return;
						// Mirror the click handler: a selectable branch is picked
						// with Enter/Space rather than toggled.
						const canSelectBranch =
							selectionMode !== "none" &&
							current.node.branchSelectable === true;
						e.preventDefault();
						if (canSelectBranch) {
							selectNode(current.id, current.node, e);
						} else {
							toggle(current.id);
						}
						return;
					}
					// Leaf: honor the same selectability rules as a mouse click.
					const canSelect =
						selectionMode !== "none" &&
						current.node.selectable !== false &&
						!current.node.disabled;
					if (canSelect) {
						e.preventDefault();
						selectNode(current.id, current.node, e);
					}
					return;
				}
			}
		},
		[
			visible,
			activeId,
			handleNavKey,
			windowsKeys,
			selectRow,
			setOpen,
			toggle,
			selectionMode,
			selectNode,
		],
	);

	return (
		<ul
			{...appearance.attrs}
			ref={rootRef}
			className={classNames("classicyTree", appearance.className, className)}
			style={appearance.style ? { ...appearance.style, ...style } : style}
			onKeyDown={handleKeyDown}
		>
			{nodes.map((node) => (
				<ClassicyTreeNodeItem key={node.id} node={node} depth={0} ctx={ctx} />
			))}
		</ul>
	);
};
