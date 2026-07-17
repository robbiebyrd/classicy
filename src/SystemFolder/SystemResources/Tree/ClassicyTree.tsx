import "./ClassicyTree.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
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

type ClassicyTreeNodeItemProps = {
	node: ClassicyTreeNode;
	depth: number;
	direction: ClassicyTriangleDirection;
	onToggleNode?: (id: string, open: boolean) => void;
};

const ClassicyTreeNodeItem: FunctionalComponent<ClassicyTreeNodeItemProps> = ({
	node,
	depth,
	direction,
	onToggleNode,
}) => {
	const hasChildren = Array.isArray(node.children) && node.children.length > 0;
	const [open, setOpen] = useState(node.defaultOpen ?? false);

	function toggle() {
		if (!hasChildren) {
			return;
		}
		const next = !open;
		setOpen(next);
		onToggleNode?.(node.id, next);
	}

	function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggle();
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
						tabIndex={0}
						className={"classicyTreeNodeLabelHolder classicyTreeNodeBranch"}
						onClick={toggle}
						onKeyDown={handleKeyDown}
					>
						{rowInner}
					</div>
				) : (
					<div className={"classicyTreeNodeLabelHolder classicyTreeNodeLeaf"}>
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
							direction={direction}
							onToggleNode={onToggleNode}
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
				/>
			))}
		</ul>
	);
};
