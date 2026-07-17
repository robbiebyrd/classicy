import appleFolder from "@img/icons/system/folders/folder-apple.png";
import fontsFolder from "@img/icons/system/folders/folder-fonts.png";
import systemFolder from "@img/icons/system/folders/folder-system.png";
import type { Meta, StoryObj } from "@storybook/react-vite";
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
						button: {
							label: "Open",
							onClickFunc: () => alert("Open Charcoal"),
						},
					},
					{
						id: "geneva",
						label: "Geneva",
						button: {
							label: "Open",
							onClickFunc: () => alert("Open Geneva"),
						},
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
						button: {
							label: "Get Info",
							onClickFunc: () => alert("Get Info: Calculator"),
						},
					},
				],
			},
		],
	},
	{
		id: "readme",
		label: "Read Me",
		button: {
			label: "Open",
			isDefault: true,
			onClickFunc: () => alert("Open Read Me"),
		},
	},
];

export const Default: Story = {
	args: {
		nodes,
	},
};

export const StartCollapsed: Story = {
	args: {
		nodes: nodes.map((n) => ({ ...n, defaultOpen: false })),
	},
};

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
