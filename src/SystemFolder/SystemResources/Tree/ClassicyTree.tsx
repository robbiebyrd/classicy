import "./ClassicyTree.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type MouseEventHandler,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	ClassicyTriangle,
	type ClassicyTriangleDirection,
} from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";

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
	/** Whether a branch node starts expanded. */
	defaultOpen?: boolean;
	/** Leaf-only: a single small button (kept for back-compat; `buttons` wins if both set). */
	button?: ClassicyTreeNodeButton;
	/** Leaf-only: multiple small buttons rendered right of the label. */
	buttons?: ClassicyTreeNodeButton[];
	/** Grayed out; not clickable; branches also refuse to toggle. */
	disabled?: boolean;
	/** Leaf-only: opt out of selection while staying enabled-looking. Default true. */
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
	nodes: ClassicyTreeNode[];
	/** Direction the disclosure triangle points when collapsed. */
	direction?: ClassicyTriangleDirection;
	/** Fired whenever a branch node is expanded or collapsed. */
	onToggleNode?: (id: string, open: boolean) => void;
	selectionMode?: ClassicyTreeSelectionMode;
	selectedIds?: string[];
	onSelectNode?: (
		id: string,
		node: ClassicyTreeNode,
		e: ReactMouseEvent | ReactKeyboardEvent,
	) => void;
	onActivateNode?: (id: string, node: ClassicyTreeNode) => void;
};

/** A single row in the flattened (currently-visible) view of the tree. */
type FlatTreeRow = {
	id: string;
	node: ClassicyTreeNode;
	depth: number;
	hasChildren: boolean;
	open: boolean;
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
): FlatTreeRow[] {
	for (const node of nodes) {
		const hasChildren = nodeHasChildren(node);
		const open = hasChildren && openSet.has(node.id);
		acc.push({ id: node.id, node, depth, hasChildren, open });
		if (open && node.children) {
			flattenVisible(node.children, openSet, depth + 1, acc);
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
				<img
					className={"classicyTreeNodeIcon"}
					src={node.leftIcon}
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
							{
								classicyTreeNodeDisabled: node.disabled,
								classicyTreeNodeSelected: canSelectBranch && isBranchSelected,
							},
						)}
						onClick={(e) => {
							if (node.disabled) return;
							// A branch opted into selection (e.g. the Save dialog's
							// folder-target tree) is picked with a single click;
							// double-click still expands/collapses it below.
							if (canSelectBranch) {
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
							{
								classicyTreeNodeSelected: isSelected,
							},
						)}
						onClick={(e) => ctx.onSelectNode?.(node.id, node, e)}
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
							{
								classicyTreeNodeDisabled: node.disabled,
								classicyTreeNodeSelected: isSelected,
							},
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
					<img
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

const isPrintableChar = (e: ReactKeyboardEvent): boolean =>
	e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

export const ClassicyTree: FunctionalComponent<ClassicyTreeProps> = ({
	nodes,
	direction = "right",
	onToggleNode,
	selectionMode = "none",
	selectedIds,
	onSelectNode,
	onActivateNode,
}) => {
	const [openSet, setOpenSet] = useState<Set<string>>(() =>
		collectDefaultOpen(nodes),
	);
	// The row currently driving the roving tabindex — see the SharedRowContext
	// comment above for why this is kept separate from `selectedIds`.
	const [activeId, setActiveId] = useState<string | undefined>();

	const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const typeBuffer = useRef("");
	const typeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const visible = useMemo(
		() => flattenVisible(nodes, openSet),
		[nodes, openSet],
	);

	const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
		if (el) rowRefs.current.set(id, el);
		else rowRefs.current.delete(id);
	}, []);

	const focusRow = useCallback((id: string) => {
		rowRefs.current.get(id)?.focus();
	}, []);

	const selectRow = useCallback(
		(id: string) => {
			setActiveId(id);
			focusRow(id);
		},
		[focusRow],
	);

	const setOpen = useCallback(
		(id: string, open: boolean) => {
			setOpenSet((prev) => {
				const next = new Set(prev);
				if (open) next.add(id);
				else next.delete(id);
				return next;
			});
			onToggleNode?.(id, open);
		},
		[onToggleNode],
	);

	const toggle = useCallback(
		(id: string) => {
			setOpen(id, !openSet.has(id));
		},
		[openSet, setOpen],
	);

	// The first visible row is the tab stop until the user selects one, so the
	// list is reachable with a single Tab and then driven by the arrow keys.
	const tabStopId = activeId ?? visible[0]?.id;

	const resolvedSelectedIds = selectedIds ?? [];

	const ctx: SharedRowContext = {
		direction,
		openSet,
		tabStopId,
		toggle,
		focus: setActiveId,
		registerRef,
		selectionMode,
		selectedIds: resolvedSelectedIds,
		onSelectNode,
		onActivateNode,
	};

	const typeSelect = useCallback(
		(ch: string, fromIndex: number) => {
			if (typeTimer.current) clearTimeout(typeTimer.current);
			typeBuffer.current += ch.toLowerCase();
			typeTimer.current = setTimeout(() => {
				typeBuffer.current = "";
			}, 700);
			const buf = typeBuffer.current;
			const start = fromIndex < 0 ? 0 : fromIndex;
			// Search forward from the row after the current one, wrapping around.
			const order = [
				...visible.slice(start + 1),
				...visible.slice(0, start + 1),
			];
			const match = order.find((r) =>
				r.node.label.toLowerCase().startsWith(buf),
			);
			if (match) selectRow(match.id);
		},
		[visible, selectRow],
	);

	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent<HTMLUListElement>) => {
			if (visible.length === 0) return;
			const curIndex = activeId
				? visible.findIndex((r) => r.id === activeId)
				: -1;
			const current = curIndex >= 0 ? visible[curIndex] : undefined;

			switch (e.key) {
				case "ArrowDown": {
					e.preventDefault();
					const ni = Math.min(curIndex + 1, visible.length - 1);
					selectRow(visible[ni < 0 ? 0 : ni].id);
					return;
				}
				case "ArrowUp": {
					e.preventDefault();
					const ni = curIndex < 0 ? 0 : Math.max(curIndex - 1, 0);
					selectRow(visible[ni].id);
					return;
				}
				case "Home": {
					e.preventDefault();
					selectRow(visible[0].id);
					return;
				}
				case "End": {
					e.preventDefault();
					selectRow(visible[visible.length - 1].id);
					return;
				}
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
							onSelectNode?.(current.id, current.node, e);
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
						onSelectNode?.(current.id, current.node, e);
					}
					return;
				}
				default: {
					if (isPrintableChar(e) && e.key !== " ") {
						typeSelect(e.key, curIndex);
					}
				}
			}
		},
		[
			visible,
			activeId,
			selectRow,
			setOpen,
			toggle,
			typeSelect,
			selectionMode,
			onSelectNode,
		],
	);

	return (
		<ul className={classNames("classicyTree")} onKeyDown={handleKeyDown}>
			{nodes.map((node) => (
				<ClassicyTreeNodeItem key={node.id} node={node} depth={0} ctx={ctx} />
			))}
		</ul>
	);
};
