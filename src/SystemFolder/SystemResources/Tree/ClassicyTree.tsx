import "./ClassicyTree.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
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
	/** Leaf-only: a small ClassicyButton rendered to the right of the label. */
	button?: ClassicyTreeNodeButton;
};

type ClassicyTreeProps = {
	nodes: ClassicyTreeNode[];
	/** Direction the disclosure triangle points when collapsed. */
	direction?: ClassicyTriangleDirection;
	/** Fired whenever a branch node is expanded or collapsed. */
	onToggleNode?: (id: string, open: boolean) => void;
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

type SharedRowContext = {
	direction: ClassicyTriangleDirection;
	openSet: Set<string>;
	tabStopId?: string;
	toggle: (id: string) => void;
	select: (id: string) => void;
	registerRef: (id: string, el: HTMLDivElement | null) => void;
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
	const onFocus = () => ctx.select(node.id);

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
						tabIndex={isTabStop ? 0 : -1}
						ref={registerRef}
						className={"classicyTreeNodeLabelHolder classicyTreeNodeBranch"}
						onClick={() => ctx.toggle(node.id)}
						onFocus={onFocus}
					>
						{rowInner}
					</div>
				) : (
					// biome-ignore lint/a11y/noStaticElementInteractions: list-box leaf row is a focus target for arrow-key navigation and type-selection
					<div
						tabIndex={isTabStop ? 0 : -1}
						ref={registerRef}
						className={"classicyTreeNodeLabelHolder classicyTreeNodeLeaf"}
						onFocus={onFocus}
					>
						{rowInner}
					</div>
				)}
				{!hasChildren && node.button && (
					<ClassicyButton
						buttonSize={"small"}
						margin={"sm"}
						isDefault={node.button.isDefault}
						disabled={node.button.disabled}
						depressed={node.button.depressed}
						onClickFunc={(e: MouseEvent<HTMLButtonElement>) => {
							e.stopPropagation();
							node.button?.onClickFunc?.(e);
						}}
					>
						{node.button.label}
					</ClassicyButton>
				)}
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

const isPrintableChar = (e: KeyboardEvent): boolean =>
	e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

export const ClassicyTree: FunctionalComponent<ClassicyTreeProps> = ({
	nodes,
	direction = "right",
	onToggleNode,
}) => {
	const [openSet, setOpenSet] = useState<Set<string>>(() =>
		collectDefaultOpen(nodes),
	);
	const [selectedId, setSelectedId] = useState<string | undefined>();

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
			setSelectedId(id);
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
	const tabStopId = selectedId ?? visible[0]?.id;

	const ctx: SharedRowContext = {
		direction,
		openSet,
		tabStopId,
		toggle,
		select: setSelectedId,
		registerRef,
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
		(e: KeyboardEvent<HTMLUListElement>) => {
			if (visible.length === 0) return;
			const curIndex = selectedId
				? visible.findIndex((r) => r.id === selectedId)
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
						!current.open
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
						current.open
					) {
						e.preventDefault();
						setOpen(current.id, false);
					}
					return;
				}
				case "Enter":
				case " ": {
					if (current?.hasChildren) {
						e.preventDefault();
						toggle(current.id);
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
		[visible, selectedId, selectRow, setOpen, toggle, typeSelect],
	);

	return (
		<ul className={classNames("classicyTree")} onKeyDown={handleKeyDown}>
			{nodes.map((node) => (
				<ClassicyTreeNodeItem key={node.id} node={node} depth={0} ctx={ctx} />
			))}
		</ul>
	);
};
