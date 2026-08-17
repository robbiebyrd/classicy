import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyTabs } from "./ClassicyTabs";

const meta = {
	title: "Controls/Tabs",
	component: ClassicyTabs,
} satisfies Meta<typeof ClassicyTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		tabs: [
			{
				title: "General",
				children: <ClassicyInput id="tab-name" labelTitle="Name" />,
			},
			{
				title: "Sharing",
				children: (
					<ClassicyCheckbox
						id="tab-share"
						checked={true}
						label="File Sharing"
					/>
				),
			},
			{
				title: "Memory",
				children: <p>Virtual memory is on.</p>,
			},
		],
	},
};

// Simple monochrome placeholder icons (data URIs) so the story stays
// self-contained. Real usage would pass theme/system icon paths.
const folderIcon =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cpath d='M1 4h5l2 2h7v7H1z' fill='%23d8b048' stroke='%23000'/%3E%3C/svg%3E";
const gearIcon =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='4' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E";

const sizeTabs = [
	{ title: "General", children: <p>General settings.</p> },
	{ title: "Sharing", children: <p>Sharing settings.</p> },
	{ title: "Memory", children: <p>Memory settings.</p> },
];

export const Small: Story = {
	args: { size: "small", tabs: sizeTabs },
};

export const Large: Story = {
	args: { size: "large", tabs: sizeTabs },
};

// Narrow enough that the strip cannot fit every tab, so the scroll arrows
// appear at both ends. Arrows show at any size, not only `small`.
export const Overflowing: Story = {
	args: {
		size: "small",
		tabs: [
			"Design",
			"Prototype",
			"Inspect",
			"Layout",
			"Typography",
			"Effects",
			"Export",
		].map((title) => ({ title, children: <p>{title} panel.</p> })),
	},
	decorators: [
		(Story) => (
			<div style={{ width: 320 }}>
				<Story />
			</div>
		),
	],
};

export const WithIcons: Story = {
	args: {
		tabs: [
			{
				title: "Files",
				icon: folderIcon,
				children: <p>A tab with an icon next to its label.</p>,
			},
			{
				title: "Options",
				icon: gearIcon,
				children: <ClassicyCheckbox id="tab-opt" label="Enable feature" />,
			},
			{
				// Icon-only tab (no title).
				icon: folderIcon,
				children: <p>An icon-only tab.</p>,
			},
		],
	},
};
