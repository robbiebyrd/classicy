import {
	appearanceHooksParameters,
	ClassicyAppearanceProbe,
} from "@sb/ClassicyAppearanceProbe";
import { mirroredParameters, StoryWindow } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyTabs } from "./ClassicyTabs";

const meta = {
	title: "Controls/Tabs",
	component: ClassicyTabs,
} satisfies Meta<typeof ClassicyTabs>;

export default meta;
type Story = StoryObj<typeof meta>;
// For the stories that draw the component themselves in `render` and ignore
// the args: typed against the component (every arg optional), not
// `typeof meta`, which would demand its required props as story args.
type RenderStory = StoryObj<typeof ClassicyTabs>;

/**
 * A standard (`medium`) tab control with three panes holding ordinary
 * controls. Click a tab, or focus the strip and use the arrow keys, Home and
 * End; text typed on the General tab survives switching away and back.
 */
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

/**
 * The compact `small` strip, for windows with more tabs than room. Its label
 * is the standard size scaled by the HIG's 10:12 ratio.
 */
export const Small: Story = {
	args: { size: "small", tabs: sizeTabs },
};

/** The `large` size, a Classicy extension that scales the type up by half. */
export const Large: Story = {
	args: { size: "large", tabs: sizeTabs },
};

/**
 * All three sizes stacked so the HIG tab type scale is easy to compare: the
 * standard (`medium`) label is the system UI font, the compact (`small`) label
 * is that size scaled by the HIG's 10:12 ratio, and `large` is the Classicy
 * extension above it.
 */
export const SizeComparison: RenderStory = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<ClassicyTabs size="small" tabs={sizeTabs} />
			<ClassicyTabs size="medium" tabs={sizeTabs} />
			<ClassicyTabs size="large" tabs={sizeTabs} />
		</div>
	),
};

/**
 * Narrow enough that the strip cannot fit every tab, so scroll arrows appear
 * at both ends; each click advances by a whole tab. Arrows show at any size,
 * not only `small`, and keyboard traversal scrolls the selected tab into view.
 */
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

/**
 * Tabs can carry an icon beside the title, or an icon alone (the third tab).
 * Icons are decorative, so an icon-only tab has no accessible name of its own.
 */
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

/**
 * The Appearance Package hook surface, under the Storybook probe package:
 * every root `decorate()` reaches is outlined (green while pressed), and every
 * event the component emits is logged in the Actions panel.
 */
export const AppearanceHooks: Story = {
	args: Default.args,
	render: (args: ComponentProps<typeof ClassicyTabs>) => (
		<ClassicyAppearanceProbe>
			<ClassicyTabs {...args} />
		</ClassicyAppearanceProbe>
	),
	parameters: appearanceHooksParameters(),
};

/**
 * `Default`, in a window, under the Storybook-only `mirrored` Appearance
 * Package: the tab strip under its panel by CSS `order` alone, with each
 * tab's outline turned over so its wide edge meets the panel (the label is
 * turned back upright).
 * Without a package, `stripPosition="bottom"` moves the strip the same way.
 */
export const Mirrored: Story = {
	...Default,
	parameters: mirroredParameters,
	render: (args) => (
		<StoryWindow title="Tabs" size={[420, 220]}>
			<ClassicyTabs {...args} />
		</StoryWindow>
	),
};
