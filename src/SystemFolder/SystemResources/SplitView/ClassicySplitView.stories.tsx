import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassicySplitView } from "./ClassicySplitView";

const meta = {
	title: "Controls/SplitView",
	component: ClassicySplitView,
} satisfies Meta<typeof ClassicySplitView>;

export default meta;
type Story = StoryObj<typeof meta>;

const paneStyle = {
	padding: 8,
	fontFamily: "var(--body-font), sans-serif",
} as const;

export const TwoPanesHorizontal: Story = {
	args: {
		direction: "horizontal",
		children: [
			<div key="leading" style={paneStyle}>
				Leading pane. Drag the frame-edge divider to trade space with the other
				pane.
			</div>,
			<div key="trailing" style={paneStyle}>
				Trailing pane.
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 480, height: 240 }}>
				<Story />
			</div>
		),
	],
};

export const TwoPanesVertical: Story = {
	args: {
		direction: "vertical",
		children: [
			<div key="top" style={paneStyle}>
				Top pane.
			</div>,
			<div key="bottom" style={paneStyle}>
				Bottom pane.
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 480, height: 320 }}>
				<Story />
			</div>
		),
	],
};

export const ThreePanesWithDefaultSizes: Story = {
	args: {
		direction: "horizontal",
		defaultSizes: [25, 50, 25],
		children: [
			<div key="one" style={paneStyle}>
				25%
			</div>,
			<div key="two" style={paneStyle}>
				50%
			</div>,
			<div key="three" style={paneStyle}>
				25%
			</div>,
		],
	},
	decorators: [
		(Story) => (
			<div style={{ width: 640, height: 240 }}>
				<Story />
			</div>
		),
	],
};

// Combining directions is done by nesting, never by a grid mode.
export const NestedSplits: Story = {
	render: () => (
		<div style={{ width: 640, height: 360 }}>
			<ClassicySplitView direction="horizontal" defaultSizes={[35, 65]}>
				<div style={paneStyle}>Sidebar</div>
				<ClassicySplitView direction="vertical" defaultSizes={[70, 30]}>
					<div style={paneStyle}>Main content</div>
					<div style={paneStyle}>Console</div>
				</ClassicySplitView>
			</ClassicySplitView>
		</div>
	),
};

// The persistence round trip: onResizeCommit fires once per gesture with the
// final sizes (save these to app state); pass them back as defaultSizes on the
// next mount to restore the user's split.
export const CommitOnRelease: Story = {
	render: () => (
		<div style={{ width: 480, height: 240 }}>
			<ClassicySplitView
				defaultSizes={[40, 60]}
				onResizeCommit={(sizes) =>
					console.log("save these sizes to app state:", sizes)
				}
			>
				<div style={paneStyle}>Drag the divider, then release.</div>
				<div style={paneStyle}>
					The committed sizes are logged to the console once per gesture.
				</div>
			</ClassicySplitView>
		</div>
	),
};
