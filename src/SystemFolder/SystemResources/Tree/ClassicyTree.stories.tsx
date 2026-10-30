import appleFolder from "@img/icons/system/folders/folder-apple.png";
import fontsFolder from "@img/icons/system/folders/folder-fonts.png";
import systemFolder from "@img/icons/system/folders/folder-system.png";
import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ClassicyTree, type ClassicyTreeNode } from "./ClassicyTree";

const meta = {
	title: "Controls/Tree",
	component: ClassicyTree,
} satisfies Meta<typeof ClassicyTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const nodes: ClassicyTreeNode[] = [
	{
		id: "system",
		label: "System Folder",
		leftIcon: systemFolder,
		defaultOpen: true,
		children: [
			{
				id: "fonts",
				label: "Fonts",
				leftIcon: fontsFolder,
				children: [
					{
						id: "charcoal",
						label: "Charcoal",
						buttons: [
							{
								label: "Open",
								onClickFunc: () => alert("Open Charcoal"),
							},
						],
					},
					{
						id: "geneva",
						label: "Geneva",
						buttons: [
							{
								label: "Open",
								onClickFunc: () => alert("Open Geneva"),
							},
						],
					},
				],
			},
			{
				id: "apple-menu",
				label: "Apple Menu Items",
				leftIcon: appleFolder,
				rightIcon: appleFolder,
				children: [
					{
						id: "calculator",
						label: "Calculator",
						rightIcon: appleFolder,
						buttons: [
							{
								label: "Get Info",
								onClickFunc: () => alert("Get Info: Calculator"),
							},
						],
					},
				],
			},
		],
	},
	{
		id: "readme",
		label: "Read Me",
		buttons: [
			{
				label: "Open",
				isDefault: true,
				onClickFunc: () => alert("Open Read Me"),
			},
		],
	},
];

/**
 * A navigation tree (`selectionMode` `"none"`): click a branch or its
 * triangle to expand it, focus a row and use Up/Down, Home/End, ⌘→ / ⌘← or
 * type a label's first letters. Shows left and right icons and per-leaf
 * push buttons; System Folder starts open via `defaultOpen`.
 */
export const Default: Story = {
	args: {
		nodes,
	},
};

/** The same tree with every branch collapsed on mount. */
export const StartCollapsed: Story = {
	args: {
		nodes: nodes.map((n) => ({ ...n, defaultOpen: false })),
	},
};

/**
 * A selectable tree with a fixed `selectedIds`: "Kept file" is highlighted,
 * "Grayed file" is `disabled` (dimmed and inert), and "Plain file" carries
 * two leaf buttons. Because selection is fully controlled, clicks here
 * change nothing — see `InteractiveSelection` for the wiring.
 */
export const SelectableWithDisabled: Story = {
	args: {
		selectionMode: "multi",
		selectedIds: ["kept"],
		nodes: [
			{
				id: "root",
				label: "Documents",
				defaultOpen: true,
				children: [
					{ id: "kept", label: "Kept file" },
					{ id: "grayed", label: "Grayed file", disabled: true },
					{
						id: "plain",
						label: "Plain file",
						buttons: [{ label: "Edit" }, { label: "Remove" }],
					},
				],
			},
		],
	},
};

const InteractiveTree = () => {
	const [selected, setSelected] = useState<string[]>([]);
	const [opened, setOpened] = useState<string>();
	return (
		<div>
			<ClassicyTree
				selectionMode="single"
				selectedIds={selected}
				onSelectNode={(id) => setSelected([id])}
				onActivateNode={(_id, node) => setOpened(node.label)}
				nodes={[
					{
						id: "projects",
						label: "Projects",
						defaultOpen: true,
						branchSelectable: true,
						children: [
							{ id: "budget", label: "Budget" },
							{ id: "schedule", label: "Schedule" },
							{ id: "archive", label: "Archive", selectable: false },
						],
					},
				]}
			/>
			<p>
				Selected: {selected.join(", ") || "none"}
				{opened ? ` — opened “${opened}”` : ""}
			</p>
		</div>
	);
};

/**
 * Controlled selection wired up: `onSelectNode` feeds `selectedIds`, and a
 * double-click on a leaf fires `onActivateNode`. "Projects" is
 * `branchSelectable`, so a single click selects it and a double-click
 * toggles it; "Archive" opts out with `selectable: false`.
 */
export const InteractiveSelection: Story = {
	render: () => <InteractiveTree />,
};

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Default.args,
	render: (args: ComponentProps<typeof ClassicyTree>) => (
		<ClassicyAppearanceProbe>
			<ClassicyTree {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};
