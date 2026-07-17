import "./ClassicyTree.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type MouseEventHandler,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
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

type ClassicyTreeNodeItemProps = {
	node: ClassicyTreeNode;
	depth: number;
	direction: ClassicyTriangleDirection;
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

const ClassicyTreeNodeItem: FunctionalComponent<ClassicyTreeNodeItemProps> = ({
	node,
	depth,
	direction,
	onToggleNode,
	selectionMode = "none",
	selectedIds = [],
	onSelectNode,
	onActivateNode,
}) => {
	const hasChildren = Array.isArray(node.children) && node.children.length > 0;
	const [open, setOpen] = useState(node.defaultOpen ?? false);

	const canSelect =
		!hasChildren &&
		selectionMode !== "none" &&
		node.selectable !== false &&
		!node.disabled;
	const isSelected = !hasChildren && selectedIds.includes(node.id);
	const leafButtons = node.buttons ?? (node.button ? [node.button] : []);

	function toggle() {
		if (!hasChildren || node.disabled) return; // disabled branches refuse to toggle
		const next = !open;
		setOpen(next);
		onToggleNode?.(node.id, next);
	}

	function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggle();
		}
	}

	function handleLeafKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSelectNode?.(node.id, node, e);
		}
	}

	const rowInner = (
		<>
			<span className={"classicyTreeNodeDisclosure"}>
				{hasChildren && (
					<ClassicyTriangle
						direction={direction}
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
					<div
						role="button"
						aria-expanded={open}
						tabIndex={node.disabled ? -1 : 0}
						className={classNames(
							"classicyTreeNodeLabelHolder classicyTreeNodeBranch",
							{
								classicyTreeNodeDisabled: node.disabled,
							},
						)}
						onClick={toggle}
						onKeyDown={handleKeyDown}
					>
						{rowInner}
					</div>
				) : canSelect ? (
					// biome-ignore lint/a11y/useSemanticElements: selectable row is a flex container with svg/img/span children incompatible with <button>
					<div
						role="button"
						tabIndex={0}
						aria-pressed={isSelected}
						className={classNames(
							"classicyTreeNodeLabelHolder",
							"classicyTreeNodeLeaf",
							"classicyTreeNodeSelectable",
							{
								classicyTreeNodeSelected: isSelected,
							},
						)}
						onClick={(e) => onSelectNode?.(node.id, node, e)}
						onDoubleClick={() => onActivateNode?.(node.id, node)}
						onKeyDown={handleLeafKeyDown}
					>
						{rowInner}
					</div>
				) : (
					<div
						className={classNames(
							"classicyTreeNodeLabelHolder",
							"classicyTreeNodeLeaf",
							{
								classicyTreeNodeDisabled: node.disabled,
								classicyTreeNodeSelected: isSelected,
							},
						)}
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
							direction={direction}
							onToggleNode={onToggleNode}
							selectionMode={selectionMode}
							selectedIds={selectedIds}
							onSelectNode={onSelectNode}
							onActivateNode={onActivateNode}
						/>
					))}
				</ul>
			)}
		</li>
	);
};

export const ClassicyTree: FunctionalComponent<ClassicyTreeProps> = ({
	nodes,
	direction = "right",
	onToggleNode,
	selectionMode = "none",
	selectedIds,
	onSelectNode,
	onActivateNode,
}) => {
	return (
		<ul className={classNames("classicyTree")}>
			{nodes.map((node) => (
				<ClassicyTreeNodeItem
					key={node.id}
					node={node}
					depth={0}
					direction={direction}
					onToggleNode={onToggleNode}
					selectionMode={selectionMode}
					selectedIds={selectedIds}
					onSelectNode={onSelectNode}
					onActivateNode={onActivateNode}
				/>
			))}
		</ul>
	);
};
